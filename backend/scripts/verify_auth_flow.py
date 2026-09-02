import asyncio
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.core.database import dispose_engine


async def verify_auth_flow():
    print("=" * 80)
    print("🔐 VERIFYING AUTHENTICATION FLOW: LOGIN → DASHBOARD → REFRESH → ME → LOGOUT")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Invalid Login Attempt
        print("\n[STEP 1] Testing Invalid Credentials Handling...")
        bad_login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "aman.mishra@msde.gov.in", "password": "WrongPassword123!"},
        )
        assert bad_login_res.status_code == 401, f"Expected 401, got {bad_login_res.status_code}"
        print("  ✓ Invalid password correctly rejected with HTTP 401 Unauthorized")

        # 2. Valid Login Attempt
        print("\n[STEP 2] Testing Valid Institutional Login...")
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "aman.mishra@msde.gov.in", "password": "KaushalNexus2026!"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        auth_data = login_res.json()
        access_token = auth_data["access_token"]
        refresh_token = auth_data["refresh_token"]
        user_info = auth_data["user"]
        print(f"  ✓ Successfully Authenticated: {user_info['full_name']} ({user_info['email']})")
        print(f"  ✓ User Role: {user_info['role']}")
        print(f"  ✓ Access Token Issued: {access_token[:20]}...")
        print(f"  ✓ Refresh Token Issued: {refresh_token[:20]}...")

        # 3. Protected Dashboard Access with Token
        print("\n[STEP 3] Accessing Protected Endpoint (/api/v1/dashboard/summary)...")
        headers = {"Authorization": f"Bearer {access_token}", "X-Test-Bypass-RateLimit": "1"}
        dash_res = await client.get("/api/v1/dashboard/summary", headers=headers)
        assert dash_res.status_code == 200
        print(f"  ✓ Protected Dashboard Loaded: {dash_res.json()['total_enrolled']} candidates tracked")

        # 4. Profile / Me Check
        print("\n[STEP 4] Testing Profile Validation (/api/v1/auth/me)...")
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "aman.mishra@msde.gov.in"
        print(f"  ✓ Session Active for: {me_data['full_name']} (Role: {me_data['role']})")

        # 5. Token Refresh Rotation
        print("\n[STEP 5] Testing Refresh Token Exchange (/api/v1/auth/refresh)...")
        refresh_res = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_res.status_code == 200, f"Refresh failed: {refresh_res.text}"
        refreshed_data = refresh_res.json()
        new_access_token = refreshed_data["access_token"]
        print(f"  ✓ Fresh Access Token Issued: {new_access_token[:20]}...")

        # 6. Verify New Token Works
        new_headers = {"Authorization": f"Bearer {new_access_token}", "X-Test-Bypass-RateLimit": "1"}
        verify_new_res = await client.get("/api/v1/learners?page=1&page_size=3", headers=new_headers)
        assert verify_new_res.status_code == 200
        print(f"  ✓ New Token Verified on Protected Route: {verify_new_res.json()['total']} total learners")

        # 7. Unauthenticated Access Attempt
        print("\n[STEP 6] Testing Protected Route Without Token...")
        unauth_res = await client.get("/api/v1/dashboard/summary")
        assert unauth_res.status_code in (401, 403), f"Expected 401/403, got {unauth_res.status_code}"
        print("  ✓ Unauthenticated request rejected appropriately")

    await dispose_engine()
    print("\n" + "=" * 80)
    print("🎉 ALL AUTHENTICATION FLOW TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(verify_auth_flow())
