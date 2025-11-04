from __future__ import annotations
import uuid

import os, json, re, unicodedata
from typing import Any, Dict, List, Optional, Tuple, Literal, Union, Annotated
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import sqlite3
import os, shutil, pathlib

from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi import FastAPI, Depends, HTTPException, status, Path, UploadFile, File, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

import jwt
from jwt import PyJWTError

from sqlalchemy import Column, String, Boolean, create_engine, text, inspect, Integer, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.sql import func
from sqlalchemy.engine import Engine

import pandas as pd
from dotenv import load_dotenv
from passlib.context import CryptContext
from fastapi import Query
import openpyxl
from time import time
import math









#arreglo

# --- INICIO: forzar FFmpeg en PATH (Windows) ---
import os, shutil

# Cambia esta ruta si tu ffmpeg está en otro sitio
_FFMPEG_DIR = r"C:\FFmpeg\bin"

if os.name == "nt" and os.path.isdir(_FFMPEG_DIR):
    # prepend para asegurar que se use tu build
    os.environ["PATH"] = _FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")
    os.environ.setdefault("FFMPEG_PATH",  os.path.join(_FFMPEG_DIR, "ffmpeg.exe"))
    os.environ.setdefault("FFPROBE_PATH", os.path.join(_FFMPEG_DIR, "ffprobe.exe"))
    print("[ffmpeg] using:", shutil.which("ffmpeg"))
else:
    print("[ffmpeg] WARNING: expected dir not found:", _FFMPEG_DIR)
# --- FIN: forzar FFmpeg en PATH ---



from routers import asr



# ========= HistoryStore (inlined) =========
class HistoryStore:
    def __init__(self, db_path: str = "./backend/history.db") -> None:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db_path = db_path
        self._ensure_schema()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._conn() as cx:
            # tabla base (si no existe)
            cx.execute(
                """
                CREATE TABLE IF NOT EXISTS query_history (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT NOT NULL,
                  question TEXT NOT NULL,
                  datasource_json TEXT NOT NULL,
                  generated_type TEXT NOT NULL,
                  generated_code TEXT NOT NULL,
                  row_count INTEGER NOT NULL,
                  created_at TEXT NOT NULL
                )
                """
            )
            # 👇 migración suave: agregar answer_text si falta
            cols = [r["name"] for r in cx.execute("PRAGMA table_info(query_history)")]
            if "answer_text" not in cols:
                cx.execute("ALTER TABLE query_history ADD COLUMN answer_text TEXT NOT NULL DEFAULT ''")

    def add(
        self,
        *,
        user_id: str,
        question: str,
        datasource: Dict[str, Any],
        generated: Dict[str, Any],
        row_count: int,
        answer_text: str = "",
        created_at: Optional[str] = None,
    ) -> int:
        if created_at is None:
            created_at = datetime.now(timezone.utc).isoformat()
        with self._conn() as cx:
            cur = cx.execute(
                """
                INSERT INTO query_history
                  (user_id, question, datasource_json, generated_type, generated_code, row_count, created_at, answer_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    question,
                    json.dumps(datasource, ensure_ascii=False),
                    str(generated.get("type", "")),
                    str(generated.get("code", "")),
                    int(row_count),
                    created_at,
                    answer_text or "",
                ),
            )
            return int(cur.lastrowid)

    def list(
        self, *, user_id: str, limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        with self._conn() as cx:
            rows = cx.execute(
                """
                SELECT id, user_id, question, datasource_json, generated_type, generated_code, row_count, created_at, answer_text
                FROM query_history
                WHERE user_id = ?
                ORDER BY datetime(created_at) DESC
                LIMIT ? OFFSET ?
                """,
                (user_id, limit, offset),
            ).fetchall()
            out: List[Dict[str, Any]] = []
            for r in rows:
                out.append(
                    {
                        "id": r["id"],
                        "user_id": r["user_id"],
                        "question": r["question"],
                        "datasource": json.loads(r["datasource_json"]),
                        "generated": {
                            "type": r["generated_type"],
                            "code": r["generated_code"],
                        },
                        "row_count": r["row_count"],
                        "created_at": r["created_at"],
                        "answer_text": r["answer_text"],
                    }
                )
            return out

    def clear(self, *, user_id: str) -> int:
        with self._conn() as cx:
            cur = cx.execute("DELETE FROM query_history WHERE user_id = ?", (user_id,))
            return int(cur.rowcount)

    # (si ya agregaste count() antes)
    def count(self, *, user_id: str) -> int:
        with self._conn() as cx:
            row = cx.execute(
                "SELECT COUNT(*) AS c FROM query_history WHERE user_id = ?", (user_id,)
            ).fetchone()
            return int(row["c"]) if row else 0


# ========= ActivityLogStore =========
class ActivityLogStore:
    def __init__(self, db_path: str = "./backend/history.db") -> None:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db_path = db_path
        self._ensure_schema()

    def _conn(self) -> sqlite3.Connection:
        cx = sqlite3.connect(self.db_path)
        cx.row_factory = sqlite3.Row
        return cx

    def _ensure_schema(self):
        with self._conn() as cx:
            cx.execute("""
            CREATE TABLE IF NOT EXISTS activity_log(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              ts TEXT NOT NULL,
              level TEXT NOT NULL,        -- info|warning|error
              actor TEXT,                 -- email o 'system'
              action TEXT NOT NULL,       -- login, query, connection_create, error, etc.
              path TEXT,                  -- request.path si aplica
              meta_json TEXT NOT NULL     -- detalles (json)
            )
            """)
            cx.execute("CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(ts DESC)")
            cx.execute("CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action)")
            cx.execute("CREATE INDEX IF NOT EXISTS idx_activity_level ON activity_log(level)")

    def add(self, *, level: str, action: str, actor: str|None, path: str|None, meta: dict|None=None):
        with self._conn() as cx:
            cx.execute("""
              INSERT INTO activity_log(ts, level, actor, action, path, meta_json)
              VALUES (?, ?, ?, ?, ?, ?)
            """, (
                datetime.now(timezone.utc).isoformat(),
                level,
                actor or "",
                action,
                path or "",
                json.dumps(meta or {}, ensure_ascii=False)
            ))

    def list(self, *, limit:int=100, offset:int=0, level:str|None=None, action:str|None=None, q:str|None=None):
        sql = "SELECT id, ts, level, actor, action, path, meta_json FROM activity_log"
        conds, args = [], []
        if level:
            conds.append("level = ?"); args.append(level)
        if action:
            conds.append("action = ?"); args.append(action)
        if q:
            conds.append("(actor LIKE ? OR path LIKE ? OR meta_json LIKE ?)")
            args.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
        if conds:
            sql += " WHERE " + " AND ".join(conds)
        sql += " ORDER BY datetime(ts) DESC LIMIT ? OFFSET ?"
        args.extend([limit, offset])
        with self._conn() as cx:
            rows = cx.execute(sql, args).fetchall()
            items = []
            for r in rows:
                items.append({
                    "id": r["id"],
                    "ts": r["ts"],
                    "level": r["level"],
                    "actor": r["actor"],
                    "action": r["action"],
                    "path": r["path"],
                    "meta": json.loads(r["meta_json"] or "{}"),
                })
            # total para paginación simple
            c_sql = "SELECT COUNT(*) AS c FROM activity_log"
            if conds:
                c_sql += " WHERE " + " AND ".join(conds)
            total = cx.execute(c_sql, args[:-2]).fetchone()["c"]
            return {"items": items, "total": total}

    def clear(self) -> int:
        with self._conn() as cx:
            cur = cx.execute("DELETE FROM activity_log")
            return int(cur.rowcount)



# ========= Env & App =========
load_dotenv()
app = FastAPI(title="DataChatbot MVP", version="0.1.0")
app.include_router(asr.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.exception_handler(HTTPException)
async def http_exception_logger(request: Request, exc: HTTPException):
    try:
        actor = None
        # intenta leer bearer si viene
        authz = request.headers.get("authorization") or ""
        if authz.lower().startswith("bearer "):
            token = authz.split(" ", 1)[1]
            try:
                p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
                actor = p.get("sub")
            except Exception:
                pass
        log_event("error" if exc.status_code >= 500 else "warning",
                  "error_http",
                  actor=actor,
                  path=str(request.url.path),
                  meta={"status": exc.status_code, "detail": str(exc.detail)})
    except Exception as e:
        print("WARN exception logger:", e)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

# ========= Seguridad / JWT =========
JWT_SECRET = os.getenv("JWT_SECRET", "dev")     # cámbialo en prod
JWT_ALG = "HS256"
JWT_EXPIRE_MINUTES = 120

# Usa Argon2 (evita líos de bcrypt en Windows)
pwd_ctx = CryptContext(schemes=["argon2"], deprecated="auto")

auth_scheme = HTTPBearer(auto_error=True)

class SessionOut(BaseModel):
    jti: str
    sub: str
    role: str
    issued_at: int
    expires_at: int
    last_seen: int
    revoked: bool = False

SESSIONS: dict[str, dict] = {}


def require_jwt(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

    jti = payload.get("jti")
    s = SESSIONS.get(jti)
    if not s or s.revoked:
        raise HTTPException(status_code=401, detail="Sesión inválida o revocada")

    s.last_seen = int(datetime.now(tz=timezone.utc).timestamp())
    SESSIONS[jti] = s
    return payload


def require_non_admin(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=["HS256"])
    except PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    role = (payload.get("role") or payload.get("rol") or payload.get("perfil") or "").lower()

    if role == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot use the chatbot")
    return payload

def create_jwt(sub: str, role: str, extra: dict | None = None) -> str:
    now = int(datetime.now(tz=timezone.utc).timestamp())
    exp = int((datetime.now(tz=timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp())
    payload = {
        "sub": sub,
        "role": role,
        "iat": now,
        "exp": exp,
        "jti": str(uuid4()),   # 👈 ahora sí existe
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def get_current_user(payload: dict = Depends(require_jwt)) -> dict:
    return {"email": payload.get("sub"), "role": payload.get("role")}

def require_roles(roles: list[str]):
    def _dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user
    return _dep


def _safe_int(v):
    # intenta convertir a int; si no se puede, devuelve None
    try:
        if v is None:
            return None
        return int(v)
    except Exception:
        return None

@app.get("/admin/sessions")
def admin_list_sessions(_: dict = Depends(require_roles(["admin"]))):
    """
    Lista sesiones activas (revocadas o no) con metadata útil.
    Siempre devuelve timestamps numéricos o None.
    """
    now = int(time())
    out = []

    for jti, s in SESSIONS.items():
        issued = getattr(s, "issued_at", None)
        exp    = getattr(s, "expires_at", None)
        seen   = getattr(s, "last_seen", None)

        out.append({
            "jti": s.jti,
            "sub": s.sub,
            "role": s.role,
            "issued_at": _safe_int(issued),
            "expires_at": _safe_int(exp),
            "last_seen": _safe_int(seen),
            "revoked": bool(getattr(s, "revoked", False)),
            "expired": ( _safe_int(exp) is not None and now > _safe_int(exp) ),
        })

    log_event("info", "sessions_list", actor="admin", path="/admin/sessions", meta={"count": len(out)})
    return {
        "items": out,
        "total": len(out),
    }

@app.delete("/admin/sessions/{jti}")
def admin_revoke_session(
    jti: str,
    _: dict = Depends(require_roles(["admin"])),
):
    """
    Marca una sesión como revocada en memoria.
    """
    s = SESSIONS.get(jti)
    if not s:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    # s es un SessionOut, no un dict
    s.revoked = True
    SESSIONS[jti] = s

    log_event("warning", "session_revoke", actor="admin", path=f"/admin/sessions/{jti}", meta={"jti": jti})

    return {"ok": True, "jti": jti}


# ========= Persistencia de usuarios (SQLite) =========
DB_URL = os.getenv("AUTH_DB_URL", "sqlite:///./auth.db")
history_store = HistoryStore("./backend/history.db")
activity_log = ActivityLogStore("./backend/history.db")
def log_event(level: str, action: str, *, actor: str | None = None, path: str | None = None, meta: dict | None = None):
    try:
        activity_log.add(level=level, action=action, actor=actor, path=path, meta=meta or {})
    except Exception as e:
        print("WARN: no se pudo registrar log:", e)
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    email = Column(String, primary_key=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)

class Connection(Base):
    __tablename__ = "connections"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False, index=True)
    db_type = Column(String, nullable=False)
    sqlalchemy_url = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_admin():
    db = SessionLocal()
    try:
        email = "admin@datac.chat"
        u = db.get(User, email)
        if not u:
            u = User(email=email, password_hash=pwd_ctx.hash("admin123"), role="admin")
            db.add(u)
            db.commit()
            print("[auth] Admin inicial creado:", email)
    finally:
        db.close()

seed_admin()



# ========= Modelos de auth y endpoints =========
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Literal["user", "admin"] = "user"

class CreateConnectionRequest(BaseModel):
    name: str
    db_type: Literal["mysql", "postgres", "sqlite"]
    sqlalchemy_url: str

class ConnectionOut(BaseModel):
    id: int
    name: str
    db_type: str
    sqlalchemy_url: str
    is_active: bool

    class Config:
        from_attributes = True

@app.post("/auth/login")
def auth_login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    u = db.get(User, email)
    if not u or not u.is_active or not pwd_ctx.verify(req.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_jwt(sub=email, role=u.role)

    # registrar sesión en memoria
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    jti = payload["jti"]
    now = payload["iat"]
    SESSIONS[jti] = SessionOut(
        jti=jti,
        sub=payload["sub"],
        role=payload["role"],
        issued_at=payload["iat"],
        expires_at=payload["exp"],
        last_seen=now,
        revoked=False,
    )

    log_event("info", "login", actor=email, path="/auth/login", meta={"role": u.role})
    return {"access_token": token, "token_type": "bearer", "role": u.role}


@app.post("/auth/register")
def auth_register(req: RegisterRequest, _: dict = Depends(require_roles(["admin"])), db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    if db.get(User, email):
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    u = User(email=email, password_hash=pwd_ctx.hash(req.password), role=req.role)
    db.add(u); db.commit()
    log_event("info", "user_create", actor=_.get("email") if isinstance(_, dict) else None,
              path="/auth/register", meta={"new_user": email, "role": u.role})
    return {"ok": True, "email": email, "role": u.role}

@app.get("/auth/me")
def auth_me(user=Depends(get_current_user)):
    return user

@app.post("/auth/logout")
def auth_logout(payload: dict = Depends(require_jwt)):
    jti = payload.get("jti")
    s = SESSIONS.get(jti)
    if s:
        s.revoked = True
        SESSIONS[jti] = s

    log_event("info", "logout", actor=payload.get("sub"), path="/auth/logout")
    return {"ok": True}

@app.get("/admin/ping")
def admin_ping(_: dict = Depends(require_roles(["admin"]))):
    return {"ok": True, "msg": "pong (admin)"}

# =========================
# Endpoints de Conexiones (admin)
# =========================

def _validate_connection(sqlalchemy_url: str) -> None:
    """Levanta si no conecta / no se puede ejecutar SELECT 1."""
    eng = _make_engine(sqlalchemy_url)
    try:
        with eng.connect() as c:
            c.execute(text("SELECT 1"))
    finally:
        eng.dispose()


@app.post("/admin/connections", response_model=ConnectionOut)
def admin_create_connection(
    req: CreateConnectionRequest,
    admin=Depends(require_roles(["admin"])),
    db: Session = Depends(get_db),
):
    if _dialect_from_url(req.sqlalchemy_url) != req.db_type:
        log_event("error", "connection_create_failed", actor=admin["email"], path="/admin/connections",
                  meta={"reason": "db_type_mismatch"})
        raise HTTPException(status_code=400, detail="db_type no coincide con la URL")
    try:
        _validate_connection(req.sqlalchemy_url)
    except Exception as e:
        log_event("error", "connection_create_failed", actor=admin["email"], path="/admin/connections",
                  meta={"reason": "validate_error", "error": str(e)})
        raise HTTPException(status_code=400, detail=f"No se pudo conectar: {e}")
    if db.query(Connection).filter_by(name=req.name).first():
        log_event("error", "connection_create_failed", actor=admin["email"], path="/admin/connections",
                  meta={"reason": "duplicate_name", "name": req.name})
        raise HTTPException(status_code=400, detail="Ya existe una conexión con ese nombre")
    conn = Connection(
        name=req.name,
        db_type=req.db_type,
        sqlalchemy_url=req.sqlalchemy_url,
        is_active=True,
        created_by=admin["email"],
    )
    db.add(conn); db.commit(); db.refresh(conn)
    log_event("info", "connection_create", actor=admin["email"], path="/admin/connections",
              meta={"id": conn.id, "name": conn.name, "db_type": conn.db_type})
    return conn


@app.get("/admin/connections", response_model=list[ConnectionOut])
def admin_list_connections(_: dict = Depends(require_roles(["admin"])), db: Session = Depends(get_db)):
    return db.query(Connection).order_by(Connection.id.desc()).all()


# ---------- NUEVO: schema de salida público ----------
class PublicConnectionOut(BaseModel):
    id: int
    name: str
    db_type: str
    is_active: bool

# ---------- NUEVO: endpoint público para usuarios ----------
@app.get("/connections", response_model=List[PublicConnectionOut])
def list_public_connections(_: dict = Depends(require_jwt), db: Session = Depends(get_db)):
    rows = (
        db.query(Connection)
        .filter(Connection.is_active == True)
        .order_by(Connection.id.desc())
        .all()
    )

    log_event("info", "connections_list_public", actor=_.get("sub"), path="/connections", meta={"count": len(rows)})
    return [
        PublicConnectionOut(
            id=r.id, name=r.name, db_type=r.db_type, is_active=r.is_active
        )
        for r in rows
    ]

print("[boot] app_min desde:", __file__)
print("[exec_pandas] v2 cargada (sin locals())")

import json, re, unicodedata


UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
MAX_FILE_MB = int(os.environ.get("MAX_FILE_MB", "25"))
ALLOWED_EXTS = {".xlsx", ".xls", ".csv"}

os.makedirs(UPLOAD_DIR, exist_ok=True)

def _save_upload_to_disk(up: UploadFile) -> dict:
    ext = pathlib.Path(up.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Extensión no permitida: {ext}")

    file_id = str(uuid.uuid4())
    server_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

    # Medir tamaño mientras copiamos (streaming)
    size = 0
    with open(server_path, "wb") as out:
        while True:
            chunk = up.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_MB * 1024 * 1024:
                try:
                    out.close()
                    os.remove(server_path)
                except Exception:
                    pass
                raise HTTPException(status_code=413, detail="Archivo demasiado grande")
            out.write(chunk)

    return {
        "file_id": file_id,
        "server_path": server_path,
        "filename": up.filename,
        "size_bytes": size,
        "mime": up.content_type or "application/octet-stream",
    }

def _path_from_file_id(file_id: str) -> str:
    # Busca cualquier extensión válida para ese file_id
    for ext in ALLOWED_EXTS:
        p = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(p):
            return p
    raise HTTPException(status_code=404, detail="file_id no encontrado")

@app.post("/files/upload")
def upload_file(file: UploadFile = File(...), user=Depends(require_non_admin)):
    meta = _save_upload_to_disk(file)
    log_event("info", "file_upload", actor=user.get("sub") or user.get("email"), path="/files/upload",
              meta={"filename": meta["filename"], "size": meta["size_bytes"], "mime": meta["mime"]})
    # (Opcional) registrar en tu store/BD si quieres TTL/limpieza
    return {
        "file_id": meta["file_id"],
        "filename": meta["filename"],
        "size_bytes": meta["size_bytes"],
        "mime": meta["mime"],
    }


def _unwrap_code_block(s: str) -> str:
    s = s.strip()
    m = re.search(r"```(?:python)?\s*(.*?)\s*```", s, re.S | re.I)
    return m.group(1).strip() if m else s


def parse_plan_json(s: str) -> dict:
    s = _unwrap_code_block(s).strip()
    # Tolerar comillas simples
    try:
        obj = json.loads(s)
        if not isinstance(obj, dict):
            raise ValueError("PLAN no es un objeto JSON")
        return obj
    except Exception:
        s2 = s.replace("'", '"')
        obj = json.loads(s2)
        if not isinstance(obj, dict):
            raise ValueError("PLAN no es un objeto JSON")
        return obj


def _normalize(txt: str) -> str:
    # minúsculas, sin tildes, sin signos raros
    txt = txt.lower()
    txt = unicodedata.normalize("NFD", txt)
    txt = "".join(ch for ch in txt if unicodedata.category(ch) != "Mn")
    return txt


def _detect_operation(qnorm: str) -> str:
    if any(w in qnorm for w in ["promedio", "media"]):
        return "mean"
    if any(w in qnorm for w in ["suma", "totalizar", "sumar"]):
        return "sum"
    if any(w in qnorm for w in ["maximo", "máximo", "mayor"]):
        return "max"
    if any(w in qnorm for w in ["minimo", "mínimo", "menor"]):
        return "min"
    if "mediana" in qnorm:
        return "median"
    if any(
        w in qnorm
        for w in [
            "cuantos",
            "cuántos",
            "conteo",
            "contar",
            "numero de",
            "número de",
            "cantidad de",
            "total de",
        ]
    ):
        return "count"
    # por defecto, si habla de "promedio" implícito
    return "mean"


def _synonyms_map():
    # mapea sinónimos → columna canónica
    return {
        "genero": ["genero", "sexo", "hombre", "hombres", "mujer", "mujeres"],
        "departamento": ["departamento", "area", "área", "dept"],
        "salario": ["salario", "sueldo", "compensacion", "compensación", "pago"],
        "edad": ["edad", "anios", "años"],
    }


def _find_columns_in_question(qnorm: str, available_cols: list[str]) -> dict:
    # devuelve {'genero': True, 'departamento': False, ...} según mencione sinónimos
    syn = _synonyms_map()
    avail_norm = {_normalize(c): c for c in available_cols}  # normalizadas -> reales
    hits = {}
    for canon, words in syn.items():
        for w in words:
            if w in qnorm and canon in avail_norm:
                hits[canon] = True
                break
    return hits


def _pick_target_numeric(available_cols: list[str], dtypes: dict) -> str | None:
    # elige una columna numérica razonable si no se especifica
    for pref in ["salario", "edad"]:
        if pref in available_cols and str(dtypes.get(pref, "")).startswith(
            ("int", "float")
        ):
            return pref
    for c in available_cols:
        if str(dtypes.get(c, "")).startswith(("int", "float")):
            return c
    return None


def make_plan_rule_based(question: str, schema: dict) -> dict:
    """Construye un plan determinista si el LLM falla."""
    cols = [str(c) for c in schema["columns"]]
    dtypes = {str(k): str(v) for k, v in schema["dtypes"].items()}
    cols_norm = [_normalize(c) for c in cols]
    qnorm = _normalize(question)

    op = _detect_operation(qnorm)

    # group_by: si la pregunta dice "por X" o menciona clara categoría
    hits = _find_columns_in_question(qnorm, cols_norm)
    group_by = []
    for canon in ["genero", "departamento"]:
        if canon in hits:
            # usa el nombre real tal como está en el df si existe
            try:
                idx = cols_norm.index(canon)
                group_by.append(cols[idx])
            except ValueError:
                pass

    # target
    target = None
    if op != "count":
        # si menciona salario explícitamente y existe
        if "salario" in cols_norm and any(
            w in qnorm
            for w in ["salario", "sueldo", "compensacion", "compensación", "pago"]
        ):
            target = cols[cols_norm.index("salario")]
        else:
            target = _pick_target_numeric(
                cols_norm, {_normalize(k): v for k, v in dtypes.items()}
            )

    return {
        "operation": op,
        "group_by": group_by,
        "target": target,
        "filters": [],
    }


def build_pandas_expr(plan: dict) -> str:
    """
    Devuelve una *expresión* de pandas que produce un DataFrame llamado `out`.
    No usa f-strings con formateadores raros; solo concatena strings.
    """
    op = (plan.get("operation") or "").lower()
    group_by = plan.get("group_by") or []
    target = plan.get("target")
    filters = plan.get("filters") or []

    # ---- construir máscara de filtros ----
    mask_parts = []
    for f in filters:
        if isinstance(f, dict):
            col = f.get("column")
            operator = (f.get("operator") or "").lower()
            val = f.get("value")
            if operator in ["==", "!=", ">", ">=", "<", "<="]:
                # literales: strings con comillas, listas como están, números sin comillas
                if isinstance(val, str):
                    val_repr = f"'{val}'"
                else:
                    val_repr = repr(val)
                mask_parts.append(f"(df[{repr(col)}] {operator} {val_repr})")
            elif operator in ["in", "not in"]:
                mask_parts.append(
                    f"(df[{repr(col)}].isin({repr(val)}))"
                    if operator == "in"
                    else f"(~df[{repr(col)}].isin({repr(val)}))"
                )
            elif operator == "contains":
                mask_parts.append(
                    f"(df[{repr(col)}].astype(str).str.contains({repr(str(val))}, case=False, na=False))"
                )
            elif operator == "startswith":
                mask_parts.append(
                    f"(df[{repr(col)}].astype(str).str.startswith({repr(str(val))}, na=False))"
                )
            elif operator == "endswith":
                mask_parts.append(
                    f"(df[{repr(col)}].astype(str).str.endswith({repr(str(val))}, na=False))"
                )
            # otros operadores: ignora silenciosamente
    mask_expr = " & ".join(mask_parts) if mask_parts else ""

    # ---- base df filtrado ----
    base_df = "df"
    if mask_expr:
        base_df = f"df.loc[{mask_expr}]"

    # ---- sin target para count global ----
    if op == "count" and not group_by:
        return f"out = pd.DataFrame({{'count': [len({base_df})]}})"

    # ---- agregaciones sin group_by ----
    if not group_by:
        if not target and op != "count":
            raise ValueError("Falta 'target' para agregación sin group_by")
        if op == "count":
            return f"out = pd.DataFrame({{'count': [{base_df}.shape[0]]}})"
        agg_expr = {
            "mean": f"{base_df}[{repr(target)}].mean()",
            "sum": f"{base_df}[{repr(target)}].sum()",
            "max": f"{base_df}[{repr(target)}].max()",
            "min": f"{base_df}[{repr(target)}].min()",
            "median": f"{base_df}[{repr(target)}].median()",
        }.get(op)
        if agg_expr is None:
            raise ValueError(f"Operación no soportada: {op}")
        return f"out = pd.DataFrame({{{repr(op + '_' + str(target))}: [{agg_expr}]}})"

    # ---- con group_by ----
    gcols_repr = "[" + ",".join(repr(c) for c in group_by) + "]"
    if op == "count":
        return (
            f"out = {base_df}.groupby({gcols_repr}).size()"
            f".reset_index(name='count')"
        )

    if not target:
        # si el LLM olvidó target, contamos filas por grupo
        return (
            f"out = {base_df}.groupby({gcols_repr}).size()"
            f".reset_index(name='count')"
        )

    op_map = {
        "mean": "mean",
        "sum": "sum",
        "max": "max",
        "min": "min",
        "median": "median",
    }
    if op not in op_map:
        raise ValueError(f"Operación no soportada: {op}")

    return (
        f"out = {base_df}.groupby({gcols_repr})[{repr(target)}].{op_map[op]}()"
        f".reset_index(name='{op}_" + str(target) + "')"
    )


# =========================
# LLM
# =========================
# justo antes de crear el LLM


# --- Parche anti base_url inválido (debe ir ANTES de crear el LLM) ---
def _purge_openai_base_env():
    """Elimina de este proceso cualquier OPENAI/AZURE base_url inválido (sin http/https)."""
    removed = []
    cand_keys = (
        "OPENAI_API_BASE",
        "OPENAI_BASE_URL",
        "OPENAI_BASE",  # por si acaso
        "OPENAI_API_HOST",  # por si acaso
        "OPENAI_ENDPOINT",  # algunos setups lo usan
        "AZURE_OPENAI_ENDPOINT",  # Azure
    )
    for key in cand_keys:
        val = os.environ.get(key)
        if val is not None and not val.strip().lower().startswith(
            ("http://", "https://")
        ):
            removed.append((key, val))
            os.environ.pop(key, None)
    if removed:
        print("⚠️ Ignorando base_url inválido(s):", removed)


_purge_openai_base_env()


from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# Si REALMENTE vas a usar proxy/Azure, debe empezar por http(s):
_OPENAI_BASE = (
    os.getenv("OPENAI_API_BASE")
    or os.getenv("OPENAI_BASE_URL")
    or os.getenv("AZURE_OPENAI_ENDPOINT")
)
if not (
    _OPENAI_BASE and _OPENAI_BASE.strip().lower().startswith(("http://", "https://"))
):
    _OPENAI_BASE = None

_llm_kwargs = dict(
    model=os.getenv("LLM_MODEL", "gpt-4.1-mini"),
    temperature=0,
)
if _OPENAI_BASE:
    _llm_kwargs["base_url"] = _OPENAI_BASE  # SOLO si es válido

llm = ChatOpenAI(**_llm_kwargs)
parser = StrOutputParser()

# DEBUG: imprime qué base_url terminó usando el cliente
try:
    print("DEBUG llm.client.base_url =", getattr(llm.client, "base_url", None))
except Exception as _e:
    print("DEBUG no pude leer llm.client.base_url:", _e)


# =========================
# Pydantic I/O
# =========================

# --- helpers de normalización ---
_ALIAS_MAP: Dict[str, str] = {
# Comparadores
    "==": "==", "=": "==", "eq": "==",
    "!=": "!=", "<>": "!=", "neq": "!=", "ne": "!=",
    ">": ">", "gt": ">",
    ">=": ">=", "=>": ">=", "gte": ">=",
    "<": "<", "lt": "<",
    "<=": "<=", "=<": "<=", "lte": "<=",

    # Conjuntos
    "in": "in", "∈": "in",
    "not in": "not in", "not_in": "not in", "nin": "not in", "∉": "not in",

    # Textuales
    "contains": "contains",
    "startswith": "startswith", "starts_with": "startswith", "starts with": "startswith",
    "endswith": "endswith",     "ends_with": "endswith",   "ends with": "endswith",
}


def _normalize_op(op: str) -> str:
    """Devuelve el operador canónico definido en el Literal de Filter.operator."""
    if op is None:
        return op
    s = str(op).strip()

    # Normaliza unicode y separadores comunes
    s_low = (
        s.lower()
        .replace("≥", ">=")
        .replace("≤", "<=")
        .replace("≠", "!=")
        .replace("_", " ")
    )

    # Unifica frases a llaves del alias dict
    s_key = (
        s_low
        .replace("starts with", "startswith")
        .replace("ends with", "endswith")
        .strip()
    )

    return _ALIAS_MAP.get(s_key, s)


# --- filtro tipado (símbolos como dominio final) ---
class Filter(BaseModel):
    column: str
    operator: Literal[
        "==",
        "!=",
        ">",
        ">=",
        "<",
        "<=",
        "in",
        "not in",
        "contains",
        "startswith",
        "endswith",
    ]
    value: Any

    @field_validator("operator", mode="before")
    @classmethod
    def _before_operator(cls, v):
        return _normalize_op(v)

class HistoryItem(BaseModel):
    id: int
    question: str
    datasource: Dict[str, Any]
    generated: Dict[str, Any]
    row_count: int
    created_at: str
    answer_text: str

class HistoryList(BaseModel):
    items: List[HistoryItem]
    total: int

# --- parser de filtros escritos como string ---
def _parse_filter_string(s: str) -> Optional[Dict[str, Any]]:
    # soporta:
    # "col == 'x'", "col != 3", "col in ['a','b']",
    # "col contains 'x'", "col startswith 'y'", "col endswith 'z'",
    # y también "col eq 'x'", "col gte 10", etc.
    import re, ast

    s = s.strip()

    # in / not in
    m = re.match(r"""^\s*([\w\s]+)\s+(not\s+in|in)\s+(.+)$""", s, re.I)
    if m:
        col = m.group(1).strip()
        op = m.group(2).lower().replace("  ", " ")
        try:
            val = ast.literal_eval(m.group(3).strip())
        except Exception:
            val = m.group(3).strip().strip("\"'")
        return {"column": col, "operator": op, "value": val}

    # contains / startswith / endswith
    m = re.match(r"""^\s*([\w\s]+)\s+(contains|startswith|endswith)\s+(.+)$""", s, re.I)
    if m:
        col = m.group(1).strip()
        op = m.group(2).lower()
        val = m.group(3).strip().strip("\"'")
        return {"column": col, "operator": op, "value": val}

    # comparadores verbales: eq/ne/gt/gte/lt/lte
    m = re.match(r"""^\s*([\w\s]+)\s+(eq|ne|gt|gte|lt|lte)\s+(.+)\s*$""", s, re.I)
    if m:
        col, op_word, raw = m.group(1).strip(), m.group(2), m.group(3).strip()
        op = _normalize_op(op_word)
        try:
            val = ast.literal_eval(raw)
        except Exception:
            val = raw.strip("\"'")
        return {"column": col, "operator": op, "value": val}

    # comparadores con símbolos
    m = re.match(r"""^\s*([\w\s]+)\s*(==|!=|>=|<=|>|<)\s*(.+)\s*$""", s)
    if m:
        col, op, raw = m.group(1).strip(), m.group(2), m.group(3).strip()
        try:
            val = ast.literal_eval(raw)
        except Exception:
            val = raw.strip("\"'")
        return {"column": col, "operator": op, "value": val}

    return None



class ActivityItem(BaseModel):
    id: int
    ts: str
    level: str
    actor: str
    action: str
    path: str
    meta: dict

class ActivityList(BaseModel):
    items: List[ActivityItem]
    total: int

@app.get("/admin/logs", response_model=ActivityList)
def admin_list_logs(
    limit: int = 100,
    offset: int = 0,
    level: Optional[str] = None,
    action: Optional[str] = None,
    q: Optional[str] = None,
    _: dict = Depends(require_roles(["admin"]))
):
    data = activity_log.list(limit=limit, offset=offset, level=level, action=action, q=q)
    items = [ActivityItem(**it) for it in data["items"]]
    return ActivityList(items=items, total=data["total"])

@app.delete("/admin/logs")
def admin_clear_logs(_: dict = Depends(require_roles(["admin"]))):
    deleted = activity_log.clear()
    return {"deleted": deleted}


# --- plan tipado que acepta dicts o strings en filters y normaliza ---
class PlanModel(BaseModel):
    operation: Literal["mean", "sum", "max", "min", "median", "count"]
    group_by: List[str] = Field(default_factory=list)
    target: Optional[str] = None
    # acepta dict o string y lo normaliza
    filters: List[Union[Filter, str]] = Field(default_factory=list)

    @field_validator("filters", mode="before")
    @classmethod
    def _coerce_filters(cls, v):
        if not v:
            return []
        out = []
        for item in v:
            if isinstance(item, dict):
                # normaliza key y operador por si vienen como 'op' o con alias
                if "op" in item and "operator" not in item:
                    item["operator"] = item.pop("op")
                if "operator" in item:
                    item["operator"] = _normalize_op(item["operator"])
                out.append(item)
            elif isinstance(item, str):
                parsed = _parse_filter_string(item)
                if parsed:
                    parsed["operator"] = _normalize_op(parsed["operator"])
                    out.append(parsed)
            # otros tipos se ignoran silenciosamente (MVP)
        return out


class MySQLSource(BaseModel):
    type: Literal["mysql"] = "mysql"
    sqlalchemy_url: str  # ej: mysql+pymysql://user:pass@host:3306/db

class PostgresSource(BaseModel):
    type: Literal["postgres"] = "postgres"
    sqlalchemy_url: str  # ej: postgresql+psycopg2://user:pass@host:5432/db

class SQLiteSource(BaseModel):
    type: Literal["sqlite"] = "sqlite"
    sqlalchemy_url: str  # ej: sqlite:///C:/path/to/db.sqlite3

class SavedSource(BaseModel):
    type: Literal["saved"] = "saved"
    connection_id: int

class ExcelSource(BaseModel):
    type: Literal["excel"] = "excel"
    path: Optional[str] = None              # legado (ruta en el servidor)
    file_id: Optional[str] = None           # recomendado (archivo subido)
    sheet_name: Optional[Union[int, str]] = 0  # para CSV se ignora

    @model_validator(mode="after")
    def _ensure_path_or_file_id(self):
        if not self.path and not self.file_id:
            raise ValueError("Excel datasource: debes enviar file_id o path")
        return self

DataSource = Annotated[
    Union[MySQLSource, PostgresSource, SQLiteSource, ExcelSource, SavedSource],
    Field(discriminator="type"),
]

class ChatOptions(BaseModel):
    language: Literal["es", "en"] = "es"
    max_rows: int = 200


class ChatRequest(BaseModel):
    question: str
    datasource: DataSource
    options: ChatOptions = ChatOptions()


class TableData(BaseModel):
    columns: List[str]
    rows: List[List[Any]]


class ChatResponse(BaseModel):
    answer_text: str
    generated: Dict[str, Any]  # {"type": "sql"|"pandas", "code": str}
    table: Optional[TableData] = None
    notices: List[str] = []

def _fmt_num(x: Any) -> str:
    try:
        if isinstance(x, bool):
            return "1" if x else "0"
        if isinstance(x, int):
            return f"{x:,}"
        if isinstance(x, float):
            if math.isfinite(x):
                return f"{x:,.2f}"
            return str(x)
    except Exception:
        pass
    return str(x)

def _looks_numeric(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)

def _guess_entity_from_question(q: Optional[str]) -> Optional[str]:
    if not q:
        return None
    qs = q.lower()
    # ES y EN (muy básico, extensible)
    mapping = {
        "ciudad": "ciudades", "ciudades": "ciudades",
        "customer": "clientes", "customers": "clientes", "cliente": "clientes", "clientes": "clientes",
        "usuario": "usuarios", "usuarios": "usuarios", "users": "usuarios",
        "producto": "productos", "productos": "productos", "products": "productos",
        "pedido": "pedidos", "pedidos": "pedidos", "orders": "pedidos",
    }
    # devuelve la primera coincidencia útil
    for k, ent in mapping.items():
        if k in qs:
            return ent
    return None

def make_answer_text(table_like: dict, lang: str = "es", question: Optional[str] = None) -> str:
    """
    table_like = { "columns": [...], "rows": [[...], ...], "total": int? }
    Devuelve una frase corta y útil (ES/EN).
    """
    cols = [str(c) for c in (table_like.get("columns") or [])]
    rows = table_like.get("rows") or []
    total = table_like.get("total", len(rows))
    is_es = (lang or "").lower().startswith("es")

    if not rows:
        return "No se encontraron resultados." if is_es else "No results found."

    # === Caso 1: 1x1 (agregados típicos) ===
    if len(rows) == 1 and len(cols) == 1:
        v = rows[0][0]
        label = cols[0].strip().lower()
        ent = _guess_entity_from_question(question)
        if any(k in label for k in ("count", "total")):
            if is_es:
                return f"Hay {_fmt_num(v)} {ent or 'registros'}."
            return f"There are {_fmt_num(v)} {ent or 'records'}."
        if any(k in label for k in ("avg", "mean", "promedio")):
            return (f"El promedio es {_fmt_num(v)}."
                    if is_es else f"The average is {_fmt_num(v)}.")
        if "sum" in label:
            return (f"La suma es {_fmt_num(v)}."
                    if is_es else f"The sum is {_fmt_num(v)}.")
        if "max" in label:
            return (f"El máximo es {_fmt_num(v)}."
                    if is_es else f"The maximum is {_fmt_num(v)}.")
        if "min" in label:
            return (f"El mínimo es {_fmt_num(v)}."
                    if is_es else f"The minimum is {_fmt_num(v)}.")
        # genérico 1x1
        return f"{cols[0]}: {_fmt_num(v)}."

    # === Caso 2: 1 fila, varias columnas → mostrar key-values cortos ===
    if len(rows) == 1 and len(cols) > 1:
        pairs = []
        for i, c in enumerate(cols[:4]):  # máx 4 campos
            pairs.append(f"{c}={_fmt_num(rows[0][i])}")
        if is_es:
            return f"1 registro — " + ", ".join(pairs) + ("…" if len(cols) > 4 else "")
        return "1 record — " + ", ".join(pairs) + ("…" if len(cols) > 4 else "")

    # === Caso 3: ≤10 filas, 2 columnas y la 2ª numérica → ranking/top ===
    if len(cols) == 2 and len(rows) <= 10 and all(len(r) == 2 for r in rows):
        second_is_numeric = any(_looks_numeric(r[1]) for r in rows)
        if second_is_numeric:
            show_n = min(5, len(rows))
            items = "; ".join(f"{rows[i][0]}: {_fmt_num(rows[i][1])}" for i in range(show_n))
            if is_es:
                extra = f" (+{len(rows)-show_n} más)" if len(rows) > show_n else ""
                return f"Top {show_n}: {items}{extra}."
            else:
                extra = f" (+{len(rows)-show_n} more)" if len(rows) > show_n else ""
                return f"Top {show_n}: {items}{extra}."

    # === Caso 4: resumen general con columnas y ejemplos ===
    n = min(3, len(rows))
    examples = ", ".join(_fmt_num(rows[i][0]) for i in range(n))
    if is_es:
        base = f"Mostrando {len(rows)} fila(s)"
        if total and total > len(rows):
            base += f" de {total}"
        if cols:
            base += f" — columnas: {', '.join(map(str, cols[:3]))}" + ("…" if len(cols) > 3 else "")
        if examples:
            base += f". Ejemplos: {examples}."
        return base
    else:
        base = f"Showing {len(rows)} row(s)"
        if total and total > len(rows):
            base += f" out of {total}"
        if cols:
            base += f" — columns: {', '.join(map(str, cols[:3]))}" + ("…" if len(cols) > 3 else "")
        if examples:
            base += f". Examples: {examples}."
        return base

def _detect_lang(question: str, preferred: str | None = None) -> str:
    """
    Devuelve 'es' o 'en'.
    Si preferred viene válido ('es'|'en'), lo respeta.
    Si no, detecta español por palabras muy comunes.
    """
    if preferred and preferred.lower() in ("es", "en"):
        return preferred.lower()
    q = (question or "").lower()
    es_markers = [
        "cuánt", "cuant", "hay", "promedio", "por ", "donde", "entre", "mayor", "menor",
        "máximo", "maximo", "mínimo", "minimo", "suma", "total", "cliente", "clientes",
        "producto", "productos", "ciudad", "ciudades"
    ]
    return "es" if any(m in q for m in es_markers) else "en"

# =========================
# Helpers: schema extraction
# =========================


def extract_sql_schema_from_engine(engine: Engine, max_cols: int = 80, max_tables: int = 50) -> Dict[str, List[str]]:
    insp = inspect(engine)
    schema: Dict[str, List[str]] = {}
    for t in insp.get_table_names()[:max_tables]:
        try:
            cols = [c["name"] for c in insp.get_columns(t)][:max_cols]
            schema[t] = cols
        except Exception:
            continue
    return schema


def extract_excel_schema(
    path: str, sheet_name: Optional[Union[int, str]] = 0, sample_rows: int = 2000
) -> Dict[str, Any]:
    if path.lower().endswith(".csv"):
        df = pd.read_csv(path, nrows=sample_rows)
    else:
        df = pd.read_excel(path, sheet_name=sheet_name, nrows=sample_rows)
    return {
        "columns": list(df.columns),
        "dtypes": {c: str(df[c].dtype) for c in df.columns},
    }

def _make_engine(sqlalchemy_url: str) -> Engine:
    url_l = sqlalchemy_url.lower()
    if url_l.startswith("mysql"):
        return create_engine(sqlalchemy_url, connect_args={"charset": "utf8mb4"}, pool_pre_ping=True)
    if url_l.startswith("sqlite"):
        # Para SQLite en archivo local
        return create_engine(sqlalchemy_url, connect_args={"check_same_thread": False})
    # postgres, etc.
    return create_engine(sqlalchemy_url, pool_pre_ping=True)

def _dialect_from_url(sqlalchemy_url: str) -> str:
    url_l = sqlalchemy_url.lower()
    if url_l.startswith("mysql"):
        return "mysql"
    if url_l.startswith("postgres"):
        return "postgres"
    if url_l.startswith("sqlite"):
        return "sqlite"
    # por defecto intenta ANSI SQL
    return "ansi"

# =========================
# Prompting (few-shots mínimos; ajústalos a tu esquema real)
# =========================
PLAN_SYSTEM = (
    "Devuelve SOLO un JSON válido con las claves: operation, group_by, target, filters. "
    "Operaciones válidas: mean, sum, max, min, median, count. "
    "group_by: lista de columnas (o vacía). "
    "target: columna numérica a agregar (o null si operation = count). "
    "filters: lista de objetos con campos column, operator, value. "
    "Operadores permitidos: eq, ne, gt, gte, lt, lte, in, nin, contains, startswith, endswith. "
    "Usa solo columnas dadas. Sin texto extra, solo JSON."
)


def _escape_braces(s: str) -> str:
    return s.replace("{", "{{").replace("}", "}}")


# Few-shots (las llaves del JSON se ESCAPAN para no romper la plantilla)
PLAN_FEWSHOT_A = (
    '{"operation":"mean","group_by":["genero"],"target":"salario","filters":[]}'
)
PLAN_FEWSHOT_B = (
    '{"operation":"mean","group_by":["genero"],"target":"salario",'
    '"filters":[{"column":"departamento","operator":"eq","value":"IT"}]}'
)

SAFE_PLAN_FEWSHOT_A = _escape_braces(PLAN_FEWSHOT_A)
SAFE_PLAN_FEWSHOT_B = _escape_braces(PLAN_FEWSHOT_B)

# Prompt “simple” (opcional, por si quieres sin few-shots)
PLAN_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", PLAN_SYSTEM),
        (
            "human",
            "Columnas disponibles: {columns}\n"
            "Pregunta del usuario: {question}\n"
            "Devuelve el plan estructurado con operation, group_by, target y filters.",
        ),
    ]
)

# Prompt con few-shots (recomendado)
PLAN_PROMPT_FEWSHOT = ChatPromptTemplate.from_messages(
    [
        ("system", PLAN_SYSTEM),
        # Ejemplo 1 (sin filtros)
        (
            "human",
            "Columnas de ejemplo: ['genero','salario','departamento']\nPregunta: salario promedio por género",
        ),
        ("assistant", SAFE_PLAN_FEWSHOT_A),
        # Ejemplo 2 (con un filtro)
        (
            "human",
            "Columnas de ejemplo: ['genero','salario','departamento']\nPregunta: salario promedio por género solo en el departamento IT",
        ),
        ("assistant", SAFE_PLAN_FEWSHOT_B),
        # Turno real
        (
            "human",
            "Ahora responde SOLO con JSON. Columnas: {columns}\nPregunta: {question}",
        ),
    ]
)

SQL_SYSTEM = (
    "Eres un traductor NL→SQL para MySQL. La pregunta puede estar en español o en inglés. "
    "Usa SOLO tablas/columnas del esquema proporcionado. "
    "Responde con UN bloque SQL válido (sin comentarios). Prohibidos DELETE/UPDATE/INSERT/ALTER/DROP. "
    "Si la pregunta no es respondible con el esquema, devuelve: SELECT 'NO_ANSWER' AS reason; "
    "Convenciones de negocio:\n"
    "- 'sede' ≈ 'site'. Si el usuario dice 'sede 2', mapéalo a empleados.sede_id = 2.\n"
    "- Si pide 'cuántos empleados hay en la sede X', devuelve un COUNT(*) filtrando por empleados.sede_id=X.\n"
    "- Si menciona el nombre de sede (tabla sedes.nombre), úsalo para buscar el id y unir si hace falta."
    "Notas: MySQL/PostgreSQL/SQLite aceptan LIMIT; evita funciones específicas si no son necesarias."
)

PANDAS_SYSTEM = (
    "Eres un traductor NL→Pandas para DataFrames de Excel/CSV. Existe un DataFrame llamado df. "
    "Devuelve SOLO UNA EXPRESIÓN de Pandas (sin asignar a variables, sin print, sin bloques ```) "
    "que produzca un DataFrame o Serie lista para mostrar. "
    "Si la pregunta pide promedio/media, usa mean(); suma→sum(); máximo→max(); mínimo→min(); mediana→median(); "
    "conteo de filas→size() (o value_counts() sólo si piden explícitamente frecuencias por categoría). "
    "Si la pregunta dice 'por X', agrupa con groupby('X'). "
    "Usa exclusivamente las columnas proporcionadas."
)


SQL_FEWSHOTS = [
    {
        "user": "¿Cuál es el salario promedio de los hombres?",
        "sql": "SELECT AVG(salario) AS salario_promedio FROM empleados WHERE genero = 'M';",
    },
    {
        "user": "Total de empleados por departamento",
        "sql": "SELECT departamento_id, COUNT(*) AS total FROM empleados GROUP BY departamento_id ORDER BY total DESC;",
    },
    # 👇 nuevo ejemplo clave
    {
        "user": "¿Cuántos empleados hay en la sede 2?",
        "sql": "SELECT COUNT(*) AS total FROM empleados WHERE sede_id = 2;",
    },
    # (opcional) por nombre de sede
    {
        "user": "How many employees are there in 'Sede 2'?",
        "sql": (
            "SELECT COUNT(*) AS total "
            "FROM empleados e "
            "JOIN sedes s ON s.id = e.sede_id "
            "WHERE s.nombre = 'Sede 2';"
        ),
    },
]

PANDAS_FEWSHOTS = [
    {
        "user": "salario promedio por género",
        "py": "df.groupby('genero')['salario'].mean().reset_index(name='salario_promedio')",
    },
    {
        "user": "cuenta por departamento",
        "py": "df.groupby('departamento').size().reset_index(name='total').sort_values('total', ascending=False)",
    },
]

# --- PROMPTS CORREGIDOS ---

# Construimos las parejas de mensajes para los few-shots de SQL
_sql_fewshot_msgs = []
for ex in SQL_FEWSHOTS:
    _sql_fewshot_msgs.append(("human", f"Ejemplo: {ex['user']}"))
    _sql_fewshot_msgs.append(("assistant", ex["sql"]))

SQL_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", SQL_SYSTEM),
        ("human", "Dialecto: {dialect}\n Esquema (tabla: [columnas]):\n{schema}\n\nPregunta: {question}"),
    ]
    + _sql_fewshot_msgs
)

# Construimos las parejas de mensajes para los few-shots de Pandas
_pandas_fewshot_msgs = []
for ex in PANDAS_FEWSHOTS:
    _pandas_fewshot_msgs.append(("human", f"Ejemplo: {ex['user']}"))
    _pandas_fewshot_msgs.append(("assistant", ex["py"]))

PANDAS_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", PANDAS_SYSTEM),
        ("human", "Columnas: {columns}\nTipos: {dtypes}\n\nPregunta: {question}"),
    ]
    + _pandas_fewshot_msgs
)


# =========================
# Guards
# =========================
FORBIDDEN_SQL = re.compile(
    r"\b(DELETE|UPDATE|INSERT|ALTER|DROP|TRUNCATE|CREATE|REPLACE)\b", re.I
)


def sanitize_sql(q: str, limit: int) -> str:
    q = q.strip().strip(";")
    if FORBIDDEN_SQL.search(q):
        raise HTTPException(
            status_code=400, detail="Operación SQL no permitida en el MVP"
        )
    if not re.match(r"^SELECT", q, re.I):
        # Fuerza solo SELECT en el MVP
        raise HTTPException(status_code=400, detail="Solo se permiten consultas SELECT")
    # Añade LIMIT si no existe
    if re.search(r"\bLIMIT\b", q, re.I) is None:
        q += f" LIMIT {limit}"
    return q + ";"


def exec_pandas(code: str, df: pd.DataFrame) -> pd.DataFrame:
    """
    Ejecuta código de Pandas en un sandbox MUY básico (MVP):
    - Primero intenta eval (expresión)
    - Si falla por SyntaxError, usa exec (statements)
    - Recoge salida desde 'out'/'df_out'/'result'/'_'/'df' SIN usar `or` para evitar truthiness de DataFrame
    - Builtins seguros + 'locals' inofensivo
    """
    print("[exec_pandas] V4 activo")  # debug
    code = code.strip()

    env = {"df": df, "pd": pd}
    SAFE_BUILTINS = {
        "abs": abs,
        "min": min,
        "max": max,
        "sum": sum,
        "len": len,
        "sorted": sorted,
        "round": round,
        "range": range,
        "list": list,
        "dict": dict,
        "set": set,
        "tuple": tuple,
        "locals": (lambda: env),  # evita NameError si algo llama locals()
    }
    GLOBALS = {"__builtins__": SAFE_BUILTINS}

    # 1) intenta evaluar como EXPRESIÓN
    try:
        result = eval(code, GLOBALS, env)
        # Normaliza a DataFrame
        if isinstance(result, pd.DataFrame):
            return result
        if isinstance(result, pd.Series):
            return result.to_frame()
        try:
            return pd.DataFrame(result)
        except Exception:
            return pd.DataFrame({"value": [result]})

    except SyntaxError:
        # 2) no era expresión → ejecutar statements
        exec(code, GLOBALS, env)

        # Toma el primer valor no-None de estas claves, SIN usar `or`
        result = None
        for key in ("out", "df_out", "result", "_", "df"):
            if key in env and env[key] is not None:
                result = env[key]
                break

        if result is None:
            raise ValueError(
                "El código de Pandas no produjo salida; asigna un DataFrame a 'out'."
            )

        if isinstance(result, pd.DataFrame):
            return result
        if isinstance(result, pd.Series):
            return result.to_frame()
        try:
            return pd.DataFrame(result)
        except Exception:
            return pd.DataFrame({"value": [result]})


# =========================
# Core: NL → (SQL|Pandas) → ejecutar
# =========================


def answer_sql(question: str, sqlalchemy_url: str, opts: ChatOptions) -> ChatResponse:
    dialect = _dialect_from_url(sqlalchemy_url)
    engine = _make_engine(sqlalchemy_url)

    # 1) esquema
    try:
        schema = extract_sql_schema_from_engine(engine)
    finally:
        # no cierres aún; lo usamos para ejecutar
        pass

    # 2) prompt (incluye dialect)
    prompt = SQL_PROMPT.format_messages(
        schema=json.dumps(schema, ensure_ascii=False),
        question=question,
        dialect=dialect,
    )
    sql_code = (llm | parser).invoke(prompt)
    sql_code = sanitize_sql(sql_code, limit=opts.max_rows)

    # 3) ejecutar
    try:
        with engine.connect() as conn:
            res = conn.execute(text(sql_code))
            rows = res.fetchall()
            cols = list(res.keys())
    except SQLAlchemyError as e:
        raise HTTPException(status_code=400, detail=f"Error SQL: {str(e)} | Query: {sql_code}")
    finally:
        engine.dispose()

    df = pd.DataFrame(rows, columns=cols)
    table = TableData(
        columns=cols, rows=df.astype(object).where(pd.notnull(df), None).values.tolist()
    )
    lang = _detect_lang(question, getattr(opts, "language", None))
    answer_text = make_answer_text(
        {"columns": cols, "rows": table.rows, "total": len(df)},
        lang=opts.language,
        question=question,
    )
    return ChatResponse(
        answer_text=answer_text,
        generated={"type": "sql", "code": sql_code},
        table=table,
        notices=[],
    )



def answer_excel(question: str, source: ExcelSource, opts: ChatOptions) -> ChatResponse:
    # 0) Carga de datos y esquema
    df = (
        pd.read_csv(source.path)
        if source.path.lower().endswith(".csv")
        else pd.read_excel(source.path, sheet_name=source.sheet_name)
    )
    schema = extract_excel_schema(source.path, sheet_name=source.sheet_name)

    # 1) PLAN por LLM tipado (structured output) con fallback a reglas
    try:
        # 👇 Fuerza el método clásico de function calling (evita el error de schema estricto)
        structured = PLAN_PROMPT_FEWSHOT | llm.with_structured_output(
            PlanModel, method="function_calling"
        )
        plan_obj: PlanModel = structured.invoke(
            {"columns": schema["columns"], "question": question}
        )
        plan = plan_obj.dict()
        print("DEBUG PLAN (LLM):", plan)

    except Exception as e:
        print("WARN: PLAN LLM falló, usando plan por reglas:", e)
        plan = make_plan_rule_based(question, schema)
        print("DEBUG PLAN (RULE):", plan)

    # 2) Construcción determinista de la expresión Pandas
    try:
        py_code = build_pandas_expr(plan)
        print("DEBUG py_code:", py_code)
    except Exception as e:
        # 3) Último fallback: pedir expresión directa al LLM (por robustez)
        print("WARN: build_pandas_expr falló, fallback a generador directo:", e)
        prompt = PANDAS_PROMPT.format_messages(
            columns=schema["columns"], dtypes=schema["dtypes"], question=question
        )
        py_code_raw = (llm | parser).invoke(prompt)
        # Desenvuelve bloque ``` y quita "out = ..." si viniera así
        py_code = _unwrap_code_block(py_code_raw).strip()
        if py_code.startswith("out ="):
            py_code = py_code.split("=", 1)[1].strip()
        print("DEBUG py_code (FALLBACK):", py_code)

    # 4) Ejecutar de forma segura
    try:
        out = exec_pandas(py_code, df)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error ejecutando Pandas: {str(e)} | Código: {py_code}",
        )

    # 5) Limitar y empaquetar respuesta
    if len(out) > opts.max_rows:
        out = out.head(opts.max_rows)

    table = TableData(
        columns=[str(c) for c in out.columns],
        rows=out.astype(object).where(pd.notnull(out), None).values.tolist(),
    )

    lang = _detect_lang(question, getattr(opts, "language", None))
    answer_text = make_answer_text(
        {"columns": table.columns, "rows": table.rows, "total": len(out)},
        lang=opts.language,
        question=question,
    )

    return ChatResponse(
        answer_text=answer_text,
        generated={"type": "pandas", "code": py_code},
        table=table,
        notices=[],
    )


# =========================
# FastAPI
# =========================


@app.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    payload: dict = Depends(require_non_admin),
    db: Session = Depends(get_db),
):
    if str(payload.get("role", "")).lower() == "admin":
        raise HTTPException(status_code=403, detail="Admins no pueden usar el chatbot")

    try:
        ds = req.datasource

        if ds.type == "excel":
            file_id = getattr(ds, "file_id", None) or (ds.dict().get("file_id") if hasattr(ds, "dict") else None)
            path = getattr(ds, "path", None) or (ds.dict().get("path") if hasattr(ds, "dict") else None)
            if not path and not file_id:
                raise HTTPException(status_code=400, detail="Excel: debes enviar file_id o path")
            resolved_path = _path_from_file_id(file_id) if file_id else path
            sheet_name = getattr(ds, "sheet_name", None)
            if sheet_name is None:
                sheet_name = 0
            try:
                resolved_ds = ds.model_copy(update={"path": resolved_path, "sheet_name": sheet_name, "file_id": None})
            except Exception:
                _d = dict(ds if isinstance(ds, dict) else ds.dict())
                _d.update({"path": resolved_path, "sheet_name": sheet_name, "file_id": None, "type": "excel"})
                resolved_ds = _d
            resp = answer_excel(req.question, resolved_ds, req.options)

        elif ds.type in ("mysql", "postgres", "sqlite"):
            resp = answer_sql(req.question, ds.sqlalchemy_url, req.options)

        elif ds.type == "saved":
            conn = db.query(Connection).filter_by(id=ds.connection_id, is_active=True).first()
            if not conn:
                raise HTTPException(status_code=404, detail="Conexión no encontrada o inactiva")
            resp = answer_sql(req.question, conn.sqlalchemy_url, req.options)
        else:
            raise HTTPException(status_code=400, detail="Datasource no soportado")

        # >>> ADD: log éxito de consulta
        rc = len(resp.table.rows) if resp.table and resp.table.rows else 0
        log_event("info", "query_ok", actor=payload.get("sub"), path="/chat",
                  meta={"datasource": ds.type, "rows": rc, "lang": req.options.language})

    except HTTPException as e:
        # >>> ADD: log error funcional
        log_event("error", "query_error", actor=payload.get("sub"), path="/chat",
                  meta={"status": e.status_code, "detail": str(e.detail), "datasource": getattr(req.datasource, "type", None)})
        raise
    except Exception as e:
        # >>> ADD: log error inesperado
        log_event("error", "query_error", actor=payload.get("sub"), path="/chat",
                  meta={"status": 500, "detail": str(e), "datasource": getattr(req.datasource, "type", None)})
        raise

    # (historial se mantiene igual)
    try:
        user_id = str(payload.get("sub") or payload.get("user_id") or payload.get("email") or "anonymous")
        row_count = len(resp.table.rows) if resp.table and resp.table.rows else 0
        history_store.add(
            user_id=user_id,
            question=req.question,
            datasource=req.datasource.model_dump() if hasattr(req.datasource, "model_dump") else req.datasource,
            generated=resp.generated,
            row_count=row_count,
            answer_text=resp.answer_text,
        )
    except Exception as _e:
        print("WARN: no se pudo guardar historial:", _e)

    return resp


@app.get("/history", response_model=HistoryList)
def get_history(
    limit: int = 100,
    offset: int = 0,
    payload: dict = Depends(require_jwt),
    db: Session = Depends(get_db),   # opcional, lo dejo por consistencia
):
    user_id = str(
        payload.get("sub")
        or payload.get("user_id")
        or payload.get("email")
        or "anonymous"
    )
    rows = history_store.list(user_id=user_id, limit=limit, offset=offset)

    items = [
        HistoryItem(
            id=r["id"],
            question=r["question"],
            datasource=r["datasource"],
            generated=r["generated"],
            row_count=r["row_count"],
            created_at=r["created_at"],
            answer_text=r.get("answer_text", "") or "",
        )
        for r in rows
    ]
    total = history_store.count(user_id=user_id)
    log_event("info", "history_list", actor=user_id, path="/history", meta={"count": len(items)})
    return HistoryList(items=items, total=total)

@app.delete("/history")
def clear_history(
    payload: dict = Depends(require_jwt),
    db: Session = Depends(get_db),   # opcional, lo dejo por consistencia
):
    user_id = str(
        payload.get("sub")
        or payload.get("user_id")
        or payload.get("email")
        or "anonymous"
    )
    deleted = history_store.clear(user_id=user_id)
    log_event("warning", "history_clear", actor=user_id, path="/history", meta={"deleted": deleted})
    return {"deleted": deleted}


# =========================
# Quick self-test (solo si ejecutas: python app.py)
# =========================
if __name__ == "__main__":
    import os

    os.environ.setdefault("JWT_SECRET", "dev")
    # Prueba local con Excel (ajusta la ruta):
    if os.path.exists("./empleados.csv"):
        req = ChatRequest(
            question="salario promedio por género",
            datasource=ExcelSource(path="./empleados.csv"),
        )
        print(chat(req, _={}))
    else:
        print(
            "Crea ./empleados.csv con columnas: genero,salario,departamento … para la prueba rápida."
        )

@app.get("/excel/sheets")
def excel_sheets(
    path: Optional[str] = Query(None, description="Ruta absoluta en el servidor (legado)"),
    file_id: Optional[str] = Query(None, description="ID del archivo subido"),
    user=Depends(require_non_admin),
):
    if not path and not file_id:
        raise HTTPException(status_code=400, detail="Debes enviar file_id o path")

    resolved_path = _path_from_file_id(file_id) if file_id else path
    if not resolved_path or not os.path.exists(resolved_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    ext = os.path.splitext(resolved_path)[1].lower()

    try:
        if ext in {".xlsx", ".xls"}:
            # Usa xlrd para .xls; para .xlsx deja que pandas elija (openpyxl)
            engine = "xlrd" if ext == ".xls" else None
            with pd.ExcelFile(resolved_path, engine=engine) as xf:
                sheet_names = xf.sheet_names
            log_event(
                "info",
                "excel_sheets",
                actor=(user.get("sub") or user.get("email")),
                path="/excel/sheets",
                meta={"file": os.path.basename(resolved_path), "sheets": len(sheet_names)},
            )
            return {"sheets": sheet_names}

        elif ext == ".csv":
            # CSV no tiene hojas
            log_event(
                "info",
                "excel_sheets",
                actor=(user.get("sub") or user.get("email")),
                path="/excel/sheets",
                meta={"file": os.path.basename(resolved_path), "sheets": 1, "csv": True},
            )
            return {"sheets": ["__csv__"]}

        else:
            raise HTTPException(status_code=400, detail=f"Extensión no soportada: {ext}")

    except ImportError as e:
        # Mensaje claro si falta xlrd para .xls
        if ext == ".xls" and "xlrd" in str(e).lower():
            raise HTTPException(status_code=400, detail="Para leer .xls instala xlrd (pip install xlrd).")
        raise
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No fue posible leer el archivo: {e}")


    
@app.get("/excel/preview")
def excel_preview(
    sheet_name: Optional[Union[str, int]] = Query(None, description="Nombre o índice de la hoja (Excel)"),
    offset: int = Query(0, ge=0, description="Desplazamiento de filas (>= 0)"),
    limit: int = Query(50, ge=1, le=1000, description="Cantidad de filas a devolver (1..1000)"),
    path: Optional[str] = Query(None, description="Ruta absoluta en el servidor (legado)"),
    file_id: Optional[str] = Query(None, description="ID del archivo subido"),
    user=Depends(require_non_admin),
):
    if not path and not file_id:
        raise HTTPException(status_code=400, detail="Debes enviar file_id o path")

    resolved_path = _path_from_file_id(file_id) if file_id else path
    if not resolved_path or not os.path.exists(resolved_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    ext = os.path.splitext(resolved_path)[1].lower()

    try:
        if ext in {".xlsx", ".xls"}:
            # --- Normaliza sheet_name para Excel ---
            def _norm_sheet(s):
                if s is None:
                    return 0
                if isinstance(s, str):
                    s2 = s.strip()
                    if s2 == "" or s2 == "__csv__":
                        return 0
                    try:
                        return int(s2)  # si viene "0", "1", ...
                    except Exception:
                        return s2        # nombre de hoja
                return s

            target_sheet = _norm_sheet(sheet_name)

            # --- Usa xlrd para .xls; openpyxl por defecto para .xlsx ---
            engine = "xlrd" if ext == ".xls" else None
            df = pd.read_excel(resolved_path, sheet_name=target_sheet, engine=engine)

            total = int(len(df))
            if offset >= total:
                log_event(
                    "info", "excel_preview",
                    actor=(user.get("sub") or user.get("email")),
                    path="/excel/preview",
                    meta={"file": os.path.basename(resolved_path), "sheet": target_sheet, "returned": 0, "total": total}
                )
                return {
                    "columns": list(df.columns.astype(str)),
                    "rows": [],
                    "page": {"offset": offset, "limit": limit, "total": total},
                }
                # LOG
                log_event(
                    "info", "excel_preview",
                    actor=(user.get("sub") or user.get("email") or ""),
                    path="/excel/preview",
                    meta={
                        "file": os.path.basename(resolved_path),
                        "sheet": str(target_sheet),
                        "offset": offset, "limit": limit,
                        "returned": 0
                    }
                )
                return result

            window = df.iloc[offset: offset + limit]
            columns = list(window.columns.astype(str))
            rows = window.where(pd.notna(window), None).values.tolist()

            log_event(
                "info", "excel_preview",
                actor=(user.get("sub") or user.get("email")),
                path="/excel/preview",
                meta={
                    "file": os.path.basename(resolved_path),
                    "sheet": target_sheet,
                    "returned": len(rows),
                    "total": total,
                    "offset": offset,
                    "limit": limit
                }
            )

            result = {
                "columns": columns,
                "rows": rows,
                "page": {"offset": offset, "limit": limit, "total": total},
            }
            # LOG
            log_event(
                "info", "excel_preview",
                actor=(user.get("sub") or user.get("email") or ""),
                path="/excel/preview",
                meta={
                    "file": os.path.basename(resolved_path),
                    "sheet": str(target_sheet),
                    "offset": offset, "limit": limit,
                    "returned": len(rows)
                }
            )
            return result

        elif ext == ".csv":
            # --- CSV tal cual lo tenías ---
            head_df = pd.read_csv(resolved_path, nrows=0)
            columns = list(head_df.columns.astype(str))

            with open(resolved_path, "r", encoding="utf-8", errors="ignore") as f:
                total = sum(1 for _ in f) - 1
                if total < 0:
                    total = 0

            if offset >= total:
                log_event(
                    "info", "excel_preview",
                    actor=(user.get("sub") or user.get("email")),
                    path="/excel/preview",
                    meta={"file": os.path.basename(resolved_path), "csv": True, "returned": 0, "total": total}
                )
                return {
                    "columns": columns,
                    "rows": [],
                    "page": {"offset": offset, "limit": limit, "total": total},
                }
                # LOG
                log_event(
                    "info", "excel_preview",
                    actor=(user.get("sub") or user.get("email") or ""),
                    path="/excel/preview",
                    meta={
                        "file": os.path.basename(resolved_path),
                        "sheet": "__csv__",
                        "offset": offset, "limit": limit,
                        "returned": 0
                    }
                )
                return result

            window = pd.read_csv(
                resolved_path,
                skiprows=range(1, 1 + offset),  # saltar header + offset
                nrows=limit,
                header=None,
            )
            window.columns = columns
            rows = window.where(pd.notna(window), None).values.tolist()

            log_event(
                "info", "excel_preview",
                actor=(user.get("sub") or user.get("email")),
                path="/excel/preview",
                meta={
                    "file": os.path.basename(resolved_path),
                    "csv": True,
                    "returned": len(rows),
                    "total": total,
                    "offset": offset,
                    "limit": limit
                }
            )

            return {
                "columns": columns,
                "rows": rows,
                "page": {"offset": offset, "limit": limit, "total": total},
            }
            # LOG
            log_event(
                "info", "excel_preview",
                actor=(user.get("sub") or user.get("email") or ""),
                path="/excel/preview",
                meta={
                    "file": os.path.basename(resolved_path),
                    "sheet": "__csv__",
                    "offset": offset, "limit": limit,
                    "returned": len(rows)
                }
            )
            return result

        else:
            raise HTTPException(status_code=400, detail=f"Extensión no soportada: {ext}")

    except ImportError as e:
        # Mensaje claro si falta xlrd para .xls
        if ext == ".xls" and "xlrd" in str(e).lower():
            raise HTTPException(status_code=400, detail="Para leer .xls instala xlrd (pip install xlrd).")
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Parámetros inválidos: {ve}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No fue posible previsualizar el archivo: {e}")
