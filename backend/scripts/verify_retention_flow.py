import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.core.database import dispose_engine


async def verify_retention_flow():
    print("=" * 80)
    print("🔍 VERIFYING PLACEMENT & LONGITUDINAL RETENTION FLOW (3M/6M/12M)")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "aman.mishra@msde.gov.in", "password": "KaushalNexus2026!"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "X-Test-Bypass-RateLimit": "1"}

        # 2. Get active mandates & employer
        mandates_res = await client.get("/api/v1/matching/mandates", headers=headers)
        assert mandates_res.status_code == 200
        mandates = mandates_res.json()
        target_mandate = mandates[0]
        employer_id = target_mandate["employer_id"]
        mandate_id = target_mandate["id"]
        print(f"🏢 Mandate Found: {target_mandate['job_title']} at {target_mandate['employer_name']}")

        # 3. Create Placement for KN-2026-01005
        test_learner_id = "KN-2026-01005"
        placement_payload = {
            "learner_id": test_learner_id,
            "employer_id": employer_id,
            "hiring_mandate_id": mandate_id,
            "job_title": target_mandate["job_title"],
            "starting_ctc_lpa": 4.5,
            "current_ctc_lpa": 4.5,
            "employment_type": "Full-time Direct",
            "joined_date": "2026-08-29",
            "uan": "101988991122",
        }

        create_res = await client.post("/api/v1/placements", json=placement_payload, headers=headers)
        assert create_res.status_code == 201, f"Placement creation failed: {create_res.text}"
        placement = create_res.json()
        placement_id = placement["id"]
        print(f"✅ Placement Created: ID={placement_id} for Learner={test_learner_id} (Starting CTC=₹{placement['starting_ctc_lpa']} LPA)")

        # 4. Fetch Learner Placements
        learner_placements_res = await client.get(f"/api/v1/placements/{test_learner_id}", headers=headers)
        assert learner_placements_res.status_code == 200
        lp_list = learner_placements_res.json()
        assert len(lp_list) >= 1
        print(f"📋 Candidate Placements Retrieved: {len(lp_list)} active records found.")

        # 5. Fetch 3M, 6M, 12M Retention Audit
        retention_res = await client.get(f"/api/v1/placements/{placement_id}/retention", headers=headers)
        assert retention_res.status_code == 200
        ret_audit = retention_res.json()
        checkpoints = ret_audit["checkpoints"]
        print(f"📊 Auto-Initialized Retention Checkpoints ({len(checkpoints)} milestones):")
        for cp in checkpoints:
            print(f"   • {cp['checkpoint_type']} ({cp['milestone_months']} Months): Date={cp['checkpoint_date']}, Active={cp['is_active_at_checkpoint']}, Wage Growth=+{cp['wage_increment_percentage']}%")

        assert len(checkpoints) == 3, f"Expected 3 checkpoints, got {len(checkpoints)}"
        assert {cp["checkpoint_type"] for cp in checkpoints} == {"3M", "6M", "12M"}

        # 6. Update 6M Checkpoint with Wage Increment (+20%)
        update_payload = {
            "is_active_at_checkpoint": True,
            "current_ctc_lpa": 5.4,
            "remarks": "Simulated mock EPFO deposit verified for 6 consecutive months.",
            "epfo_verified": True,
        }
        update_res = await client.put(f"/api/v1/placements/{placement_id}/retention/6M", json=update_payload, headers=headers)
        assert update_res.status_code == 200, f"Checkpoint update failed: {update_res.text}"
        updated_cp = update_res.json()
        print(f"🚀 Updated 6M Checkpoint: CTC=₹{updated_cp['current_ctc_lpa']} LPA, Wage Increment=+{updated_cp['wage_increment_percentage']}% (Remarks: {updated_cp['remarks']})")
        assert updated_cp["wage_increment_percentage"] == 20.0

        # 7. Check Dashboard Summary reflects changes
        dash_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        assert dash_res.status_code == 200
        dash_summary = dash_res.json()
        print(f"📈 Dashboard Live Update: Total Placed={dash_summary['total_placed']}, Retention Rate={dash_summary['retention_percentage']}%")

    await dispose_engine()
    print("=" * 80)
    print("🎉 ALL PLACEMENT & LONGITUDINAL RETENTION FLOW VERIFICATIONS PASSED!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(verify_retention_flow())
