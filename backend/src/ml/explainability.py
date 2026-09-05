from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import xgboost as xgb

from src.core.logging import logger
from src.schemas.placement_ml_dto import (
    ActionableRecommendationDTO,
    FeatureImportanceItemDTO,
    LocalDriverDTO,
)


class ModelExplainabilityEngine:
    """
    Provides both Global Feature Importance and Local Per-Learner Explainability
    using XGBoost TreeSHAP contributions and domain remediation logic.
    """

    HUMAN_READABLE_NAMES: Dict[str, str] = {
        "bkt_mean_mastery": "Overall Bayesian Skill Mastery",
        "bkt_accuracy_rate": "Diagnostic Assessment Accuracy",
        "bkt_python_basics_mastery": "Python Fundamentals Mastery",
        "bkt_python_oop_mastery": "Object-Oriented Programming Mastery",
        "bkt_sql_mastery": "SQL & Relational Databases Mastery",
        "bkt_git_mastery": "Git & Version Control Mastery",
        "bkt_dsa_mastery": "Data Structures & Algorithms Mastery",
        "bkt_rest_api_mastery": "RESTful API Integration Mastery",
        "verified_project_count": "Verified Portfolio Projects",
        "project_count": "Total Practical Projects",
        "interview_count": "Interviews Attended",
        "application_count": "Applications Submitted",
        "role_match_score": "Aspiring Role Alignment Score",
        "critical_gap_count": "Critical Role Skill Gaps",
        "gap_reduction_count": "Adaptive Drill Gap Reductions",
        "practice_attempt_count": "Practice Drill Frequency",
        "learning_hours_completed": "Total Learning Hours Invested",
        "has_github": "Public GitHub Portfolio",
        "has_active_resume": "Parsed Active Resume",
        "experience_years": "Prior Work Experience",
        "bkt_spread": "Skill Mastery Variance",
        "profile_readiness_composite": "Composite Readiness Index",
        "practice_success_rate": "Drill Remediation Efficacy",
        "project_verification_rate": "Project Verification Ratio",
    }

    @classmethod
    def get_booster_from_model(cls, model: Any) -> Optional[xgb.Booster]:
        """Extracts native XGBoost Booster from bare or calibrated models."""
        if isinstance(model, xgb.Booster):
            return model
        if hasattr(model, "get_booster"):
            return model.get_booster()
        # If wrapped in CalibratedClassifierCV
        if hasattr(model, "estimator"):
            est = model.estimator
            if hasattr(est, "get_booster"):
                return est.get_booster()
        if hasattr(model, "calibrated_classifiers_"):
            for cc in model.calibrated_classifiers_:
                if hasattr(cc, "estimator") and hasattr(cc.estimator, "get_booster"):
                    return cc.estimator.get_booster()
                if hasattr(cc, "base_estimator") and hasattr(cc.base_estimator, "get_booster"):
                    return cc.base_estimator.get_booster()
        return None

    @classmethod
    def extract_global_feature_importance(
        cls, model: Any, feature_names: List[str], top_n: int = 20
    ) -> List[FeatureImportanceItemDTO]:
        """
        Extracts global feature importance based on Tree Gain.
        """
        booster = cls.get_booster_from_model(model)
        if not booster:
            return []

        score_dict = booster.get_score(importance_type="gain")
        total_score = sum(score_dict.values()) if score_dict else 1.0

        items: List[FeatureImportanceItemDTO] = []
        # Sort by gain descending
        sorted_pairs = sorted(score_dict.items(), key=lambda x: x[1], reverse=True)

        for rank, (feat_key, gain_val) in enumerate(sorted_pairs[:top_n], start=1):
            normalized_score = round(gain_val / total_score, 4)
            readable = cls.HUMAN_READABLE_NAMES.get(feat_key, feat_key)
            items.append(
                FeatureImportanceItemDTO(
                    feature_name=readable,
                    importance_score=normalized_score,
                    importance_type="gain",
                    rank=rank,
                )
            )

        return items

    @classmethod
    def explain_learner_prediction(
        cls,
        model: Any,
        features_df: pd.DataFrame,
        placement_prob: float,
        top_k: int = 4,
    ) -> Tuple[List[LocalDriverDTO], List[LocalDriverDTO], List[ActionableRecommendationDTO]]:
        """
        Calculates local feature attributions using XGBoost pred_contribs (TreeSHAP)
        and derives actionable next steps.
        """
        booster = cls.get_booster_from_model(model)
        positive_drivers: List[LocalDriverDTO] = []
        risk_factors: List[LocalDriverDTO] = []
        recommendations: List[ActionableRecommendationDTO] = []

        if not booster:
            return positive_drivers, risk_factors, recommendations

        try:
            dmat = xgb.DMatrix(features_df)
            contribs = booster.predict(dmat, pred_contribs=True)
            row_contribs = contribs[0]  # Shape: (num_features + 1,)
            # The last element is the baseline expected margin
            feature_contribs = row_contribs[:-1]
            feature_cols = list(features_df.columns)

            contrib_pairs = []
            for col, val, c_val in zip(feature_cols, features_df.iloc[0], feature_contribs):
                contrib_pairs.append((col, float(val), float(c_val)))

            # Sort descending for positive drivers
            positives = [p for p in contrib_pairs if p[2] > 0]
            positives.sort(key=lambda x: x[2], reverse=True)

            # Sort ascending for negative risk factors
            negatives = [p for p in contrib_pairs if p[2] < 0]
            negatives.sort(key=lambda x: x[2])

            for col, val, c_val in positives[:top_k]:
                name = cls.HUMAN_READABLE_NAMES.get(col, col.replace("_", " ").title())
                positive_drivers.append(
                    LocalDriverDTO(
                        feature_name=name,
                        feature_value=round(val, 2),
                        contribution_delta=round(c_val, 4),
                        contribution_pct=round(min(c_val * 15.0, 30.0), 1),
                        description=f"{name} is demonstrating strong performance ({val:.2f}) and boosting placement probability.",
                        is_positive=True,
                    )
                )

            for col, val, c_val in negatives[:top_k]:
                name = cls.HUMAN_READABLE_NAMES.get(col, col.replace("_", " ").title())
                risk_factors.append(
                    LocalDriverDTO(
                        feature_name=name,
                        feature_value=round(val, 2),
                        contribution_delta=round(c_val, 4),
                        contribution_pct=round(max(c_val * 15.0, -30.0), 1),
                        description=f"{name} ({val:.2f}) is currently below the competitive threshold, inhibiting employer conversion.",
                        is_positive=False,
                    )
                )

            # Generate domain recommendations based on negative contributors
            for col, val, c_val in negatives[:4]:
                rec = cls._generate_actionable_recommendation(col, val, c_val)
                if rec:
                    recommendations.append(rec)

        except Exception as e:
            logger.warning(f"Error computing local explainability TreeSHAP: {e}")

        # Fallback if no specific recommendations generated
        if not recommendations:
            recommendations.append(
                ActionableRecommendationDTO(
                    category="PRACTICE_DRILL",
                    title="Complete Daily Skill Practice Drills",
                    description="Consistent practice sessions improve Bayesian mastery and accelerate placement readiness.",
                    potential_probability_boost=0.08,
                    priority="HIGH",
                )
            )

        return positive_drivers, risk_factors, recommendations

    @classmethod
    def _generate_actionable_recommendation(
        cls, feature_name: str, current_value: float, contrib: float
    ) -> Optional[ActionableRecommendationDTO]:
        boost = round(min(abs(contrib) * 0.12 + 0.04, 0.18), 2)

        if "sql" in feature_name:
            return ActionableRecommendationDTO(
                category="PRACTICE_DRILL",
                title="Targeted SQL & Relational Database Drills",
                description=f"Current SQL mastery is {current_value:.2f}. Completing intermediate query drills will address a major placement inhibitor.",
                potential_probability_boost=boost,
                priority="HIGH",
            )
        elif "python" in feature_name or "dsa" in feature_name:
            return ActionableRecommendationDTO(
                category="PRACTICE_DRILL",
                title="Complete Algorithm & Core Python Exercises",
                description=f"Core programming mastery is at {current_value:.2f}. Raising this to 0.80+ directly enhances technical interview readiness.",
                potential_probability_boost=boost,
                priority="HIGH",
            )
        elif "project" in feature_name:
            return ActionableRecommendationDTO(
                category="PROJECT",
                title="Submit a Full-Stack Portfolio Project",
                description="Verified practical projects provide verifiable proof of competency and substantially improve employer shortlisting.",
                potential_probability_boost=boost,
                priority="HIGH",
            )
        elif "interview" in feature_name or "application" in feature_name:
            return ActionableRecommendationDTO(
                category="APPLICATION",
                title="Increase Application Velocity to Verified Roles",
                description="Applying to 3–5 matched employer mandates creates interview momentum and raises placement odds.",
                potential_probability_boost=boost,
                priority="MEDIUM",
            )
        elif "role_match" in feature_name or "critical_gap" in feature_name:
            return ActionableRecommendationDTO(
                category="ROLE_ALIGNMENT",
                title="Bridge Role Skill Deficits",
                description="Targeting prerequisite gaps identified in your Aspiring Role roadmap unlocks higher employer match scores.",
                potential_probability_boost=boost,
                priority="HIGH",
            )
        elif "github" in feature_name:
            return ActionableRecommendationDTO(
                category="RESUME",
                title="Link Active GitHub Profile with Clean Repositories",
                description="Public code repositories allow recruiters to evaluate code quality, boosting candidate credibility.",
                potential_probability_boost=boost,
                priority="MEDIUM",
            )
        return None


model_explainability_engine = ModelExplainabilityEngine()
