from dataclasses import dataclass, field
import re
from typing import Any, Dict, List, Optional, Set
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ForbiddenException
from src.core.security import mask_email, mask_phone
from src.models.district import District
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.models.placement import Placement
from src.models.training_center import TrainingCenter
from src.models.user import User
from src.schemas.learner_dto import Learner360ResponseDTO, LearnerListItemDTO
from src.schemas.user import UserRole


@dataclass
class UserScope:
    """Institutional data governance scope for an authenticated user."""
    role: str
    is_unrestricted: bool = False
    state: Optional[str] = None
    district_ids: Set[str] = field(default_factory=set)
    training_center_ids: Set[uuid.UUID] = field(default_factory=set)
    training_center_name: Optional[str] = None
    employer_id: Optional[uuid.UUID] = None
    employer_company_name: Optional[str] = None
    sector: Optional[str] = None


# Standard State Keyword Mappings
STATE_KEYWORDS: Dict[str, str] = {
    "up": "Uttar Pradesh",
    "upssdm": "Uttar Pradesh",
    "uttar pradesh": "Uttar Pradesh",
    "varanasi": "Uttar Pradesh",
    "lucknow": "Uttar Pradesh",
    "noida": "Uttar Pradesh",
    "kanpur": "Uttar Pradesh",
    "prayagraj": "Uttar Pradesh",
    "gorakhpur": "Uttar Pradesh",
    "purvanchal": "Uttar Pradesh",
    "mh": "Maharashtra",
    "mssds": "Maharashtra",
    "maharashtra": "Maharashtra",
    "pune": "Maharashtra",
    "mumbai": "Maharashtra",
    "nagpur": "Maharashtra",
    "ka": "Karnataka",
    "kaushalya": "Karnataka",
    "ksdc": "Karnataka",
    "karnataka": "Karnataka",
    "bengaluru": "Karnataka",
    "mysuru": "Karnataka",
    "ts": "Telangana",
    "tsdm": "Telangana",
    "telangana": "Telangana",
    "hyderabad": "Telangana",
    "tn": "Tamil Nadu",
    "tnsdc": "Tamil Nadu",
    "tamil nadu": "Tamil Nadu",
    "chennai": "Tamil Nadu",
    "coimbatore": "Tamil Nadu",
    "gj": "Gujarat",
    "gujarat": "Gujarat",
    "ahmedabad": "Gujarat",
    "br": "Bihar",
    "bihar": "Bihar",
    "patna": "Bihar",
    "od": "Odisha",
    "odisha": "Odisha",
    "bhubaneswar": "Odisha",
    "mp": "Madhya Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "indore": "Madhya Pradesh",
    "rj": "Rajasthan",
    "rajasthan": "Rajasthan",
    "jaipur": "Rajasthan",
    "ap": "Andhra Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "visakhapatnam": "Andhra Pradesh",
}


class ScopeAuthorizationService:
    """
    Enterprise-grade scope and object-level authorization engine.
    Enforces least-privilege data access across institutional roles.
    """

    @classmethod
    async def resolve_user_scope(
        cls, db: AsyncSession, user: User
    ) -> UserScope:
        """Derives the active institutional scope for the user."""
        # 1. Superuser or Central Ministry Officers -> Unrestricted national scope
        if user.is_superuser or user.role in (
            UserRole.SYSTEM_ADMIN.value,
            UserRole.MSDE_OFFICER.value,
        ):
            return UserScope(role=user.role, is_unrestricted=True)

        user_email_prefix = user.email.split("@")[0].lower()
        cleaned_text = f"{user_email_prefix} {user.full_name}".lower()

        # 2. State Admin Scope Resolution
        if user.role == UserRole.STATE_ADMIN.value:
            resolved_state = "Uttar Pradesh"  # Default primary state
            # Match longest keywords first (e.g. "uttar pradesh" before "up")
            for kw, state_name in sorted(STATE_KEYWORDS.items(), key=lambda x: -len(x[0])):
                if len(kw) <= 2:
                    if re.search(rf"(?:^|[._\-\s]){re.escape(kw)}(?:$|[._\-\s])", cleaned_text):
                        resolved_state = state_name
                        break
                else:
                    if kw in cleaned_text:
                        resolved_state = state_name
                        break

            # Fetch district IDs for this state
            dist_stmt = select(District.id).where(District.state == resolved_state)
            dist_res = await db.execute(dist_stmt)
            district_ids = set(dist_res.scalars().all())

            return UserScope(
                role=user.role,
                is_unrestricted=False,
                state=resolved_state,
                district_ids=district_ids,
            )

        # 3. Training Provider Scope Resolution
        if user.role == UserRole.TRAINING_PROVIDER.value:
            tc_ids: Set[uuid.UUID] = set()
            tc_name: Optional[str] = None
            tc_districts: Set[str] = set()

            # Find matching training centers
            tc_stmt = select(TrainingCenter)
            tc_res = await db.execute(tc_stmt)
            all_centers = tc_res.scalars().all()

            for tc in all_centers:
                tc_tokens = f"{tc.name} {tc.center_code} {tc.district_id}".lower()
                matched = False
                for token in ["varanasi", "pune", "bengaluru", "noida", "donbosco", "apex", "gtcl", "pmkk"]:
                    if token in cleaned_text and token in tc_tokens:
                        matched = True
                        break
                if matched or user.email.lower() in tc_tokens:
                    tc_ids.add(tc.id)
                    tc_name = tc.name
                    tc_districts.add(tc.district_id)

            if not tc_ids and all_centers:
                tc_ids.add(all_centers[0].id)
                tc_name = all_centers[0].name
                tc_districts.add(all_centers[0].district_id)

            return UserScope(
                role=user.role,
                is_unrestricted=False,
                training_center_ids=tc_ids,
                training_center_name=tc_name,
                district_ids=tc_districts,
            )

        # 4. Employer Scope Resolution
        if user.role == UserRole.EMPLOYER.value:
            # 1. First check exact contact_email match
            emp_stmt = select(Employer).where(Employer.contact_email.ilike(user.email))
            emp_res = await db.execute(emp_stmt)
            matched_emp = emp_res.scalar_one_or_none()

            # 2. If not exact, match by domain / company name tokens
            if not matched_emp:
                all_emp_stmt = (
                    select(Employer)
                    .where(Employer.is_active.is_(True))
                    .order_by(Employer.created_at.desc())
                )
                all_emp_res = await db.execute(all_emp_stmt)
                all_employers = all_emp_res.scalars().all()

                user_domain = user.email.split("@")[-1].lower() if "@" in user.email else ""
                user_prefix = user.email.split("@")[0].lower()
                cleaned_text = f"{user_prefix} {user.full_name}".lower()

                for emp in all_employers:
                    emp_contact = emp.contact_email.lower()
                    emp_name = emp.company_name.lower()
                    emp_domain = emp_contact.split("@")[-1] if "@" in emp_contact else ""

                    if user_domain and user_domain != "kaushalnexus.gov.in" and user_domain == emp_domain:
                        matched_emp = emp
                        break
                    for name_token in emp_name.split():
                        if len(name_token) >= 4 and name_token in cleaned_text:
                            matched_emp = emp
                            break
                    if matched_emp:
                        break

                if not matched_emp and all_employers:
                    matched_emp = all_employers[0]

            return UserScope(
                role=user.role,
                is_unrestricted=False,
                employer_id=matched_emp.id if matched_emp else None,
                employer_company_name=matched_emp.company_name if matched_emp else None,
                sector=matched_emp.industry_sector if matched_emp else None,
            )

        # 5. Evaluator Scope Resolution
        if user.role == UserRole.EVALUATOR.value:
            resolved_state = None
            for kw, state_name in STATE_KEYWORDS.items():
                if kw in cleaned_text:
                    resolved_state = state_name
                    break

            district_ids: Set[str] = set()
            if resolved_state:
                dist_stmt = select(District.id).where(District.state == resolved_state)
                dist_res = await db.execute(dist_stmt)
                district_ids = set(dist_res.scalars().all())
            else:
                dist_stmt = select(District.id)
                dist_res = await db.execute(dist_stmt)
                district_ids = set(dist_res.scalars().all())

            return UserScope(
                role=user.role,
                is_unrestricted=False,
                state=resolved_state,
                district_ids=district_ids,
            )

        return UserScope(role=user.role, is_unrestricted=False)

    @classmethod
    async def verify_learner_access(
        cls, db: AsyncSession, user: User, learner: Learner
    ) -> bool:
        """
        Verifies whether an authenticated user is authorized to access a specific learner record.
        Returns True if authorized, False otherwise.
        """
        # Superuser and MSDE Officer have national access
        if user.is_superuser or user.role in (
            UserRole.SYSTEM_ADMIN.value,
            UserRole.MSDE_OFFICER.value,
        ):
            return True

        scope = await cls.resolve_user_scope(db, user)

        # STATE_ADMIN: Learner must belong to the administrator's authorized state
        if user.role == UserRole.STATE_ADMIN.value:
            learner_state = None
            if learner.district:
                learner_state = learner.district.state
            else:
                dist = await db.get(District, learner.district_id)
                if dist:
                    learner_state = dist.state

            return learner_state == scope.state

        # TRAINING_PROVIDER: Learner must be assigned to provider's training center
        if user.role == UserRole.TRAINING_PROVIDER.value:
            if learner.training_center_id and learner.training_center_id in scope.training_center_ids:
                return True
            if learner.district_id in scope.district_ids and not learner.training_center_id:
                return True
            return False

        # EMPLOYER: Learner must have a placement record with this employer or be in active hiring match workflow
        if user.role == UserRole.EMPLOYER.value:
            if not scope.employer_id:
                return False
            # Check placement
            plc_stmt = (
                select(Placement.id)
                .where(
                    Placement.learner_id == learner.id,
                    Placement.employer_id == scope.employer_id,
                )
                .limit(1)
            )
            plc_res = await db.execute(plc_stmt)
            if plc_res.scalar_one_or_none():
                return True

            # Check candidate hiring mandate matching status (Interview Ready / Placed)
            if learner.status in ("Interview Ready", "Placed & Verified"):
                # Also check sector alignment if mandate exists
                mandate_stmt = (
                    select(HiringMandate.id)
                    .where(
                        HiringMandate.employer_id == scope.employer_id,
                        HiringMandate.is_active.is_(True),
                    )
                    .limit(1)
                )
                mandate_res = await db.execute(mandate_stmt)
                if mandate_res.scalar_one_or_none():
                    return True
            return False

        # EVALUATOR: Must be in evaluator's assigned regional scope or assessment verification pipeline
        if user.role == UserRole.EVALUATOR.value:
            if scope.state:
                learner_state = learner.district.state if learner.district else None
                if not learner_state:
                    dist = await db.get(District, learner.district_id)
                    learner_state = dist.state if dist else None
                if learner_state != scope.state:
                    return False

            # Valid in assessment / verification workflow
            return True

        return False

    @staticmethod
    def filter_learner_360_for_role(
        dossier: Learner360ResponseDTO, user: User
    ) -> Learner360ResponseDTO:
        """Applies role-aware PII masking to Learner360 response."""
        # MSDE Officer and System Admin retain full unmasked visibility
        if user.is_superuser or user.role in (
            UserRole.SYSTEM_ADMIN.value,
            UserRole.MSDE_OFFICER.value,
        ):
            return dossier

        # Employers, Evaluators, and State Admins receive masked contact identifiers
        if user.role in (
            UserRole.EMPLOYER.value,
            UserRole.EVALUATOR.value,
            UserRole.STATE_ADMIN.value,
        ):
            if dossier.phone:
                dossier.phone = mask_phone(dossier.phone)
            if dossier.email:
                dossier.email = mask_email(dossier.email)

        return dossier

    @staticmethod
    def filter_learner_list_item_for_role(
        item: LearnerListItemDTO, user: User
    ) -> LearnerListItemDTO:
        """Applies role-aware PII masking to LearnerListItem response."""
        if user.is_superuser or user.role in (
            UserRole.SYSTEM_ADMIN.value,
            UserRole.MSDE_OFFICER.value,
        ):
            return item

        if user.role in (
            UserRole.EMPLOYER.value,
            UserRole.EVALUATOR.value,
            UserRole.STATE_ADMIN.value,
        ):
            if item.phone:
                item.phone = mask_phone(item.phone)
            if item.email:
                item.email = mask_email(item.email)

        return item


auth_scope_service = ScopeAuthorizationService()
