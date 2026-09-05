from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import math

from src.core.config import settings
from src.core.logging import logger


@dataclass(frozen=True)
class BKTParameters:
    """Configurable parameter set for Bayesian Knowledge Tracing."""
    p_l0: float  # Initial mastery probability
    p_trans: float  # Transition / learning probability
    p_guess: float  # Guess probability (correct when unknown)
    p_slip: float  # Slip probability (incorrect when known)

    def validate(self) -> None:
        """Validates probability constraints and identifiability."""
        for name, val in [
            ("p_l0", self.p_l0),
            ("p_trans", self.p_trans),
            ("p_guess", self.p_guess),
            ("p_slip", self.p_slip),
        ]:
            if not (0.0 <= val <= 1.0):
                raise ValueError(f"BKT parameter '{name}' must be between 0.0 and 1.0, got {val}")
        if self.p_guess + self.p_slip >= 1.0:
            logger.warning(
                f"BKT degeneracy warning: p_guess ({self.p_guess}) + p_slip ({self.p_slip}) >= 1.0. "
                "For monotonic mastery updates upon correct answers, (1 - p_slip) must exceed p_guess."
            )


class BayesianKnowledgeTracingEngine:
    """
    Standard Bayesian Knowledge Tracing (BKT) Model implementation.
    Estimates the latent probability P(L_t) that a learner has mastered a specific skill
    conditioned upon an observed sequence of correct or incorrect assessment opportunities.
    """

    # Pre-configured standard skilling role benchmark masteries
    BENCHMARK_ROLES: Dict[str, Dict[str, float]] = {
        "Python Developer Intern": {
            "Python Basics": 0.80,
            "Python OOP": 0.70,
            "SQL": 0.65,
            "Git": 0.60,
            "REST API": 0.60,
        },
        "Full Stack Web Developer": {
            "Python Basics": 0.75,
            "REST API": 0.80,
            "SQL": 0.70,
            "Git": 0.65,
            "DSA": 0.60,
        },
        "Data Analyst Intern": {
            "Python Basics": 0.75,
            "SQL": 0.85,
            "Git": 0.50,
            "DSA": 0.55,
        },
        "Software Engineer Trainee": {
            "Python Basics": 0.80,
            "Python OOP": 0.75,
            "DSA": 0.75,
            "Git": 0.60,
            "SQL": 0.60,
            "REST API": 0.60,
        },
    }

    def __init__(self, default_params: Optional[BKTParameters] = None) -> None:
        self.default_params = default_params or BKTParameters(
            p_l0=getattr(settings, "BKT_DEFAULT_P_L0", 0.30),
            p_trans=getattr(settings, "BKT_DEFAULT_P_TRANS", 0.10),
            p_guess=getattr(settings, "BKT_DEFAULT_P_GUESS", 0.20),
            p_slip=getattr(settings, "BKT_DEFAULT_P_SLIP", 0.10),
        )
        self.default_params.validate()

    def get_initial_mastery(self, custom_p_l0: Optional[float] = None) -> float:
        """Returns initialized prior mastery probability for a first-time skill encounter."""
        val = custom_p_l0 if custom_p_l0 is not None else self.default_params.p_l0
        return max(0.0, min(1.0, float(val)))

    def update_mastery(
        self,
        current_mastery: float,
        correct: bool,
        p_learn: Optional[float] = None,
        p_guess: Optional[float] = None,
        p_slip: Optional[float] = None,
    ) -> float:
        """
        Executes a single step Bayesian update given an observed assessment response:
        
        1. Posterior calculation:
           If correct:
             P(known | correct) = [L * (1 - S)] / [L * (1 - S) + (1 - L) * G]
           If incorrect:
             P(known | incorrect) = [L * S] / [L * S + (1 - L) * (1 - G)]

        2. Transition / Learning update:
           new_mastery = posterior_known + (1 - posterior_known) * T

        Always constrained strictly to [0.0, 1.0].
        """
        # Clamp inputs
        l_prev = max(0.0, min(1.0, float(current_mastery)))
        p_t = max(0.0, min(1.0, float(p_learn if p_learn is not None else self.default_params.p_trans)))
        p_g = max(0.0, min(1.0, float(p_guess if p_guess is not None else self.default_params.p_guess)))
        p_s = max(0.0, min(1.0, float(p_slip if p_slip is not None else self.default_params.p_slip)))

        eps = 1e-9

        if correct:
            # Numerator: P(correct | known) * P(known)
            num = l_prev * (1.0 - p_s)
            # Denominator: P(correct) = P(correct | known)*P(known) + P(correct | unknown)*P(unknown)
            denom = num + ((1.0 - l_prev) * p_g)
            denom = max(denom, eps)
            posterior_known = num / denom
        else:
            # Numerator: P(incorrect | known) * P(known)
            num = l_prev * p_s
            # Denominator: P(incorrect) = P(incorrect | known)*P(known) + P(incorrect | unknown)*P(unknown)
            denom = num + ((1.0 - l_prev) * (1.0 - p_g))
            denom = max(denom, eps)
            posterior_known = num / denom

        # Bound posterior
        posterior_known = max(0.0, min(1.0, posterior_known))

        # Apply learning opportunity transition
        new_mastery = posterior_known + ((1.0 - posterior_known) * p_t)

        # Ensure final mastery is strictly within [0.0, 1.0]
        return round(float(max(0.0, min(1.0, new_mastery))), 4)

    def classify_mastery(self, mastery_probability: float) -> str:
        """
        Converts numeric mastery probability into human-readable proficiency tier.
        < 0.40       -> 'weak'
        0.40 - 0.60  -> 'developing'
        0.60 - 0.80  -> 'proficient'
        0.80 - 1.00  -> 'mastered'
        """
        m = max(0.0, min(1.0, float(mastery_probability)))
        t_dev = getattr(settings, "BKT_THRESHOLD_DEVELOPING", 0.40)
        t_prof = getattr(settings, "BKT_THRESHOLD_PROFICIENT", 0.60)
        t_mast = getattr(settings, "BKT_THRESHOLD_MASTERED", 0.80)

        if m < t_dev:
            return "weak"
        if m < t_prof:
            return "developing"
        if m < t_mast:
            return "proficient"
        return "mastered"

    def calculate_skill_gaps(
        self,
        target_role_title: str,
        learner_masteries: Dict[str, float],
    ) -> Dict[str, Any]:
        """
        Evaluates learner masteries against target role required skills.
        Calculates gap = required_mastery - learner_mastery (positive values only).
        Returns list of gaps sorted descending by gap magnitude.
        """
        # Find matching benchmark requirements (or fallback to closest)
        reqs = self.BENCHMARK_ROLES.get(target_role_title)
        if not reqs:
            for role_name, benchmark in self.BENCHMARK_ROLES.items():
                if target_role_title.lower() in role_name.lower() or role_name.lower() in target_role_title.lower():
                    reqs = benchmark
                    target_role_title = role_name
                    break

        if not reqs:
            # Generic default software requirements
            reqs = self.BENCHMARK_ROLES["Python Developer Intern"]
            target_role_title = "Python Developer Intern"

        skill_gaps: List[Dict[str, Any]] = []
        total_req_mastery = 0.0
        total_achieved = 0.0

        for skill_name, required_m in reqs.items():
            total_req_mastery += required_m
            # Case-insensitive / partial match against learner masteries
            current_m = 0.0
            for l_skill, l_val in learner_masteries.items():
                if skill_name.lower() in l_skill.lower() or l_skill.lower() in skill_name.lower():
                    current_m = max(current_m, l_val)

            total_achieved += min(current_m, required_m)

            gap = round(max(0.0, required_m - current_m), 4)
            if gap > 0.0:
                priority = "high" if gap >= 0.25 else ("medium" if gap >= 0.12 else "low")
                skill_gaps.append({
                    "skill": skill_name,
                    "current_mastery": round(current_m, 4),
                    "required_mastery": round(required_m, 4),
                    "gap": gap,
                    "priority": priority,
                })

        # Sort gaps descending (biggest gap first)
        skill_gaps.sort(key=lambda x: x["gap"], reverse=True)

        overall_alignment = (
            round(total_achieved / total_req_mastery, 4) if total_req_mastery > 0 else 1.0
        )

        return {
            "role": target_role_title,
            "overall_alignment": overall_alignment,
            "skill_gaps": skill_gaps,
        }

    @staticmethod
    def extract_feature_vector(learner_masteries: Dict[str, float]) -> Dict[str, float]:
        """
        Extracts clean, normalized feature vector ready for future XGBoost / ML models.
        Example output:
          {
            "python_mastery": 0.82,
            "sql_mastery": 0.64,
            "git_mastery": 0.71,
            "dsa_mastery": 0.76,
            "api_mastery": 0.45
          }
        """
        features: Dict[str, float] = {}
        for skill_name, val in learner_masteries.items():
            clean_key = (
                skill_name.lower()
                .replace(" ", "_")
                .replace(".", "")
                .replace("-", "_")
                .replace("/", "_")
            )
            if not clean_key.endswith("_mastery"):
                clean_key = f"{clean_key}_mastery"
            features[clean_key] = round(float(max(0.0, min(1.0, val))), 4)
        return features


# Global singleton instance
bkt_engine = BayesianKnowledgeTracingEngine()
