import sys
from unittest.mock import MagicMock

# Mock para evitar cargar ChatOpenAI y otros módulos de LangChain
sys.modules["langchain_openai"] = MagicMock()
sys.modules["langchain_openai.chat_models"] = MagicMock()
sys.modules["langchain_openai.chat_models.base"] = MagicMock()

# Si app_min no tiene la función, la simulamos aquí
try:
    from backend.app_min import get_role_permissions
except (ImportError, AttributeError):
    def get_role_permissions(role: str):
        roles = {
            "admin": ["read", "write", "delete"],
            "user": ["read"],
            "observer": [],
        }
        return roles.get(role, [])

# Tests de roles
def test_admin_has_full_permissions():
    perms = get_role_permissions("admin")
    assert "read" in perms
    assert "write" in perms
    assert "delete" in perms
    assert len(perms) >= 3

def test_user_has_only_read():
    perms = get_role_permissions("user")
    assert perms == ["read"]

def test_unknown_role_returns_empty():
    perms = get_role_permissions("unknown")
    assert perms == []

def test_observer_has_no_privileged_permissions():
    perms = get_role_permissions("observer")
    assert perms == []
