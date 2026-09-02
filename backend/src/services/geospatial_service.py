from typing import Any, Dict, List, Optional
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.learner import Learner
from src.models.skill_gap import SkillGapAnalytic
from src.models.training_center import TrainingCenter
from src.schemas.regional_dto import (
    CoordinatesDTO,
    DistrictIntelligenceItemDTO,
    PriorityClusterItemDTO,
    RegionalClusterItemDTO,
    RegionalDivergenceResponseDTO,
    StateAggregateDTO,
)


class GeospatialService:
    """Service layer aggregating district geospatial intelligence, cluster divergence, and vulnerability models."""

    @classmethod
    async def get_districts_intelligence(
        cls,
        db: AsyncSession,
        state: Optional[str] = None,
        region: Optional[str] = None,
        district: Optional[str] = None,
        tier: Optional[str] = None,
    ) -> List[DistrictIntelligenceItemDTO]:
        """Calculates multi-dimensional skilling and economic divergence metrics for each district."""
        # Query base districts
        query = select(District).options(
            selectinload(District.training_centers),
            selectinload(District.learners),
        )

        if state and state.strip():
            query = query.where(District.state.ilike(f"%{state.strip()}%"))
        if region and region.strip():
            query = query.where(District.region.ilike(f"%{region.strip()}%"))
        if district and district.strip():
            d_query = district.strip()
            query = query.where(
                (District.id.ilike(f"%{d_query}%")) | (District.name.ilike(f"%{d_query}%"))
            )
        if tier and tier.strip():
            query = query.where(District.tier.ilike(f"%{tier.strip()}%"))

        query = query.order_by(District.state.asc(), District.name.asc())
        result = await db.execute(query)
        districts = result.scalars().all()

        items: List[DistrictIntelligenceItemDTO] = []

        for d in districts:
            learners = d.learners or []
            total_enrolled = len(learners)
            total_trained = sum(1 for l in learners if l.overall_progress >= 70)
            total_certified = sum(
                1
                for l in learners
                if l.ncvet_credential_id
                or l.status in ["Assessment Passed", "Interview Ready", "Placed & Verified", "Retained (180-Day)"]
            )
            total_placed = sum(
                1 for l in learners if l.status in ["Placed & Verified", "Retained (180-Day)"]
            )
            total_retained = sum(1 for l in learners if l.status == "Retained (180-Day)")

            # Rates
            completion_rate = (
                round((total_trained / total_enrolled * 100), 1) if total_enrolled > 0 else 72.0
            )
            placement_rate = (
                round((total_placed / total_certified * 100), 1) if total_certified > 0 else 64.5
            )
            retention_rate = (
                round((total_retained / total_placed * 100), 1) if total_placed > 0 else 78.0
            )

            # Query skill gap analytics for this district
            gap_stmt = (
                select(SkillGapAnalytic)
                .options(selectinload(SkillGapAnalytic.competency))
                .where(SkillGapAnalytic.district_id == d.id)
                .order_by(SkillGapAnalytic.deficit_pct.desc())
            )
            gaps = (await db.execute(gap_stmt)).scalars().all()

            if gaps:
                demand_index = round(sum(g.employer_demand_pct for g in gaps) / len(gaps), 1)
                supply_index = round(sum(g.workforce_supply_pct for g in gaps) / len(gaps), 1)
                divergence_score = round(max(0.0, demand_index - supply_index), 1)
                dominant_gaps = [
                    g.competency.name for g in gaps if g.competency and g.severity in ["Critical", "High"]
                ][:3]
                if not dominant_gaps and gaps:
                    dominant_gaps = [g.competency.name for g in gaps if g.competency][:2]
            else:
                # Default calibrated district indices based on tier
                tier_weights = {"Tier 1": (84.0, 62.0), "Tier 2": (78.0, 48.0), "Tier 3": (72.0, 36.0)}
                dem_base, sup_base = tier_weights.get(d.tier, (75.0, 50.0))
                demand_index = dem_base
                supply_index = sup_base
                divergence_score = round(demand_index - supply_index, 1)
                dominant_gaps = ["Cloud Infrastructure", "CNC Precision Machining", "Data Analytics"]

            # Vulnerability Composite Index (0-100)
            vuln_score = min(
                100.0,
                max(
                    10.0,
                    round(
                        (divergence_score * 0.45)
                        + ((100.0 - placement_rate) * 0.35)
                        + ((100.0 - retention_rate) * 0.20),
                        1,
                    ),
                ),
            )

            priority_level = (
                "Critical" if vuln_score >= 45.0 else ("Elevated" if vuln_score >= 30.0 else "Stable")
            )

            items.append(
                DistrictIntelligenceItemDTO(
                    district_id=d.id,
                    name=d.name,
                    state=d.state,
                    region=d.region,
                    tier=d.tier,
                    coordinates=CoordinatesDTO(latitude=d.latitude, longitude=d.longitude),
                    total_enrolled=total_enrolled,
                    total_trained=total_trained,
                    total_certified=total_certified,
                    total_placed=total_placed,
                    training_completion_rate=completion_rate,
                    placement_rate=placement_rate,
                    retention_rate=retention_rate,
                    employer_demand_index=demand_index,
                    workforce_supply_index=supply_index,
                    divergence_score=divergence_score,
                    dominant_skill_gaps=dominant_gaps,
                    active_training_centers_count=len(d.training_centers),
                    vulnerability_index=vuln_score,
                    priority_level=priority_level,
                )
            )

        return items

    @classmethod
    async def get_regional_divergence(
        cls,
        db: AsyncSession,
        state: Optional[str] = None,
        region: Optional[str] = None,
        district: Optional[str] = None,
        tier: Optional[str] = None,
    ) -> RegionalDivergenceResponseDTO:
        """Analyzes macro-divergence across state clusters and regional corridors."""
        districts_data = await cls.get_districts_intelligence(
            db=db, state=state, region=region, district=district, tier=tier
        )

        high_div = [d for d in districts_data if d.divergence_score >= 25.0]
        aligned = [d for d in districts_data if d.divergence_score < 15.0]

        # Group by State
        state_map: Dict[str, Dict[str, Any]] = {}
        # Group by Region
        region_map: Dict[str, Dict[str, Any]] = {}

        for d in districts_data:
            # State grouping
            if d.state not in state_map:
                state_map[d.state] = {
                    "count": 0,
                    "enrolled": 0,
                    "placement_sum": 0.0,
                    "retention_sum": 0.0,
                    "divergence_sum": 0.0,
                    "critical_count": 0,
                }
            state_map[d.state]["count"] += 1
            state_map[d.state]["enrolled"] += d.total_enrolled
            state_map[d.state]["placement_sum"] += d.placement_rate
            state_map[d.state]["retention_sum"] += d.retention_rate
            state_map[d.state]["divergence_sum"] += d.divergence_score
            if d.priority_level == "Critical":
                state_map[d.state]["critical_count"] += 1

            # Region grouping
            r_key = f"{d.region} ({d.state})"
            if r_key not in region_map:
                region_map[r_key] = {
                    "region": d.region,
                    "state": d.state,
                    "count": 0,
                    "enrolled": 0,
                    "divergence_sum": 0.0,
                    "gaps": set(),
                }
            region_map[r_key]["count"] += 1
            region_map[r_key]["enrolled"] += d.total_enrolled
            region_map[r_key]["divergence_sum"] += d.divergence_score
            for g in d.dominant_skill_gaps:
                region_map[r_key]["gaps"].add(g)

        state_aggregates: List[StateAggregateDTO] = []
        for s_name, s_val in state_map.items():
            cnt = max(1, s_val["count"])
            state_aggregates.append(
                StateAggregateDTO(
                    state=s_name,
                    districts_count=s_val["count"],
                    total_enrolled=s_val["enrolled"],
                    avg_placement_rate=round(s_val["placement_sum"] / cnt, 1),
                    avg_retention_rate=round(s_val["retention_sum"] / cnt, 1),
                    avg_divergence_score=round(s_val["divergence_sum"] / cnt, 1),
                    critical_districts_count=s_val["critical_count"],
                )
            )

        regional_clusters: List[RegionalClusterItemDTO] = []
        for _, r_val in region_map.items():
            cnt = max(1, r_val["count"])
            avg_div = round(r_val["divergence_sum"] / cnt, 1)
            risk = "High Risk" if avg_div >= 28.0 else ("Moderate Risk" if avg_div >= 18.0 else "Balanced")
            policy_action = (
                "Establish PMKK Industrial Satellite Hub & High-Tech CNC Labs"
                if avg_div >= 25.0
                else "Expand local employer hiring partnerships and SME internship linkages"
            )

            regional_clusters.append(
                RegionalClusterItemDTO(
                    region=r_val["region"],
                    state=r_val["state"],
                    districts_count=r_val["count"],
                    total_enrolled=r_val["enrolled"],
                    divergence_score=avg_div,
                    risk_level=risk,
                    primary_deficit_sectors=list(r_val["gaps"])[:3],
                    recommended_policy_action=policy_action,
                )
            )
        regional_clusters.sort(key=lambda x: x.divergence_score, reverse=True)

        summary = {
            "total_districts_analyzed": len(districts_data),
            "high_divergence_count": len(high_div),
            "aligned_count": len(aligned),
            "national_avg_divergence": (
                round(sum(d.divergence_score for d in districts_data) / len(districts_data), 1)
                if districts_data
                else 0.0
            ),
        }

        return RegionalDivergenceResponseDTO(
            summary=summary,
            high_divergence_districts=high_div,
            aligned_districts=aligned,
            state_aggregates=state_aggregates,
            regional_clusters=regional_clusters,
        )

    @classmethod
    async def get_priority_clusters(
        cls,
        db: AsyncSession,
        state: Optional[str] = None,
        region: Optional[str] = None,
        district: Optional[str] = None,
        tier: Optional[str] = None,
        limit: int = 20,
    ) -> List[PriorityClusterItemDTO]:
        """Ranks districts by composite priority score for urgent infrastructure interventions."""
        districts_data = await cls.get_districts_intelligence(
            db=db, state=state, region=region, district=district, tier=tier
        )

        ranked_items: List[PriorityClusterItemDTO] = []
        for d in districts_data:
            # Composite priority calculation
            enrolled_weight = min(25.0, (d.total_enrolled * 2.5))
            comp_score = round(
                min(100.0, (d.vulnerability_index * 0.55) + (d.divergence_score * 0.25) + enrolled_weight),
                1,
            )

            at_risk = max(
                6, round(d.total_enrolled * (d.divergence_score / 100.0)) + (12 if d.tier == "Tier 3" else 4)
            )

            bottlenecks = [
                f"Workforce supply ({d.workforce_supply_index}%) lags employer demand ({d.employer_demand_index}%)",
                f"{len(d.dominant_skill_gaps)} critical skill deficits in {', '.join(d.dominant_skill_gaps[:2])}",
            ]
            if d.active_training_centers_count < 2:
                bottlenecks.append("Under-provisioned PMKK training infrastructure")

            interventions = [
                "Establish 40-hour rapid bridge curriculum for local candidate cohorts",
                "Deploy mobile advanced technical trainer units to rural blocks",
                "Host targeted district employer matching job fairs",
            ]

            ranked_items.append(
                PriorityClusterItemDTO(
                    rank=1,
                    district_id=d.district_id,
                    district_name=d.name,
                    state=d.state,
                    region=d.region,
                    tier=d.tier,
                    composite_priority_score=comp_score,
                    divergence_score=d.divergence_score,
                    learners_at_risk=at_risk,
                    key_bottlenecks=bottlenecks,
                    recommended_interventions=interventions,
                )
            )

        ranked_items.sort(key=lambda x: x.composite_priority_score, reverse=True)
        for idx, item in enumerate(ranked_items[:limit], start=1):
            item.rank = idx

        return ranked_items[:limit]


geospatial_service = GeospatialService()
