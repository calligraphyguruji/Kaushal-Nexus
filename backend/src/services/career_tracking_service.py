from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import BadRequestException, NotFoundException
from src.core.logging import logger
from src.models.career_event import (
    ApplicationStatus,
    CareerApplication,
    CareerEvent,
    CareerEventType,
    CareerSource,
    LearnerProject,
    OutcomeStatus,
    ProjectVerificationStatus,
    SOURCE_CONFIDENCE_MAP,
)
from src.models.learner import Learner
from src.models.learner_outcome import LearnerOutcome
from src.models.role import Role
from src.schemas.career_outcome_dto import (
    CareerApplicationCreateDTO,
    CareerApplicationResponseDTO,
    CareerApplicationUpdateDTO,
    CareerEventCreateDTO,
    CareerEventResponseDTO,
    CareerJourneyOverviewDTO,
    LearnerProjectCreateDTO,
    LearnerProjectResponseDTO,
    OutcomeVerifyDTO,
)
from src.services.role_matching import role_matching_service


class CareerTrackingService:
    """
    Service for candidate career activity tracking, applications management,
    project portfolio evidence, and institutional verification workflows.
    """

    # --------------------------------------------------------------------------
    # 1. Career Events
    # --------------------------------------------------------------------------
    @classmethod
    async def record_event(
        cls,
        db: AsyncSession,
        learner: Learner,
        event_in: CareerEventCreateDTO,
    ) -> CareerEventResponseDTO:
        """Records a timestamped career journey event with chronological validation."""
        event_date = event_in.event_date or datetime.now(timezone.utc)

        # Validate event type against taxonomy
        valid_types = {e.value for e in CareerEventType}
        if event_in.event_type not in valid_types:
            raise BadRequestException(
                f"Invalid career event_type '{event_in.event_type}'. Valid values: {sorted(list(valid_types))}"
            )

        # Chronology validation
        await cls._validate_event_chronology(db, learner.id, event_in.event_type, event_date)

        # Duplicate detection (same learner, same event_type, same calendar date and role)
        day_start = event_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = event_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        dup_stmt = (
            select(CareerEvent)
            .where(
                CareerEvent.learner_id == learner.id,
                CareerEvent.event_type == event_in.event_type,
                CareerEvent.event_date >= day_start,
                CareerEvent.event_date <= day_end,
            )
        )
        if event_in.role_id:
            dup_stmt = dup_stmt.where(CareerEvent.role_id == event_in.role_id)
        if event_in.organization_name:
            dup_stmt = dup_stmt.where(CareerEvent.organization_name == event_in.organization_name)

        dup_res = await db.execute(dup_stmt)
        existing = dup_res.scalars().first()
        if existing:
            # Idempotent return of existing event
            return await cls._to_event_response(db, existing)

        role_id = event_in.role_id or learner.aspiring_role_id

        event_rec = CareerEvent(
            learner_id=learner.id,
            event_type=event_in.event_type,
            role_id=role_id,
            organization_name=event_in.organization_name,
            event_date=event_date,
            source=event_in.source,
            notes=event_in.notes,
            metadata_json=event_in.metadata_json,
        )
        db.add(event_rec)
        await db.commit()
        await db.refresh(event_rec)

        return await cls._to_event_response(db, event_rec)

    @classmethod
    async def list_events(
        cls,
        db: AsyncSession,
        learner_id: str,
        event_type: Optional[str] = None,
        role_id: Optional[uuid.UUID] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[CareerEventResponseDTO]:
        """Queries career events for a learner with optional multi-criteria filtering."""
        stmt = (
            select(CareerEvent)
            .where(CareerEvent.learner_id == learner_id)
            .options(selectinload(CareerEvent.role))
            .order_by(CareerEvent.event_date.desc())
        )
        if event_type:
            stmt = stmt.where(CareerEvent.event_type == event_type)
        if role_id:
            stmt = stmt.where(CareerEvent.role_id == role_id)
        if date_from:
            stmt = stmt.where(CareerEvent.event_date >= date_from)
        if date_to:
            stmt = stmt.where(CareerEvent.event_date <= date_to)

        res = await db.execute(stmt)
        events = res.scalars().all()

        return [
            CareerEventResponseDTO(
                id=e.id,
                learner_id=e.learner_id,
                event_type=e.event_type,
                role_id=e.role_id,
                role_title=e.role.title if e.role else None,
                organization_name=e.organization_name,
                event_date=e.event_date,
                source=e.source,
                notes=e.notes,
                metadata_json=e.metadata_json,
                created_at=e.created_at,
            )
            for e in events
        ]

    # --------------------------------------------------------------------------
    # 2. Career Applications
    # --------------------------------------------------------------------------
    @classmethod
    async def create_application(
        cls,
        db: AsyncSession,
        learner: Learner,
        app_in: CareerApplicationCreateDTO,
    ) -> CareerApplicationResponseDTO:
        """Creates a job/internship application and logs an associated career event."""
        applied_at = app_in.applied_at or datetime.now(timezone.utc)
        role_id = app_in.role_id or learner.aspiring_role_id

        app_rec = CareerApplication(
            learner_id=learner.id,
            role_id=role_id,
            organization_name=app_in.organization_name,
            job_title=app_in.job_title,
            status=app_in.status,
            source=app_in.source,
            applied_at=applied_at,
            salary_offered=app_in.salary_offered,
            notes=app_in.notes,
        )
        db.add(app_rec)
        await db.commit()
        await db.refresh(app_rec)

        # Automatically log CareerEvent(APPLICATION_SUBMITTED)
        try:
            await cls.record_event(
                db=db,
                learner=learner,
                event_in=CareerEventCreateDTO(
                    event_type=CareerEventType.APPLICATION_SUBMITTED.value,
                    role_id=role_id,
                    organization_name=app_in.organization_name,
                    event_date=applied_at,
                    source=app_in.source,
                    notes=f"Applied for {app_in.job_title or 'position'} at {app_in.organization_name}",
                ),
            )
        except Exception as e:
            logger.warning(f"Secondary career event creation failed: {e}")

        return await cls._to_application_response(db, app_rec)

    @classmethod
    async def list_applications(
        cls,
        db: AsyncSession,
        learner_id: str,
        status_filter: Optional[str] = None,
    ) -> List[CareerApplicationResponseDTO]:
        """Lists applications submitted by candidate."""
        stmt = (
            select(CareerApplication)
            .where(CareerApplication.learner_id == learner_id)
            .options(selectinload(CareerApplication.role))
            .order_by(CareerApplication.applied_at.desc())
        )
        if status_filter:
            stmt = stmt.where(CareerApplication.status == status_filter)

        res = await db.execute(stmt)
        apps = res.scalars().all()

        return [
            CareerApplicationResponseDTO(
                id=a.id,
                learner_id=a.learner_id,
                role_id=a.role_id,
                role_title=a.role.title if a.role else None,
                organization_name=a.organization_name,
                job_title=a.job_title,
                status=a.status,
                source=a.source,
                applied_at=a.applied_at,
                salary_offered=a.salary_offered,
                notes=a.notes,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in apps
        ]

    @classmethod
    async def update_application(
        cls,
        db: AsyncSession,
        learner: Learner,
        application_id: uuid.UUID,
        update_in: CareerApplicationUpdateDTO,
    ) -> CareerApplicationResponseDTO:
        """Updates application progression state and logs corresponding career events."""
        stmt = (
            select(CareerApplication)
            .where(
                CareerApplication.id == application_id,
                CareerApplication.learner_id == learner.id,
            )
            .options(selectinload(CareerApplication.role))
        )
        res = await db.execute(stmt)
        app_rec = res.scalar_one_or_none()
        if not app_rec:
            raise NotFoundException(f"Application '{application_id}' not found for current candidate.")

        old_status = app_rec.status
        if update_in.status:
            app_rec.status = update_in.status
        if update_in.salary_offered is not None:
            app_rec.salary_offered = update_in.salary_offered
        if update_in.notes is not None:
            app_rec.notes = update_in.notes

        await db.commit()
        await db.refresh(app_rec)

        # Trigger corresponding CareerEvents when advancing application lifecycle
        if update_in.status and update_in.status != old_status:
            now_dt = datetime.now(timezone.utc)
            event_type_map = {
                ApplicationStatus.INTERVIEW.value: CareerEventType.INTERVIEW_INVITED.value,
                ApplicationStatus.OFFERED.value: CareerEventType.INTERNSHIP_OFFERED.value,
                ApplicationStatus.ACCEPTED.value: CareerEventType.INTERNSHIP_ACCEPTED.value,
            }
            if update_in.status in event_type_map:
                try:
                    await cls.record_event(
                        db=db,
                        learner=learner,
                        event_in=CareerEventCreateDTO(
                            event_type=event_type_map[update_in.status],
                            role_id=app_rec.role_id,
                            organization_name=app_rec.organization_name,
                            event_date=now_dt,
                            source=app_rec.source,
                            notes=f"Application status shifted to {update_in.status}",
                        ),
                    )
                except Exception as e:
                    logger.warning(f"Event logging for application status change failed: {e}")

        return await cls._to_application_response(db, app_rec)

    # --------------------------------------------------------------------------
    # 3. Practical Project Evidence
    # --------------------------------------------------------------------------
    @classmethod
    async def create_project(
        cls,
        db: AsyncSession,
        learner: Learner,
        project_in: LearnerProjectCreateDTO,
    ) -> LearnerProjectResponseDTO:
        """Records technical project implementation evidence without directly modifying BKT."""
        completed_at = project_in.completed_at or datetime.now(timezone.utc)

        proj_rec = LearnerProject(
            learner_id=learner.id,
            title=project_in.title,
            description=project_in.description,
            skills=project_in.skills or [],
            technologies=project_in.technologies or [],
            github_url=project_in.github_url,
            live_url=project_in.live_url,
            completed_at=completed_at,
            verification_status=project_in.verification_status,
        )
        db.add(proj_rec)
        await db.commit()
        await db.refresh(proj_rec)

        # Log CareerEvent(PROJECT_COMPLETED)
        try:
            await cls.record_event(
                db=db,
                learner=learner,
                event_in=CareerEventCreateDTO(
                    event_type=CareerEventType.PROJECT_COMPLETED.value,
                    event_date=completed_at,
                    source=project_in.verification_status,
                    notes=f"Completed project: {project_in.title}",
                    metadata_json={
                        "technologies": project_in.technologies,
                        "github_url": project_in.github_url,
                    },
                ),
            )
        except Exception as e:
            logger.warning(f"Event logging for project failed: {e}")

        return LearnerProjectResponseDTO(
            id=proj_rec.id,
            learner_id=proj_rec.learner_id,
            title=proj_rec.title,
            description=proj_rec.description,
            skills=proj_rec.skills,
            technologies=proj_rec.technologies,
            github_url=proj_rec.github_url,
            live_url=proj_rec.live_url,
            completed_at=proj_rec.completed_at,
            verification_status=proj_rec.verification_status,
            created_at=proj_rec.created_at,
        )

    @classmethod
    async def list_projects(
        cls,
        db: AsyncSession,
        learner_id: str,
    ) -> List[LearnerProjectResponseDTO]:
        """Lists projects created by candidate."""
        stmt = (
            select(LearnerProject)
            .where(LearnerProject.learner_id == learner_id)
            .order_by(LearnerProject.completed_at.desc())
        )
        res = await db.execute(stmt)
        records = res.scalars().all()

        return [
            LearnerProjectResponseDTO(
                id=p.id,
                learner_id=p.learner_id,
                title=p.title,
                description=p.description,
                skills=p.skills,
                technologies=p.technologies,
                github_url=p.github_url,
                live_url=p.live_url,
                completed_at=p.completed_at,
                verification_status=p.verification_status,
                created_at=p.created_at,
            )
            for p in records
        ]

    # --------------------------------------------------------------------------
    # 4. Institutional Verification Workflow
    # --------------------------------------------------------------------------
    @classmethod
    async def verify_outcome(
        cls,
        db: AsyncSession,
        outcome_id: uuid.UUID,
        verify_in: OutcomeVerifyDTO,
    ) -> LearnerOutcome:
        """Allows authorized institutional staff/admin to verify or reject self-reported outcomes."""
        outcome = await db.get(LearnerOutcome, outcome_id)
        if not outcome:
            raise NotFoundException(f"Outcome '{outcome_id}' not found.")

        outcome.status = verify_in.status
        if verify_in.status == OutcomeStatus.VERIFIED.value:
            outcome.confidence = 1.0
        elif verify_in.status == OutcomeStatus.REJECTED.value:
            outcome.confidence = 0.0

        if verify_in.notes:
            outcome.notes = f"{outcome.notes or ''} [Verification Note: {verify_in.notes}]".strip()

        await db.commit()
        await db.refresh(outcome)
        return outcome

    # --------------------------------------------------------------------------
    # 5. Career Journey Overview Dashboard Aggregator
    # --------------------------------------------------------------------------
    @classmethod
    async def get_career_journey_overview(
        cls,
        db: AsyncSession,
        learner: Learner,
    ) -> CareerJourneyOverviewDTO:
        """
        Synthesizes the complete end-to-end career journey:
        Target role match, mastery counts, projects, applications, interviews, and real outcome milestones.
        """
        # Fetch events
        events = await cls.list_events(db, learner.id)

        # Fetch applications
        apps = await cls.list_applications(db, learner.id)

        # Fetch projects
        projects = await cls.list_projects(db, learner.id)

        # Fetch outcomes
        outcomes_stmt = (
            select(LearnerOutcome)
            .where(LearnerOutcome.learner_id == learner.id)
            .options(selectinload(LearnerOutcome.role))
            .order_by(LearnerOutcome.outcome_date.desc())
        )
        o_res = await db.execute(outcomes_stmt)
        outcomes = o_res.scalars().all()

        # Check role match and gaps
        role_title = None
        match_score = 0.0
        critical_gaps = 0
        strong_skills = 0

        if learner.aspiring_role_id:
            role = await db.get(Role, learner.aspiring_role_id)
            if role:
                role_title = role.title
                eval_res = await role_matching_service.evaluate_learner_for_role(db, learner, role.id)
                match_score = eval_res.match_score
                critical_gaps = len(eval_res.critical_gaps)
                strong_skills = len(eval_res.strong_skills)

        # Derive status indicators strictly from real observations
        has_internship = any(
            o.outcome_type in ("INTERNSHIP_PLACED", "INTERNSHIP_ACCEPTED", "INTERNSHIP_OFFER")
            for o in outcomes
        ) or any(
            e.event_type in (CareerEventType.INTERNSHIP_ACCEPTED.value, CareerEventType.INTERNSHIP_COMPLETED.value)
            for e in events
        ) or any(
            a.status in (ApplicationStatus.ACCEPTED.value, ApplicationStatus.OFFERED.value)
            for a in apps
        )

        has_employment = any(
            o.outcome_type in ("EMPLOYMENT_ACCEPTED", "EMPLOYMENT_OFFERED", "PLACED")
            for o in outcomes
        ) or any(
            e.event_type in (CareerEventType.EMPLOYMENT_ACCEPTED.value, CareerEventType.PLACED.value)
            for e in events
        )

        internship_status = "ACCEPTED / PLACED" if has_internship else (
            "IN_PROGRESS" if len(apps) > 0 else "NOT_STARTED"
        )
        employment_status = "EMPLOYED" if has_employment else (
            "INTERVIEWING" if any(a.status == ApplicationStatus.INTERVIEW.value for a in apps) else "SEEKING"
        )

        interviews_count = sum(
            1 for e in events if e.event_type in (CareerEventType.INTERVIEW_INVITED.value, CareerEventType.INTERVIEW_ATTENDED.value)
        ) + sum(
            1 for a in apps if a.status == ApplicationStatus.INTERVIEW.value
        )

        return CareerJourneyOverviewDTO(
            learner_id=learner.id,
            full_name=learner.full_name,
            target_role_title=role_title,
            role_match_score=match_score,
            mastered_skills_count=strong_skills,
            critical_gaps_count=critical_gaps,
            learning_progress_pct=float(learner.overall_progress or 0.0),
            projects_count=len(projects),
            applications_count=len(apps),
            interviews_count=interviews_count,
            internship_status=internship_status,
            employment_status=employment_status,
            recent_events=events[:10],
            recent_applications=apps[:5],
            recent_projects=projects[:5],
            outcomes=[
                {
                    "id": str(o.id),
                    "outcome_type": o.outcome_type,
                    "outcome_date": o.outcome_date.isoformat(),
                    "status": o.status,
                    "confidence": o.confidence,
                    "source": o.source,
                    "role_title": o.role.title if o.role else None,
                }
                for o in outcomes
            ],
        )

    # --------------------------------------------------------------------------
    # Helper & Validation Methods
    # --------------------------------------------------------------------------
    @classmethod
    async def _validate_event_chronology(
        cls,
        db: AsyncSession,
        learner_id: str,
        event_type: str,
        event_date: datetime,
    ) -> None:
        """Detects impossible chronology and raises BadRequestException."""
        if event_type == CareerEventType.INTERNSHIP_COMPLETED.value:
            # Check if there is an INTERNSHIP_ACCEPTED on or before event_date
            stmt = (
                select(CareerEvent)
                .where(
                    CareerEvent.learner_id == learner_id,
                    CareerEvent.event_type.in_([
                        CareerEventType.INTERNSHIP_ACCEPTED.value,
                        CareerEventType.INTERNSHIP_OFFERED.value,
                    ]),
                )
            )
            res = await db.execute(stmt)
            prior = res.scalars().all()
            if not prior:
                # Also check learner_outcomes
                o_stmt = (
                    select(LearnerOutcome)
                    .where(
                        LearnerOutcome.learner_id == learner_id,
                        LearnerOutcome.outcome_type.in_([
                            "INTERNSHIP_ACCEPTED",
                            "INTERNSHIP_PLACED",
                            "INTERNSHIP_OFFER",
                        ]),
                    )
                )
                o_res = await db.execute(o_stmt)
                prior_o = o_res.scalars().all()
                if not prior_o:
                    raise BadRequestException(
                        "Chronology validation failed: Cannot record INTERNSHIP_COMPLETED without a prior accepted internship."
                    )
            # Check dates
            all_dates = [p.event_date for p in prior] + [p.outcome_date for p in prior_o if 'prior_o' in locals()]
            if all_dates and min(all_dates) > event_date:
                raise BadRequestException(
                    "Chronology validation failed: INTERNSHIP_COMPLETED date precedes the earliest accepted internship date."
                )

        if event_type == CareerEventType.EMPLOYMENT_ACCEPTED.value:
            # Check if offer exists if required
            pass

    @classmethod
    async def _to_event_response(
        cls, db: AsyncSession, event: CareerEvent
    ) -> CareerEventResponseDTO:
        role_title = None
        if event.role_id:
            role = await db.get(Role, event.role_id)
            if role:
                role_title = role.title

        return CareerEventResponseDTO(
            id=event.id,
            learner_id=event.learner_id,
            event_type=event.event_type,
            role_id=event.role_id,
            role_title=role_title,
            organization_name=event.organization_name,
            event_date=event.event_date,
            source=event.source,
            notes=event.notes,
            metadata_json=event.metadata_json,
            created_at=event.created_at,
        )

    @classmethod
    async def _to_application_response(
        cls, db: AsyncSession, app_rec: CareerApplication
    ) -> CareerApplicationResponseDTO:
        role_title = None
        if app_rec.role_id:
            role = await db.get(Role, app_rec.role_id)
            if role:
                role_title = role.title

        return CareerApplicationResponseDTO(
            id=app_rec.id,
            learner_id=app_rec.learner_id,
            role_id=app_rec.role_id,
            role_title=role_title,
            organization_name=app_rec.organization_name,
            job_title=app_rec.job_title,
            status=app_rec.status,
            source=app_rec.source,
            applied_at=app_rec.applied_at,
            salary_offered=app_rec.salary_offered,
            notes=app_rec.notes,
            created_at=app_rec.created_at,
            updated_at=app_rec.updated_at,
        )


career_tracking_service = CareerTrackingService()
