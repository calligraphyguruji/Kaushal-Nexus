from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import BadRequestException, NotFoundException
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.models.placement import Placement, RetentionCheckpoint
from src.schemas.placement_dto import (
    PlacementCreateDTO,
    PlacementDetailDTO,
    PlacementResponseDTO,
    PlacementRetentionResponseDTO,
    RetentionCheckpointDTO,
    RetentionCheckpointUpdateDTO,
)
from src.services.epfo_service import epfo_service


class PlacementService:
    """
    Service layer for verified candidate placement and longitudinal
    retention milestone tracking (3M, 6M, 12M).
    """

    # ==========================================================================
    # Pure Mathematical & Analytical Helpers
    # ==========================================================================

    @staticmethod
    def calculate_wage_increment(starting_ctc_lpa: float, current_ctc_lpa: float) -> float:
        """
        Calculates wage growth percentage from baseline starting compensation:
        WageIncrement% = ((CurrentCTC - StartingCTC) / StartingCTC) * 100
        """
        if starting_ctc_lpa <= 0.0:
            return 0.0
        increment = ((current_ctc_lpa - starting_ctc_lpa) / starting_ctc_lpa) * 100.0
        return round(increment, 2)

    @staticmethod
    def calculate_checkpoint_date(joined_date: date, milestone_months: int) -> date:
        """Computes target evaluation calendar date for longitudinal retention milestones."""
        if milestone_months == 3:
            return joined_date + timedelta(days=90)
        elif milestone_months == 6:
            return joined_date + timedelta(days=180)
        elif milestone_months == 12:
            return joined_date + timedelta(days=365)
        else:
            return joined_date + timedelta(days=milestone_months * 30)

    @staticmethod
    def evaluate_retention_milestone_status(
        checkpoints: List[RetentionCheckpoint],
        reference_date: Optional[date] = None,
    ) -> str:
        """
        Evaluates highest longitudinal retention milestone achieved based on calendar timeline.
        Considers checkpoints where checkpoint_date <= reference_date (defaults to today).
        """
        ref = reference_date or date.today()
        cp_map = {cp.checkpoint_type.upper(): cp for cp in checkpoints}

        # Check for separation
        for cp in checkpoints:
            if not cp.is_active_at_checkpoint:
                return "Separated"

        if (
            "12M" in cp_map
            and cp_map["12M"].is_active_at_checkpoint
            and cp_map["12M"].checkpoint_date <= ref
        ):
            return "12M Retained"

        if (
            "6M" in cp_map
            and cp_map["6M"].is_active_at_checkpoint
            and cp_map["6M"].checkpoint_date <= ref
        ):
            return "6M Retained"

        if (
            "3M" in cp_map
            and cp_map["3M"].is_active_at_checkpoint
            and cp_map["3M"].checkpoint_date <= ref
        ):
            return "3M Retained"

        return "Active (In Progress)"

    # ==========================================================================
    # CRUD & Workflow Methods
    # ==========================================================================

    @classmethod
    async def create_placement(
        cls,
        db: AsyncSession,
        req: PlacementCreateDTO,
    ) -> PlacementResponseDTO:
        """
        Registers a verified placement, invokes mock EPFO validation,
        and auto-initializes 3M, 6M, and 12M longitudinal retention checkpoints.
        """
        # 1. Verify candidate exists
        learner = await db.get(Learner, req.learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate with ID '{req.learner_id}' not found.")

        # 2. Verify corporate employer exists
        employer = await db.get(Employer, req.employer_id)
        if not employer:
            raise NotFoundException(message=f"Employer partner with ID '{req.employer_id}' not found.")

        # 3. Optional mandate verification
        if req.hiring_mandate_id:
            mandate = await db.get(HiringMandate, req.hiring_mandate_id)
            if not mandate:
                raise NotFoundException(
                    message=f"Hiring Mandate '{req.hiring_mandate_id}' not found."
                )

        current_ctc = req.current_ctc_lpa if req.current_ctc_lpa is not None else req.starting_ctc_lpa

        # 4. Mock EPFO statutory validation
        epfo_status = "PENDING"
        epfo_ref = None
        epfo_verified_time = None
        assigned_uan = req.uan

        if req.auto_verify_epfo or req.uan:
            epfo_result = await epfo_service.verify_employment(
                uan=req.uan,
                employer_name=employer.company_name,
                joined_date=req.joined_date,
                starting_ctc_lpa=req.starting_ctc_lpa,
            )
            epfo_status = epfo_result.status
            epfo_ref = epfo_result.verification_ref
            epfo_verified_time = epfo_result.verified_at
            assigned_uan = epfo_result.uan

        # 5. Create Placement Record
        placement = Placement(
            learner_id=learner.id,
            employer_id=employer.id,
            hiring_mandate_id=req.hiring_mandate_id,
            job_title=req.job_title,
            joined_date=req.joined_date,
            starting_ctc_lpa=req.starting_ctc_lpa,
            current_ctc_lpa=current_ctc,
            employment_type=req.employment_type or "Full-Time",
            status="Active",
            uan=assigned_uan,
            epfo_verification_status=epfo_status,
            epfo_last_verified_at=epfo_verified_time,
            epfo_transaction_ref=epfo_ref,
        )
        db.add(placement)
        await db.flush()

        # 6. Initialize 3M, 6M, 12M Retention Checkpoints
        standard_checkpoints = [
            ("3M", 3),
            ("6M", 6),
            ("12M", 12),
        ]

        custom_cp_map = {}
        if req.checkpoints:
            for c in req.checkpoints:
                custom_cp_map[c.checkpoint_type.upper()] = c

        created_checkpoints: List[RetentionCheckpoint] = []
        for cp_type, months in standard_checkpoints:
            cp_custom = custom_cp_map.get(cp_type)

            cp_date = (
                cp_custom.checkpoint_date
                if cp_custom and cp_custom.checkpoint_date
                else cls.calculate_checkpoint_date(req.joined_date, months)
            )
            is_active = (
                cp_custom.is_active_at_checkpoint
                if cp_custom
                else True
            )
            cp_ctc = (
                cp_custom.current_ctc_lpa
                if cp_custom and cp_custom.current_ctc_lpa is not None
                else current_ctc
            )
            remarks = (
                cp_custom.remarks
                if cp_custom and cp_custom.remarks
                else f"Automated {cp_type} retention tracking checkpoint."
            )

            wage_growth = cls.calculate_wage_increment(req.starting_ctc_lpa, cp_ctc)

            checkpoint = RetentionCheckpoint(
                placement_id=placement.id,
                checkpoint_type=cp_type,
                milestone_months=months,
                checkpoint_date=cp_date,
                is_active_at_checkpoint=is_active,
                epfo_verified=(epfo_status == "VERIFIED"),
                current_ctc_lpa=cp_ctc,
                wage_increment_percentage=wage_growth,
                epfo_contribution_months=months if epfo_status == "VERIFIED" else None,
                verification_status="VERIFIED" if epfo_status == "VERIFIED" else "PENDING",
                remarks=remarks,
                evaluated_at=datetime.now(timezone.utc),
            )
            db.add(checkpoint)
            created_checkpoints.append(checkpoint)

        # 7. Update Candidate Cohort Status
        if learner.status in ["In Training", "Assessment Passed", "Interview Ready"]:
            learner.status = "Placed & Verified"

        await db.commit()
        await db.refresh(placement)

        return PlacementResponseDTO(
            id=placement.id,
            learner_id=placement.learner_id,
            learner_name=learner.full_name,
            employer_id=placement.employer_id,
            employer_name=employer.company_name,
            hiring_mandate_id=placement.hiring_mandate_id,
            job_title=placement.job_title,
            joined_date=placement.joined_date,
            starting_ctc_lpa=placement.starting_ctc_lpa,
            current_ctc_lpa=placement.current_ctc_lpa,
            employment_type=placement.employment_type,
            status=placement.status,
            uan=placement.uan,
            epfo_verification_status=placement.epfo_verification_status,
            epfo_last_verified_at=placement.epfo_last_verified_at,
            epfo_transaction_ref=placement.epfo_transaction_ref,
            created_at=placement.created_at,
            checkpoints=[RetentionCheckpointDTO.model_validate(cp) for cp in created_checkpoints],
        )

    @classmethod
    async def get_placements_by_learner(
        cls,
        db: AsyncSession,
        learner_id: str,
    ) -> List[PlacementDetailDTO]:
        """Retrieves all corporate placement records for a specific candidate."""
        learner = await db.get(Learner, learner_id)
        if not learner:
            raise NotFoundException(message=f"Candidate with ID '{learner_id}' not found.")

        stmt = (
            select(Placement)
            .where(Placement.learner_id == learner_id)
            .options(
                selectinload(Placement.employer),
                selectinload(Placement.retention_checkpoints),
            )
            .order_by(Placement.joined_date.desc())
        )
        result = await db.execute(stmt)
        placements = result.scalars().all()

        details: List[PlacementDetailDTO] = []
        for p in placements:
            milestones = [
                cp.checkpoint_type
                for cp in p.retention_checkpoints
                if cp.is_active_at_checkpoint
            ]

            details.append(
                PlacementDetailDTO(
                    id=p.id,
                    learner_id=p.learner_id,
                    employer_id=p.employer_id,
                    employer_name=p.employer.company_name if p.employer else "Corporate Partner",
                    job_title=p.job_title,
                    joined_date=p.joined_date,
                    starting_ctc_lpa=p.starting_ctc_lpa,
                    current_ctc_lpa=p.current_ctc_lpa,
                    employment_type=p.employment_type,
                    status=p.status,
                    uan=p.uan,
                    epfo_verification_status=p.epfo_verification_status,
                    epfo_last_verified_at=p.epfo_last_verified_at,
                    checkpoints_count=len(p.retention_checkpoints),
                    retention_milestones_achieved=milestones,
                    created_at=p.created_at,
                )
            )

        return details

    @classmethod
    async def get_placement_retention(
        cls,
        db: AsyncSession,
        placement_id: uuid.UUID,
    ) -> PlacementRetentionResponseDTO:
        """
        Retrieves comprehensive longitudinal retention audit for a placement,
        including 3M, 6M, and 12M checkpoints, EPFO verification, and wage increment analytics.
        """
        stmt = (
            select(Placement)
            .where(Placement.id == placement_id)
            .options(
                selectinload(Placement.learner),
                selectinload(Placement.employer),
                selectinload(Placement.retention_checkpoints),
            )
        )
        result = await db.execute(stmt)
        placement = result.scalar_one_or_none()

        if not placement:
            raise NotFoundException(message=f"Placement record with ID '{placement_id}' not found.")

        # Sort checkpoints in order of months
        checkpoints_sorted = sorted(
            placement.retention_checkpoints,
            key=lambda cp: cp.milestone_months,
        )

        total_wage_increment = cls.calculate_wage_increment(
            placement.starting_ctc_lpa, placement.current_ctc_lpa
        )
        retention_milestone = cls.evaluate_retention_milestone_status(checkpoints_sorted)

        return PlacementRetentionResponseDTO(
            placement_id=placement.id,
            learner_id=placement.learner_id,
            learner_name=placement.learner.full_name if placement.learner else placement.learner_id,
            employer_id=placement.employer_id,
            employer_name=placement.employer.company_name if placement.employer else "Corporate Partner",
            job_title=placement.job_title,
            joined_date=placement.joined_date,
            starting_ctc_lpa=placement.starting_ctc_lpa,
            current_ctc_lpa=placement.current_ctc_lpa,
            total_wage_increment_percentage=total_wage_increment,
            retention_status=placement.status,
            retention_milestone_achieved=retention_milestone,
            epfo_verification_status=placement.epfo_verification_status,
            epfo_last_verified_at=placement.epfo_last_verified_at,
            checkpoints=[RetentionCheckpointDTO.model_validate(cp) for cp in checkpoints_sorted],
        )

    @classmethod
    async def update_retention_checkpoint(
        cls,
        db: AsyncSession,
        placement_id: uuid.UUID,
        checkpoint_type: str,
        update_data: RetentionCheckpointUpdateDTO,
    ) -> RetentionCheckpointDTO:
        """
        Updates a retention checkpoint (active status, CTC, remarks)
        and recalculates wage increments and candidate retention milestones.
        """
        stmt = (
            select(RetentionCheckpoint)
            .where(
                RetentionCheckpoint.placement_id == placement_id,
                RetentionCheckpoint.checkpoint_type.ilike(checkpoint_type.strip()),
            )
            .options(selectinload(RetentionCheckpoint.placement).selectinload(Placement.learner))
        )
        result = await db.execute(stmt)
        checkpoint = result.scalar_one_or_none()

        if not checkpoint:
            raise NotFoundException(
                message=f"Retention checkpoint '{checkpoint_type}' for placement '{placement_id}' not found."
            )

        placement = checkpoint.placement

        # Apply updates
        if update_data.is_active_at_checkpoint is not None:
            checkpoint.is_active_at_checkpoint = update_data.is_active_at_checkpoint
            if not update_data.is_active_at_checkpoint:
                checkpoint.verification_status = "SEPARATED"
                placement.status = "Separated"

        if update_data.current_ctc_lpa is not None:
            checkpoint.current_ctc_lpa = update_data.current_ctc_lpa
            checkpoint.wage_increment_percentage = cls.calculate_wage_increment(
                placement.starting_ctc_lpa, update_data.current_ctc_lpa
            )
            placement.current_ctc_lpa = update_data.current_ctc_lpa

        if update_data.epfo_verified is not None:
            checkpoint.epfo_verified = update_data.epfo_verified
        if update_data.verification_status is not None:
            checkpoint.verification_status = update_data.verification_status
        if update_data.remarks is not None:
            checkpoint.remarks = update_data.remarks

        checkpoint.evaluated_at = datetime.now(timezone.utc)

        # If 6M checkpoint evaluated active, elevate candidate status to Retained (180-Day)
        if (
            checkpoint.checkpoint_type.upper() == "6M"
            and checkpoint.is_active_at_checkpoint
            and placement.learner
        ):
            placement.learner.status = "Retained (180-Day)"
            placement.status = "Retained (180-Day)"

        # If 12M checkpoint evaluated active, elevate to Retained (365-Day)
        if (
            checkpoint.checkpoint_type.upper() == "12M"
            and checkpoint.is_active_at_checkpoint
            and placement.learner
        ):
            placement.status = "Retained (365-Day)"

        await db.commit()
        await db.refresh(checkpoint)

        return RetentionCheckpointDTO.model_validate(checkpoint)


placement_service = PlacementService()
