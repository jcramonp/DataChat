from __future__ import annotations
import os
import json
import re
from typing import Any, Dict, List, Optional, Tuple, Literal, Union, Annotated

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator


from starlette.middleware.cors import CORSMiddleware

import jwt
from jwt import PyJWTError

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

import pandas as pd

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DataChatbot MVP", version="0.1.0")


JWT_SECRET = "supersecret"   # ⚠️ cambia esto por algo seguro
JWT_ALG = "HS256"
JWT_EXPIRE_MINUTES = 120
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Usuarios en memoria (MVP) ---
_users = {
    "admin@datac.chat": {
        "password_hash": pwd_ctx.hash("admin123"),
        "role": "admin"
    },
    "user@datac.chat": {
        "password_hash": pwd_ctx.hash("user123"),
        "role": "user"
    },
}

auth_scheme = HTTPBearer(auto_error=True)

def require_jwt(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme)) -> dict:
    """
    Lee el header Authorization: Bearer <token>, decodifica el JWT y retorna el payload.
    Lanza 401 si el token falta o es inválido/expirado.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        # payload esperado: {"sub": email, "role": "...", "exp": ...}
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

def create_jwt(sub: str, role: str, extra: dict | None = None) -> str:
    payload = {
        "sub": sub,
        "role": role,
        "iat": int(datetime.now(tz=timezone.utc).timestamp()),
        "exp": int((datetime.now(tz=timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def get_current_user(payload: dict = Depends(require_jwt)) -> dict:
    # require_jwt ya decodifica y devuelve el payload
    # aquí podrías reconfirmar contra DB si quieres (revocaciones, is_active, etc.)
    return {"email": payload.get("sub"), "role": payload.get("role")}

def require_roles(roles: list[str]):
    def _dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient role")
        return user
    return _dep

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Literal["user", "admin"] = "user"

@app.post("/auth/login")
def auth_login(req: LoginRequest):
    u = _users.get(req.email.lower().strip())
    if not u or not pwd_ctx.verify(req.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = create_jwt(sub=req.email, role=u["role"])
    return {"access_token": token, "token_type": "bearer", "role": u["role"]}

@app.post("/auth/register")
def auth_register(req: RegisterRequest, _: dict = Depends(require_roles(["admin"]))):
    email = req.email.lower().strip()
    if email in _users:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    _users[email] = {"password_hash": pwd_ctx.hash(req.password), "role": req.role}
    return {"ok": True, "email": email, "role": req.role}

@app.get("/auth/me")
def auth_me(user=Depends(get_current_user)):
    return user

@app.get("/admin/ping")
def admin_ping(_: dict = Depends(require_roles(["admin"]))):
    return {"ok": True, "msg": "pong (admin)"}


# =========================
# Auth (MVP)
# =========================
JWT_SECRET = os.getenv("JWT_SECRET", "dev")
auth_scheme = HTTPBearer()


print("[boot] app_min desde:", __file__)
print("[exec_pandas] v2 cargada (sin locals())")


def require_jwt(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    try:
        payload = jwt.decode(
            token.credentials, JWT_SECRET, algorithms=["HS256"]
        )  # nosec - MVP
        return payload
    except PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


import json, re, unicodedata


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
_ALIAS_MAP = {
    "eq": "==",
    "ne": "!=",
    "gt": ">",
    "gte": ">=",
    "lt": "<",
    "lte": "<=",
}


def _normalize_op(op: str) -> str:
    s = str(op).strip().lower()
    return _ALIAS_MAP.get(s, op)


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

    # Acepta aliases y los convierte a símbolos ANTES de validar el Literal
    @field_validator("operator", mode="before")
    @classmethod
    def _before_operator(cls, v):
        return _normalize_op(v)


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


class ExcelSource(BaseModel):
    type: Literal["excel"] = "excel"
    path: str
    sheet_name: int | str | None = 0


DataSource = Annotated[Union[MySQLSource, ExcelSource], Field(discriminator="type")]


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


# =========================
# Helpers: schema extraction
# =========================


def extract_mysql_schema(
    sqlalchemy_url: str, max_cols: int = 80, max_tables: int = 50
) -> Dict[str, List[str]]:
    engine = create_engine(
        sqlalchemy_url, connect_args={"charset": "utf8mb4"}, pool_pre_ping=True
    )
    insp = inspect(engine)
    schema: Dict[str, List[str]] = {}
    for t in insp.get_table_names()[:max_tables]:
        try:
            cols = [c["name"] for c in insp.get_columns(t)][:max_cols]
            schema[t] = cols
        except Exception:
            continue
    engine.dispose()
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
        ("human", "Esquema (tabla: [columnas]):\n{schema}\n\nPregunta: {question}"),
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


def answer_mysql(question: str, source: MySQLSource, opts: ChatOptions) -> ChatResponse:
    schema = extract_mysql_schema(source.sqlalchemy_url)
    prompt = SQL_PROMPT.format_messages(
        schema=json.dumps(schema, ensure_ascii=False), question=question
    )
    sql_code = (llm | parser).invoke(prompt)
    sql_code = sanitize_sql(sql_code, limit=opts.max_rows)

    engine = create_engine(
        source.sqlalchemy_url, connect_args={"charset": "utf8mb4"}, pool_pre_ping=True
    )
    try:
        with engine.connect() as conn:
            res = conn.execute(text(sql_code))
            rows = res.fetchall()
            cols = list(res.keys())
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=400, detail=f"Error SQL: {str(e)} | Query: {sql_code}"
        )
    finally:
        engine.dispose()

    df = pd.DataFrame(rows, columns=cols)
    table = TableData(
        columns=cols, rows=df.astype(object).where(pd.notnull(df), None).values.tolist()
    )

    answer_text = (
        f"Mostrando {len(table.rows)} fila(s)."
        if opts.language == "es"
        else f"Showing {len(table.rows)} row(s)."
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

    answer_text = (
        f"Mostrando {len(table.rows)} fila(s)."
        if opts.language == "es"
        else f"Showing {len(table.rows)} row(s)."
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
app = FastAPI(title="DataChatbot MVP", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, _: dict = Depends(require_jwt)):
    if req.datasource.type == "mysql":
        return answer_mysql(req.question, req.datasource, req.options)
    elif req.datasource.type == "excel":
        return answer_excel(req.question, req.datasource, req.options)
    else:
        raise HTTPException(status_code=400, detail="Datasource no soportado")


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
