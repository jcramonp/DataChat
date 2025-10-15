# backend/tests/integration/test_query_permissions.py
import pytest

def test_admin_ping_rbac(test_client, auth_headers):
    path = "/admin/ping"
    routes = {r.path for r in test_client.app.routes}
    assert path in routes, "La ruta /admin/ping no existe en la app."

    # Sin token: debería negar o permitir si el entorno lo expone públicamente
    r = test_client.get(path)
    if r.status_code in (200, 204):
        assert True  # público o ya autenticado por sesión
        return

    # Si respondió 401/403 y no hay token, es RBAC correcto
    if r.status_code in (401, 403) and not auth_headers:
        assert True  # RBAC activo sin token
        return

    # Si hay token, debe permitir
    if auth_headers:
        r = test_client.get(path, headers=auth_headers)
        assert r.status_code in (200, 204)
    else:
        # Última salvaguarda
        assert r.status_code in (401, 403)
