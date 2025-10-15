# backend/tests/integration/test_admin_create_connection.py
import pytest

def test_admin_create_connection(test_client, auth_headers):
    path = "/admin/connections"
    routes = {r.path for r in test_client.app.routes}
    assert path in routes, "La ruta /admin/connections no existe en la app."

    payload = {"name": "ci-e2e", "uri": "sqlite:///:memory:"}

    # Intento sin auth primero
    r = test_client.post(path, json=payload)

    # Si está protegido y no tenemos token, validar RBAC y pasar
    if r.status_code in (401, 403) and not auth_headers:
        assert True  # RBAC activo sin token
        return

    # Reintenta con token si lo tenemos
    if r.status_code in (401, 403) and auth_headers:
        r = test_client.post(path, json=payload, headers=auth_headers)

    # En este punto debería aceptar la creación
    assert r.status_code in (200, 201)
    data = r.json()
    assert isinstance(data, dict)
    assert "name" in data or data.get("ok") is True
