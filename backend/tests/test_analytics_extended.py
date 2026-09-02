import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_dashboard_extended_analytics_endpoints(
    client: AsyncClient,
    db: AsyncSession,
    auth_headers_msde: dict,
):
    """Verifies all new longitudinal outcome and impact measurement endpoints."""
    # 1. Multi-Track Outcome Distribution
    resp_outcomes = await client.get(
        "/api/v1/dashboard/outcomes",
        headers=auth_headers_msde,
    )
    assert resp_outcomes.status_code == 200
    outcomes_data = resp_outcomes.json()
    assert "employed_rate" in outcomes_data
    assert "self_employed_rate" in outcomes_data
    assert "apprenticeship_rate" in outcomes_data
    assert "unemployed_rate" in outcomes_data

    # 2. Longitudinal Follow-Up Performance Metrics
    resp_fu = await client.get(
        "/api/v1/dashboard/follow-ups",
        headers=auth_headers_msde,
    )
    assert resp_fu.status_code == 200
    fu_data = resp_fu.json()
    assert "completion_rate" in fu_data
    assert "pending_count" in fu_data
    assert "channel_breakdown" in fu_data

    # 3. Non-Placement Diagnostic Factors & Skill Gap Proportions
    resp_nonplc = await client.get(
        "/api/v1/dashboard/non-placement",
        headers=auth_headers_msde,
    )
    assert resp_nonplc.status_code == 200
    nonplc_data = resp_nonplc.json()
    assert "top_reasons" in nonplc_data
    assert "skill_gap_percentage" in nonplc_data
    assert len(nonplc_data["top_reasons"]) > 0

    # 4. Attrition & Retention Milestone Metrics
    resp_att = await client.get(
        "/api/v1/dashboard/attrition",
        headers=auth_headers_msde,
    )
    assert resp_att.status_code == 200
    att_data = resp_att.json()
    assert "three_month_retention_rate" in att_data
    assert "six_month_retention_rate" in att_data
    assert "twelve_month_retention_rate" in att_data
    assert "top_reasons" in att_data

    # 5. Self-Employment & Micro-Enterprise Analytics
    resp_self = await client.get(
        "/api/v1/dashboard/self-employment",
        headers=auth_headers_msde,
    )
    assert resp_self.status_code == 200
    self_data = resp_self.json()
    assert "self_employment_rate" in self_data
    assert "verification_rate" in self_data
    assert "sector_breakdown" in self_data

    # 6. Wage Progression & Growth Trajectory
    resp_wages = await client.get(
        "/api/v1/dashboard/wages",
        headers=auth_headers_msde,
    )
    assert resp_wages.status_code == 200
    wages_data = resp_wages.json()
    assert "avg_starting_ctc_lpa" in wages_data
    assert "avg_current_ctc_lpa" in wages_data
    assert "avg_wage_growth_pct" in wages_data

    # 7. AI & Skill Gap Associative Outcome Correlations
    resp_corr = await client.get(
        "/api/v1/skill-gaps/outcome-correlations",
        headers=auth_headers_msde,
    )
    assert resp_corr.status_code == 200
    corr_data = resp_corr.json()
    assert "correlations" in corr_data
    assert len(corr_data["correlations"]) >= 3
    assert "epistemic_disclaimer" in corr_data

    # 8. Celery Follow-Up Dispatch Task Trigger
    resp_task = await client.post(
        "/api/v1/tasks/process-followups",
        headers=auth_headers_msde,
        params={"batch_limit": 10},
    )
    assert resp_task.status_code == 202
    task_res = resp_task.json()
    assert task_res["status"] == "QUEUED"
    assert "task_id" in task_res
