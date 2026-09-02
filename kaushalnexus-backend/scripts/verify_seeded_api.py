import asyncio
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.core.database import dispose_engine


async def verify_endpoints():
    print("=" * 80)
    print("🔍 VERIFYING SEEDED DATA VIA FASTAPI ENDPOINTS")
    print("=" * 80)
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login as MSDE Officer
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "aman.mishra@msde.gov.in", "password": "KaushalNexus2026!"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        tokens = login_res.json()
        token = tokens["access_token"]
        headers = {"Authorization": f"Bearer {token}", "X-Test-Bypass-RateLimit": "1"}
        print(f"✅ Auth Login: Success (Actor: {tokens['user']['full_name']}, Role: {tokens['user']['role']})")

        # 2. Dashboard Summary
        dash_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        assert dash_res.status_code == 200, f"Dashboard summary failed: {dash_res.text}"
        dash_data = dash_res.json()
        print(f"✅ Dashboard Summary: Enrolled={dash_data['total_enrolled']}, Placed={dash_data['total_placed']}, Retention Rate={dash_data['retention_percentage']}%")

        # 3. Dashboard Funnel
        funnel_res = await client.get("/api/v1/dashboard/funnel", headers=headers)
        assert funnel_res.status_code == 200
        funnel_data = funnel_res.json()
        print(f"✅ Dashboard Funnel: {len(funnel_data)} stages loaded (Top: {funnel_data[0]['stage']} -> {funnel_data[0]['count']})")

        # 4. Learners Registry & Search
        learners_res = await client.get("/api/v1/learners?page_size=5", headers=headers)
        assert learners_res.status_code == 200
        learners_data = learners_res.json()
        sample_learner = learners_data["items"][0]
        print(f"✅ Learners Registry: {learners_data['total']} total learners found. Sample: {sample_learner['full_name']} ({sample_learner['id']}) - {sample_learner['status']}")

        # 5. Candidate 360 Dossier
        l360_res = await client.get(f"/api/v1/learners/{sample_learner['id']}", headers=headers)
        assert l360_res.status_code == 200
        l360_data = l360_res.json()
        print(f"✅ Candidate 360: Loaded dossier for {l360_data['full_name']} with {len(l360_data['skills'])} verified skills and readiness={l360_data['employment_readiness_score']}%")

        # 6. Regional Intelligence & Districts
        districts_res = await client.get("/api/v1/regional/districts", headers=headers)
        assert districts_res.status_code == 200
        districts_data = districts_res.json()
        print(f"✅ Regional Intelligence: {len(districts_data)} monitored districts loaded across multiple states")

        # 7. Priority Skill Gaps
        gaps_res = await client.get("/api/v1/skill-gaps/priority", headers=headers)
        assert gaps_res.status_code == 200
        gaps_data = gaps_res.json()
        print(f"✅ Skill Gap Ranking: {len(gaps_data)} critical deficits ranked. Top deficit: {gaps_data[0]['competency_name']} in {gaps_data[0]['district_name']} ({gaps_data[0]['deficit_pct']}%)")

        # 8. Employer Hiring Mandates & Matching
        mandates_res = await client.get("/api/v1/matching/mandates", headers=headers)
        assert mandates_res.status_code == 200
        mandates_data = mandates_res.json()
        print(f"✅ Employer Matching: {len(mandates_data)} active mandates loaded across industry partners")

        # 9. Matching Calculation for Sample Candidate
        match_res = await client.get(f"/api/v1/matching/calculate/{sample_learner['id']}?top_n=3", headers=headers)
        assert match_res.status_code == 200
        match_data = match_res.json()
        print(f"✅ AI Matching Engine: Computed {len(match_data['top_matches'])} ranked job matches for {sample_learner['full_name']} (Top Match: {match_data['top_matches'][0]['job_title']} at {match_data['top_matches'][0]['employer_name']} - Score: {match_data['top_matches'][0]['match_score']}%)")

        # 10. Audit Logs
        audit_res = await client.get("/api/v1/audit/logs?limit=5", headers=headers)
        assert audit_res.status_code == 200
        audit_data = audit_res.json()
        print(f"✅ Immutable Audit Trail: {audit_data['total']} audit records retrieved")

    await dispose_engine()
    print("=" * 80)
    print("🎉 ALL VERIFICATIONS PASSED WITH POPULATED LIVE DATA!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(verify_endpoints())
