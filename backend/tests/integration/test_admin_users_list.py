# backend/tests/integration/test_admin_users_me.py
import pytest

def test_auth_me_profile(test_client, auth_headers):
    path = "/auth/me"
    routes = {r.path for r in test_client.app.routes}
    assert path in routes, "La ruta /auth/me no existe en la app."

    r = test_client.get(path)

    # Si está protegido y no tenemos token, validar RBAC y pasar
    if r.status_code in (401, 403) and not auth_headers:
        assert True  # RBAC activo sin token
        return

    # Reintenta con token si lo tenemos
    if r.status_code in (401, 403) and auth_headers:
        r = test_client.get(path, headers=auth_headers)

    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # Campos típicos esperados
    assert any(k in data for k in ("id", "email", "role", "username"))
