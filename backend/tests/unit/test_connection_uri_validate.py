# backend/tests/unit/test_connection_uri_validate.py
from backend.core.connections import validate_sqlalchemy_uri

def test_rejects_unallowed_schemes():
    assert not validate_sqlalchemy_uri("file:///etc/passwd")
    assert validate_sqlalchemy_uri("mysql+pymysql://user:pass@host:3306/db")
