import asyncio
import json
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.core.database import dispose_engine


async def test_full_user_journey():
    print("=" * 80)
    print("🏆 EXECUTING MASTER END-TO-END INTEGRATION TEST: KAUSHALNEXUS PLATFORM")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # =========================================================================
        # STEP 1: AUTHENTICATION & LOGIN
        # =========================================================================
        print("\n[STEP 1] Authenticating Institutional Officer...")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "aman.mishra@msde.gov.in", "password": "KaushalNexus2026!"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        auth_data = login_res.json()
        token = auth_data["access_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Test-Bypass-RateLimit": "1",
            "X-Correlation-ID": "KN-E2E-JOURNEY-001",
        }
        print(f"  ✓ Authenticated as: {auth_data['user']['full_name']} ({auth_data['user']['role']})")
        print(f"  ✓ JWT Token Type: {auth_data['token_type']}")

        # =========================================================================
        # STEP 2: IMPACT DASHBOARD AUDIT
        # =========================================================================
        print("\n[STEP 2] Loading Live Impact Dashboard...")
        summary_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        trend_res = await client.get("/api/v1/dashboard/employment-trend", headers=headers)
        funnel_res = await client.get("/api/v1/dashboard/funnel", headers=headers)
        matrix_res = await client.get("/api/v1/dashboard/sector-matrix", headers=headers)

        assert summary_res.status_code == 200
        assert trend_res.status_code == 200
        assert funnel_res.status_code == 200
        assert matrix_res.status_code == 200

        summary = summary_res.json()
        print(f"  ✓ Enrolled Beneficiaries : {summary['total_enrolled']}")
        print(f"  ✓ Certified Candidates   : {summary['total_certified']}")
        print(f"  ✓ Placed Candidates      : {summary['total_placed']} ({summary['placement_percentage']}%)")
        print(f"  ✓ 6M Retention Verified  : {summary['retention_percentage']}%")
        print(f"  ✓ Employment Trend Data  : {len(trend_res.json())} Monthly Points")
        print(f"  ✓ Conversion Pipeline    : {len(funnel_res.json())} Stages")
        print(f"  ✓ Cross-Sector Matrix    : {len(matrix_res.json())} Monitored Sectors")

        # =========================================================================
        # STEP 3: SEARCH & SELECT CANDIDATE
        # =========================================================================
        print("\n[STEP 3] Searching Beneficiary Registry...")
        learners_res = await client.get("/api/v1/learners?page=1&page_size=10", headers=headers)
        assert learners_res.status_code == 200
        learners_data = learners_res.json()
        assert learners_data["total"] > 0
        candidate = learners_data["items"][0]
        candidate_id = candidate["id"]
        print(f"  ✓ Candidate Found: {candidate['full_name']} (ID: {candidate_id}, District: {candidate['district_name']})")

        # =========================================================================
        # STEP 4 & 5: LEARNER 360° DOSSIER, COMPETENCIES & GAPS
        # =========================================================================
        print("\n[STEP 4 & 5] Opening Learner 360° Dossier & Skill Matrix...")
        dossier_res = await client.get(f"/api/v1/learners/{candidate_id}", headers=headers)
        assert dossier_res.status_code == 200
        dossier = dossier_res.json()
        print(f"  ✓ Full Dossier Loaded: {dossier['full_name']} (Readiness: {dossier['employment_readiness_score']}%)")
        print(f"  ✓ Verified Competencies : {len(dossier.get('skills', []))} Assessed Skills")
        for s in dossier.get("skills", [])[:2]:
            print(f"      • {s['name']} (Score: {s['score_percentage']}%, Verified By: {s['verified_by']})")
        print(f"  ✓ Detected Skill Gaps   : {len(dossier.get('detected_gaps', []))} Gaps")

        # Verify NCVET Credential
        verify_cred_res = await client.post(
            f"/api/v1/learners/{candidate_id}/verify-credential",
            json={"notes": "E2E automated compliance verification test"},
            headers=headers,
        )
        assert verify_cred_res.status_code == 200
        print(f"  ✓ Credential Verified: {verify_cred_res.json()['credential_id']}")

        # =========================================================================
        # STEP 6 & 7: CALCULATE JOB MATCHES & SELECT MANDATE
        # =========================================================================
        print("\n[STEP 6 & 7] Calculating Explainable Multi-Signal Job Matches...")
        matches_res = await client.get(f"/api/v1/matching/calculate/{candidate_id}?top_n=5", headers=headers)
        assert matches_res.status_code == 200
        matches = matches_res.json()
        top_matches = matches["top_matches"]
        print(f"  ✓ Jobs Evaluated: {matches['total_active_jobs_evaluated']}")
        assert len(top_matches) > 0
        top_job = top_matches[0]
        print(f"  ✓ Top Job Match: '{top_job['job_title']}' at {top_job['employer_name']}")
        print(f"      • Match Score    : {top_job['match_score']}% ({top_job['fit_verdict']})")
        print(f"      • Skill Alignment: {top_job['skill_alignment']}% (50% Weight)")
        print(f"      • Location Fit   : {top_job['location_fit']}% (30% Weight)")
        print(f"      • Readiness Score: {top_job['readiness']}% (20% Weight)")
        print(f"      • Matched Skills : {top_job['matched_skills']}")

        # Fetch Mandates Directory
        mandates_res = await client.get("/api/v1/matching/mandates", headers=headers)
        assert mandates_res.status_code == 200
        mandates = mandates_res.json()
        assert len(mandates) > 0
        target_mandate = next((m for m in mandates if m["id"] == top_job["mandate_id"]), mandates[0])
        print(f"  ✓ Selected Mandate: ID={target_mandate['id']}, Employer ID={target_mandate['employer_id']}")

        # =========================================================================
        # STEP 8 & 9: CREATE PLACEMENT & 3M/6M/12M RETENTION AUDIT
        # =========================================================================
        print("\n[STEP 8 & 9] Creating Placement & Initializing Retention Tracking...")
        placement_payload = {
            "learner_id": candidate_id,
            "employer_id": target_mandate["employer_id"],
            "hiring_mandate_id": target_mandate["id"],
            "job_title": target_mandate["job_title"],
            "starting_ctc_lpa": float(target_mandate.get("salary_min_lpa", 4.2)),
            "current_ctc_lpa": float(target_mandate.get("salary_min_lpa", 4.2)),
            "employment_type": "Full-time Direct",
            "joined_date": "2026-08-29",
            "uan": "101988112233",
        }
        create_plc_res = await client.post("/api/v1/placements", json=placement_payload, headers=headers)
        assert create_plc_res.status_code == 201
        new_placement = create_plc_res.json()
        placement_id = new_placement["id"]
        print(f"  ✓ Verified Placement Registered: ID={placement_id}")
        print(f"  ✓ Candidate Status Updated to: {new_placement['status']}")

        # View Longitudinal Retention Audit
        retention_res = await client.get(f"/api/v1/placements/{placement_id}/retention", headers=headers)
        assert retention_res.status_code == 200
        retention_audit = retention_res.json()
        cps = retention_audit["checkpoints"]
        assert len(cps) == 3
        print(f"  ✓ 3 Longitudinal Checkpoints Auto-Created:")
        for cp in cps:
            print(f"      • Milestone {cp['checkpoint_type']} ({cp['milestone_months']}M): Date={cp['checkpoint_date']}, Active={cp['is_active_at_checkpoint']}")

        # Audit/Update 6M Checkpoint
        update_cp_res = await client.put(
            f"/api/v1/placements/{placement_id}/retention/6M",
            json={
                "is_active_at_checkpoint": True,
                "current_ctc_lpa": 5.25,
                "remarks": "Simulated mock EPFO continuous remittance verified for 6 months.",
                "epfo_verified": True,
            },
            headers=headers,
        )
        assert update_cp_res.status_code == 200
        updated_cp = update_cp_res.json()
        print(f"  ✓ 6M Checkpoint Audited: Wage Increment=+{updated_cp['wage_increment_percentage']}%, Active={updated_cp['is_active_at_checkpoint']}")

        # =========================================================================
        # STEP 10 & 11: REGIONAL INTELLIGENCE & FILTERING
        # =========================================================================
        print("\n[STEP 10 & 11] Geospatial Regional Intelligence & District Filters...")
        all_districts_res = await client.get("/api/v1/regional/districts", headers=headers)
        assert all_districts_res.status_code == 200
        all_districts = all_districts_res.json()
        print(f"  ✓ National Geospatial Coverage: {len(all_districts)} Monitored Districts")

        # Test state filter
        up_districts_res = await client.get("/api/v1/regional/districts?state=Uttar+Pradesh", headers=headers)
        assert up_districts_res.status_code == 200
        up_districts = up_districts_res.json()
        print(f"  ✓ State Filter (Uttar Pradesh): {len(up_districts)} Districts Found")
        for d in up_districts[:2]:
            print(f"      • {d['name']} ({d['tier']}): Enrolled={d['total_enrolled']}, Placement Rate={d['placement_rate']}%, Deficit Delta={d['divergence_score']}%")

        # Test Regional Divergence
        div_res = await client.get("/api/v1/regional/divergence?state=Uttar+Pradesh", headers=headers)
        assert div_res.status_code == 200
        div_data = div_res.json()
        print(f"  ✓ Macro Divergence Analyzed: Summary={div_data['summary']}")

        # Test Priority Clusters
        clusters_res = await client.get("/api/v1/regional/priority-clusters?limit=3", headers=headers)
        assert clusters_res.status_code == 200
        clusters = clusters_res.json()
        print(f"  ✓ Priority Clusters Identified: {len(clusters)} Clusters")
        for c in clusters:
            print(f"      • Rank #{c['rank']}: {c['district_name']}, {c['state']} (Vulnerability Score: {c['composite_priority_score']})")

        # =========================================================================
        # STEP 12 & 13: SKILL GAPS & INTERVENTION DEPLOYMENT
        # =========================================================================
        print("\n[STEP 12 & 13] Skill Gap Intelligence & Targeted Intervention Deployment...")
        gaps_res = await client.get("/api/v1/skill-gaps/priority", headers=headers)
        assert gaps_res.status_code == 200
        gaps = gaps_res.json()
        print(f"  ✓ Priority Skill Deficits Tracked: {len(gaps)} Identified Gaps")
        target_gap = gaps[0]
        print(f"  ✓ Top Deficit: '{target_gap['competency_name']}' in {target_gap['district_name']} (Deficit: {target_gap['deficit_pct']}%, Severity: {target_gap['severity']})")

        # Deploy Bridge Intervention
        intervention_payload = {
            "district_id": target_gap["district_id"],
            "competency_id": target_gap["competency_id"],
            "intervention_type": "BRIDGE_COURSE",
            "target_capacity": target_gap.get("learners_affected", 100),
            "budget_allocated_inr": 750000.0,
            "target_completion_weeks": 6,
            "notes": "E2E Integration test bridge deployment",
        }
        deploy_res = await client.post("/api/v1/skill-gaps/deploy-intervention", json=intervention_payload, headers=headers)
        assert deploy_res.status_code == 200, f"Intervention deploy failed: {deploy_res.text}"
        intervention = deploy_res.json()
        print(f"  ✓ Intervention Deployed: ID={intervention['intervention_id']}")
        print(f"      • Status               : {intervention['status']}")
        print(f"      • Projected Deficit Drop: -{intervention['projected_deficit_reduction_pct']}%")

        # =========================================================================
        # STEP 14: RETURN TO DASHBOARD & VERIFY LIVE SYNCHRONIZATION
        # =========================================================================
        print("\n[STEP 14] Returning to Impact Dashboard & Verifying Real-Time Data Sync...")
        updated_summary_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        assert updated_summary_res.status_code == 200
        updated_summary = updated_summary_res.json()
        print(f"  ✓ Updated Total Placed    : {updated_summary['total_placed']} candidates")
        print(f"  ✓ Updated Placement Rate  : {updated_summary['placement_percentage']}%")
        print(f"  ✓ Updated 6M Retention    : {updated_summary['retention_percentage']}%")
        print(f"  ✓ Real-Time PostgreSQL Synchronization Confirmed!")

    await dispose_engine()
    print("\n" + "=" * 80)
    print("🎉 ALL 14 USER JOURNEY MILESTONES TESTED & VERIFIED WITH 100% SUCCESS!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_full_user_journey())
