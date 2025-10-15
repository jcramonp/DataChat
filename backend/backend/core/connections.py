# Intenta reusar la implementación real si existe en app_min.py
try:
    from ...app_min import validate_sqlalchemy_uri  # type: ignore[attr-defined]
except Exception:
    from typing import Set

    _ALLOWED_SCHEMES: Set[str] = {
        # Postgres
        "postgresql",
        "postgresql+psycopg",
        "postgresql+psycopg2",
        # MySQL
        "mysql",
        "mysql+pymysql",
        # SQL Server
        "mssql+pyodbc",
        "mssql+pymssql",
        # Oracle
        "oracle+cx_oracle",
        # SQLite (solo en memoria por seguridad)
        "sqlite",
        "sqlite+pysqlite",
    }

    def _get_scheme(uri: str) -> str:
        # Obtiene el prefijo antes de ://
        idx = uri.find("://")
        return uri[:idx].lower() if idx > 0 else ""

    def validate_sqlalchemy_uri(uri: str) -> bool:  # type: ignore[no-redef]
        """
        Valida de forma conservadora URIs SQLAlchemy.
        - Rechaza esquemas peligrosos como file://
        - Permite solo una lista blanca de drivers
        - Para sqlite, solo permite sqlite:///:memory:
        """
        if not isinstance(uri, str):
            return False
        uri = uri.strip()
        if "://" not in uri:
            return False

        scheme = _get_scheme(uri)

        # Bloquear explícitamente file:// y variantes
        if scheme.startswith("file"):
            return False

        # Debe estar en la whitelist
        if scheme not in _ALLOWED_SCHEMES:
            return False

        # Regla especial para sqlite: permitir solo memoria
        if scheme.startswith("sqlite"):
            # Aceptar únicamente sqlite:///:memory:
            return uri.lower().startswith("sqlite:///:memory:")

        # Para los demás esquemas, con whitelist alcanza
        return True

__all__ = ["validate_sqlalchemy_uri"]
