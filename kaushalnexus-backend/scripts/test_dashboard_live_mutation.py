import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from src.main import app
from src.core.database import AsyncSessionLocal, dispose_engine
from src.models.learner import Learner


async def test_dashboard_live_mutation():
    print("=" * 80)
    print("🧪 VERIFYING LIVE DATABASE MUTATIONS REFLECT IN DASHBOARD API")
    print("=" * 80)
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "aman.mishra@msde.gov.in", "password": "KaushalNexus2026!"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "X-Test-Bypass-RateLimit": "1"}

        # 2. Get baseline dashboard summary
        base_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        assert base_res.status_code == 200
        base_summary = base_res.json()
        base_enrolled = base_summary["total_enrolled"]
        base_placed = base_summary["total_placed"]
        print(f"📊 Baseline Dashboard: Enrolled={base_enrolled}, Placed={base_placed}")

        # 3. Direct DB mutation: Insert 5 new enrolled & placed candidates
        test_ids = [f"KN-TEST-MUTATION-{i}" for i in range(5)]
        async with AsyncSessionLocal() as session:
            for tid in test_ids:
                l = Learner(
                    id=tid,
                    full_name=f"Mutation Test Candidate {tid}",
                    email=f"{tid.lower()}@test.in",
                    phone="+91-99999-88888",
                    district_id="UP-VARANASI",
                    status="Placed & Verified",
                    employment_readiness_score=95,
                    overall_progress=100,
                    ncvet_credential_id=f"NCVET-TEST-{tid}",
                )
                session.add(l)
            await session.commit()
        print(f"➕ Inserted 5 new candidate records with 'Placed & Verified' status directly into PostgreSQL.")

        # 4. Fetch updated dashboard summary
        updated_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        assert updated_res.status_code == 200
        updated_summary = updated_res.json()
        new_enrolled = updated_summary["total_enrolled"]
        new_placed = updated_summary["total_placed"]
        print(f"📈 Mutated Dashboard: Enrolled={new_enrolled} (+{new_enrolled - base_enrolled}), Placed={new_placed} (+{new_placed - base_placed})")

        assert new_enrolled == base_enrolled + 5, f"Expected {base_enrolled + 5}, got {new_enrolled}"
        assert new_placed == base_placed + 5, f"Expected {base_placed + 5}, got {new_placed}"
        print("✅ Live Mutation Verification: Dashboard reflects PostgreSQL database changes immediately in real time!")

        # 5. Clean up mutation records
        async with AsyncSessionLocal() as session:
            await session.execute(delete(Learner).where(Learner.id.in_(test_ids)))
            await session.commit()
        print(f"🧹 Cleaned up temporary test records from PostgreSQL.")

        # 6. Re-verify restoration
        final_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        assert final_res.status_code == 200
        final_summary = final_res.json()
        assert final_summary["total_enrolled"] == base_enrolled
        print(f"🔄 Restored Baseline: Enrolled={final_summary['total_enrolled']}, Placed={final_summary['total_placed']}")

    await dispose_engine()
    print("=" * 80)
    print("🎉 ALL LIVE MUTATION VERIFICATIONS SUCCESSFUL!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_dashboard_live_mutation())
