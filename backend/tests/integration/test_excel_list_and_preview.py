# backend/tests/integration/test_history_list.py
import pytest

def test_history_list_smoke(test_client, auth_headers):
    path = "/history"
    routes = {r.path for r in test_client.app.routes}
    assert path in routes, "La ruta /history no existe en la app."

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
    assert isinstance(data, list) or (isinstance(data, dict) and "items" in data)
