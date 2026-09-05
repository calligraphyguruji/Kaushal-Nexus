from datetime import datetime, timedelta, timezone
import math
import random
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import logger
from src.schemas.career_outcome_dto import MLDatasetRowDTO
from src.services.outcome_label_service import outcome_label_service


class PlacementDatasetGenerator:
    """
    Supplies supervised training datasets for Phase 5 XGBoost models.
    Supports:
    1. Direct loading of historical snapshots & empirical outcomes from database.
    2. Synthetic historical cohort generation to ensure statistically robust training,
       evaluation, calibration, and temporal cross-validation.
    """

    FEATURE_NAMES = [
        "bkt_accuracy_rate",
        "bkt_developing_skill_count",
        "bkt_dsa_mastery",
        "bkt_git_mastery",
        "bkt_mastered_skill_count",
        "bkt_max_mastery",
        "bkt_mean_mastery",
        "bkt_min_mastery",
        "bkt_python_basics_mastery",
        "bkt_python_oop_mastery",
        "bkt_rest_api_mastery",
        "bkt_skills_assessed_count",
        "bkt_sql_mastery",
        "bkt_total_questions_attempted",
        "bkt_weak_skill_count",
        "difficulty_backoff_count",
        "gap_reduction_count",
        "learning_activities_count",
        "learning_hours_completed",
        "mastery_delta_30d",
        "mastery_delta_7d",
        "practice_attempt_count",
        "prerequisite_remediation_count",
        "resources_completed_count",
        "resources_started_count",
        "roadmap_completed_modules",
        "roadmap_estimated_hours_remaining",
        "roadmap_total_modules",
        "spaced_repetition_count",
        "project_count",
        "verified_project_count",
        "application_count",
        "interview_count",
        "has_active_resume",
        "resume_skill_count",
        "resume_project_count",
        "experience_years",
        "has_github",
        "has_linkedin",
        "role_match_score",
        "critical_gap_count",
    ]

    @classmethod
    async def load_from_db(
        cls,
        db: AsyncSession,
        feature_version: str = "v1",
        label_type: str = "INTERNSHIP_ACCEPTED",
        horizon_days: int = 90,
    ) -> pd.DataFrame:
        """Loads records from database snapshots via OutcomeLabelService."""
        dto = await outcome_label_service.build_ml_dataset(
            db=db,
            feature_version=feature_version,
            label_type=label_type,
            horizon_days=horizon_days,
        )

        rows = []
        for r in dto.records:
            row_dict = dict(r.features)
            row_dict["learner_id"] = r.learner_id
            row_dict["snapshot_id"] = str(r.snapshot_id)
            row_dict["prediction_cutoff"] = r.prediction_cutoff
            row_dict["target_placed"] = int(r.label)
            rows.append(row_dict)

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(rows)
        # Ensure all canonical features exist
        for col in cls.FEATURE_NAMES:
            if col not in df.columns:
                df[col] = 0.0
        return df

    @classmethod
    def generate_synthetic_historical_cohort(
        cls,
        n_samples: int = 1000,
        start_date: datetime = datetime(2024, 6, 1, tzinfo=timezone.utc),
        end_date: datetime = datetime(2025, 12, 31, tzinfo=timezone.utc),
        random_seed: int = 42,
    ) -> pd.DataFrame:
        """
        Generates a realistic historical dataset reflecting Indian vocational skilling cohorts.
        Employs realistic correlations:
        P(Placement) = sigmoid(
            2.5 * bkt_mean_mastery +
            1.8 * verified_project_count +
            1.2 * practice_efficacy +
            1.5 * role_match_score +
            0.8 * interview_velocity - 2.8
        )
        """
        rng = np.random.RandomState(random_seed)
        py_rng = random.Random(random_seed)

        total_days = (end_date - start_date).days
        records: List[Dict[str, Any]] = []

        for i in range(n_samples):
            # 1. Temporal cutoff sampled uniformly across historical span
            offset_days = py_rng.randint(0, total_days)
            cutoff = start_date + timedelta(days=offset_days)

            # 2. Competency & BKT Masteries
            latent_ability = rng.beta(2.5, 2.5)  # 0 to 1 bell-curve
            mean_mastery = np.clip(latent_ability + rng.normal(0, 0.08), 0.15, 0.98)
            min_mastery = np.clip(mean_mastery - rng.uniform(0.1, 0.35), 0.10, 0.90)
            max_mastery = np.clip(mean_mastery + rng.uniform(0.05, 0.25), min_mastery, 0.99)

            python_basics = np.clip(mean_mastery + rng.normal(0.05, 0.1), 0.1, 1.0)
            python_oop = np.clip(mean_mastery + rng.normal(-0.05, 0.12), 0.1, 1.0)
            sql = np.clip(mean_mastery + rng.normal(0.02, 0.1), 0.1, 1.0)
            git = np.clip(mean_mastery + rng.normal(0.08, 0.1), 0.1, 1.0)
            dsa = np.clip(mean_mastery + rng.normal(-0.12, 0.15), 0.1, 1.0)
            rest_api = np.clip(mean_mastery + rng.normal(0.0, 0.12), 0.1, 1.0)

            skills_assessed = py_rng.randint(4, 12)
            mastered_count = int(np.clip(skills_assessed * (mean_mastery ** 1.3), 0, skills_assessed))
            developing_count = int(np.clip((skills_assessed - mastered_count) * 0.6, 0, skills_assessed - mastered_count))
            weak_count = max(0, skills_assessed - mastered_count - developing_count)

            questions_attempted = int(skills_assessed * py_rng.randint(5, 20))
            accuracy = np.clip(mean_mastery * 0.9 + rng.normal(0.05, 0.05), 0.2, 0.98)

            delta_7d = np.clip(rng.normal(0.03, 0.04), -0.05, 0.25)
            delta_30d = np.clip(rng.normal(0.10, 0.08), -0.10, 0.50)

            # 3. Learning Activities & Engagement
            learning_hours = float(np.clip(rng.gamma(shape=3.0, scale=12.0) * (0.5 + latent_ability), 4.0, 180.0))
            learning_activities = int(learning_hours * rng.uniform(1.2, 2.5))
            resources_started = int(learning_activities * 0.7)
            resources_completed = int(resources_started * np.clip(latent_ability + 0.2, 0.3, 0.95))

            # 4. Practice Drills & Remediation
            practice_attempts = int(np.clip(rng.poisson(lam=12) * (0.4 + latent_ability), 1, 45))
            gap_reduction = int(practice_attempts * np.clip(latent_ability * 0.8 + 0.1, 0.1, 0.9))
            difficulty_backoff = int(practice_attempts * np.clip((1.0 - latent_ability) * 0.4, 0.0, 0.5))
            prerequisite_remediation = int(practice_attempts * np.clip((1.0 - latent_ability) * 0.3, 0.0, 0.4))
            spaced_repetition = int(practice_attempts * 0.25)

            # 5. Roadmap
            roadmap_total = py_rng.choice([6, 8, 10, 12])
            roadmap_completed = int(roadmap_total * np.clip(latent_ability * 0.9 + 0.1, 0.0, 1.0))
            hours_remaining = float(max(0.0, (roadmap_total - roadmap_completed) * 12.0 - rng.uniform(0, 10)))

            # 6. Projects & Portfolio
            project_count = int(np.clip(rng.poisson(lam=2.5) * (0.3 + latent_ability * 1.2), 0, 8))
            verified_projects = int(project_count * np.clip(latent_ability * 0.75, 0.0, 1.0))

            # 7. Applications & Interviews
            application_count = int(np.clip(rng.poisson(lam=5) * (0.5 + latent_ability * 0.8), 0, 25))
            interview_conversion_prob = np.clip(latent_ability * 0.4 + (verified_projects * 0.08), 0.05, 0.7)
            interview_count = int(application_count * interview_conversion_prob)

            # 8. Resume & Profile
            has_resume = 1.0 if py_rng.random() < (0.6 + latent_ability * 0.38) else 0.0
            resume_skills = int(skills_assessed * rng.uniform(0.8, 1.5)) if has_resume else 0
            resume_projects = min(project_count, py_rng.randint(0, 4)) if has_resume else 0
            experience_years = float(np.clip(rng.exponential(scale=1.2), 0.0, 8.0))
            has_github = 1.0 if py_rng.random() < (0.3 + latent_ability * 0.6) else 0.0
            has_linkedin = 1.0 if py_rng.random() < (0.4 + latent_ability * 0.5) else 0.0

            # 9. Role Match
            role_match = float(np.clip(latent_ability * 85.0 + rng.normal(5.0, 8.0), 10.0, 98.0))
            critical_gaps = float(max(0, int(py_rng.randint(1, 6) - (latent_ability * 4))))

            # 10. Ground-Truth Target Label Determination (Forward Window Placement)
            # Log-odds of placement within 90 days:
            log_odds = (
                2.6 * (mean_mastery - 0.5) +
                0.45 * verified_projects +
                0.35 * min(interview_count, 4) +
                0.02 * (role_match - 50.0) +
                0.35 * has_github +
                0.25 * (gap_reduction / max(1, practice_attempts)) +
                0.15 * (learning_hours / 40.0) -
                0.40 * critical_gaps -
                0.75
            )
            prob_placement = 1.0 / (1.0 + math.exp(-np.clip(log_odds, -6.0, 6.0)))
            target_placed = 1 if py_rng.random() < prob_placement else 0

            row: Dict[str, Any] = {
                "learner_id": f"synthetic-learner-{i+1:04d}",
                "snapshot_id": f"snapshot-{i+1:04d}",
                "prediction_cutoff": cutoff,
                "target_placed": target_placed,
                # Features
                "bkt_accuracy_rate": round(float(accuracy), 4),
                "bkt_developing_skill_count": float(developing_count),
                "bkt_dsa_mastery": round(float(dsa), 4),
                "bkt_git_mastery": round(float(git), 4),
                "bkt_mastered_skill_count": float(mastered_count),
                "bkt_max_mastery": round(float(max_mastery), 4),
                "bkt_mean_mastery": round(float(mean_mastery), 4),
                "bkt_min_mastery": round(float(min_mastery), 4),
                "bkt_python_basics_mastery": round(float(python_basics), 4),
                "bkt_python_oop_mastery": round(float(python_oop), 4),
                "bkt_rest_api_mastery": round(float(rest_api), 4),
                "bkt_skills_assessed_count": float(skills_assessed),
                "bkt_sql_mastery": round(float(sql), 4),
                "bkt_total_questions_attempted": float(questions_attempted),
                "bkt_weak_skill_count": float(weak_count),
                "difficulty_backoff_count": float(difficulty_backoff),
                "gap_reduction_count": float(gap_reduction),
                "learning_activities_count": float(learning_activities),
                "learning_hours_completed": round(learning_hours, 2),
                "mastery_delta_30d": round(float(delta_30d), 4),
                "mastery_delta_7d": round(float(delta_7d), 4),
                "practice_attempt_count": float(practice_attempts),
                "prerequisite_remediation_count": float(prerequisite_remediation),
                "resources_completed_count": float(resources_completed),
                "resources_started_count": float(resources_started),
                "roadmap_completed_modules": float(roadmap_completed),
                "roadmap_estimated_hours_remaining": round(hours_remaining, 2),
                "roadmap_total_modules": float(roadmap_total),
                "spaced_repetition_count": float(spaced_repetition),
                "project_count": float(project_count),
                "verified_project_count": float(verified_projects),
                "application_count": float(application_count),
                "interview_count": float(interview_count),
                "has_active_resume": float(has_resume),
                "resume_skill_count": float(resume_skills),
                "resume_project_count": float(resume_projects),
                "experience_years": round(experience_years, 2),
                "has_github": float(has_github),
                "has_linkedin": float(has_linkedin),
                "role_match_score": round(role_match, 2),
                "critical_gap_count": float(critical_gaps),
            }
            records.append(row)

        df = pd.DataFrame(records)
        df.sort_values(by="prediction_cutoff", inplace=True)
        df.reset_index(drop=True, inplace=True)
        logger.info(
            f"Generated {len(df)} synthetic historical records. "
            f"Positives: {df['target_placed'].sum()} ({df['target_placed'].mean():.2%})"
        )
        return df

    @classmethod
    async def get_combined_dataset(
        cls,
        db: Optional[AsyncSession] = None,
        min_samples: int = 600,
        feature_version: str = "v1",
        label_type: str = "INTERNSHIP_ACCEPTED",
        horizon_days: int = 90,
    ) -> pd.DataFrame:
        """
        Combines real DB records with synthetic historical cohort to guarantee statistical power.
        """
        db_df = pd.DataFrame()
        if db is not None:
            try:
                db_df = await cls.load_from_db(
                    db=db,
                    feature_version=feature_version,
                    label_type=label_type,
                    horizon_days=horizon_days,
                )
            except Exception as e:
                logger.warning(f"Unable to load DB snapshots ({e}); relying on synthetic cohort.")

        if len(db_df) >= min_samples:
            df = db_df
        else:
            needed = min_samples - len(db_df)
            synth_df = cls.generate_synthetic_historical_cohort(n_samples=max(needed, 800))
            if not db_df.empty:
                df = pd.concat([db_df, synth_df], ignore_index=True)
            else:
                df = synth_df

        df["prediction_cutoff"] = pd.to_datetime(df["prediction_cutoff"], utc=True)
        df.sort_values(by="prediction_cutoff", inplace=True)
        df.reset_index(drop=True, inplace=True)
        return df


dataset_generator = PlacementDatasetGenerator()
