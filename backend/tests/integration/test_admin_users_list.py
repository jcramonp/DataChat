# backend/tests/integration/test_admin_users_list.py
import pytest
from httpx import AsyncClient
from backend.app_min import app

@pytest.mark.asyncio
async def test_admin_can_list_users(admin_token):
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list)
    assert {"id", "email"} <= users[0].keys()

@pytest.mark.asyncio
async def test_non_admin_forbidden(user_token):
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/admin/users", headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code in (401, 403)
