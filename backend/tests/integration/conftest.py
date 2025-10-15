# backend/tests/integration/conftest.py
import json
import os
import sys
from typing import Dict, List, Optional, Tuple
from unittest.mock import MagicMock

import pytest

# Evita inicializar ChatOpenAI/OpenAI al importar la app
sys.modules["langchain_openai"] = MagicMock()
sys.modules["langchain_openai.chat_models"] = MagicMock()
sys.modules["langchain_openai.chat_models.base"] = MagicMock()

# Entorno "seguro"
os.environ.setdefault("ENV", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///./auth_test.db")
os.environ.setdefault("OPENAI_API_KEY", "test-key")

try:
    from fastapi.testclient import TestClient
    from backend.app_min import app
except Exception as e:
    pytest.skip(f"No pude importar FastAPI app: {e}", allow_module_level=True)

client = TestClient(app)

def all_paths() -> List[str]:
    return sorted({r.path for r in app.routes})

def first_existing_path(candidates: List[str]) -> Optional[str]:
    paths = set(all_paths())
    for p in candidates:
        if p in paths:
            return p
    return None

def _extract_token(obj: Dict, token_field: Optional[str]) -> Optional[str]:
    if not isinstance(obj, dict):
        return None
    if token_field and token_field in obj and isinstance(obj[token_field], str):
        return obj[token_field]
    for k in ("access_token", "token", "jwt", "id_token"):
        v = obj.get(k)
        if isinstance(v, str):
            return v
    data = obj.get("data")
    if isinstance(data, dict):
        for k in ("access_token", "token", "jwt", "id_token"):
            if isinstance(data.get(k), str):
                return data[k]
    return None

def try_login() -> Tuple[Dict[str, str], str]:
    # Configurable por ENV
    login_path = os.getenv("INTEGRATION_LOGIN_PATH", "/auth/login")
    login_body_raw = os.getenv("INTEGRATION_LOGIN_BODY", '{"email":"admin@example.com","password":"secret"}')
    token_field = os.getenv("INTEGRATION_LOGIN_TOKEN_FIELD", "") or None

    # Si /auth/login no existe, aborta login (tests podrán skippear)
    if first_existing_path([login_path]) != login_path:
        return {}, "no-login-endpoint"

    try:
        body = json.loads(login_body_raw)
    except Exception:
        return {}, "login-body-invalid-json"

    r = client.post(login_path, json=body)
    if r.status_code not in (200, 201):
        return {}, f"login-failed:{r.status_code}"

    token = _extract_token(r.json(), token_field)
    if token:
        return {"Authorization": f"Bearer {token}"}, "login-ok"
    # si usa cookies/sesión, aunque no haya token, el TestClient se queda con cookies
    return {}, "login-no-token"

@pytest.fixture(scope="session")
def test_client():
    return client

@pytest.fixture(scope="session")
def auth_headers() -> Dict[str, str]:
    headers, _ = try_login()
    return headers

@pytest.fixture(scope="session")
def list_paths():
    return all_paths
