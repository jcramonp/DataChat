import os
import re
from typing import Optional, Literal, List, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from langchain_community.llms import Ollama
from langchain_community.utilities.sql_database import SQLDatabase
from langchain.chains import create_sql_query_chain

load_dotenv()

# ---------- Config ----------
MODEL_NAME = os.getenv("MODEL_NAME", "llama3")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./datachat.db")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# ---------- FastAPI ----------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- DB ----------
engine: Engine = create_engine(DATABASE_URL)
db = SQLDatabase.from_uri(DATABASE_URL)

# ---------- LLM ----------
llm = Ollama(model=MODEL_NAME, base_url=OLLAMA_BASE_URL, temperature=0)
sql_chain = create_sql_query_chain(llm, db)


# ---------- Función de normalización ----------
def normalize_sql_for_sqlite(sql: str) -> str:
    """Ajusta queries SQL generadas para compatibilidad con SQLite."""
    s = sql

    # --- Compatibilidad de funciones (Postgres → SQLite) ---
    s = re.sub(
        r"EXTRACT\s*\(\s*YEAR\s+FROM\s+([^)]+)\)",
        r"strftime('%Y', \1)",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(
        r"EXTRACT\s*\(\s*MONTH\s+FROM\s+([^)]+)\)",
        r"strftime('%m', \1)",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(r"\bNOW\s*\(\s*\)", "CURRENT_TIMESTAMP", s, flags=re.IGNORECASE)

    # --- Arreglos específicos para fechas/años ---
    s = re.sub(
        r"strftime\('%Y'\s*,\s*([^)]+)\)\s*=\s*(\d{4})\b",
        r"strftime('%Y', \1) = '\2'",
        s,
    )
    s = re.sub(
        r"\s+AND\s+\"?\w+\"?\s*=\s*date\('now'[^)]*\)\s*",
        " ",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(
        r"\s+WHERE\s+\"?\w+\"?\s*=\s*date\('now'[^)]*\)\s*(AND|OR)?\s*",
        lambda m: " WHERE " if m.group(1) else " ",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(r"\bWHERE\s+(AND|OR)\b", "WHERE ", s, flags=re.IGNORECASE)
    s = re.sub(r"\bWHERE\s*(;|\Z)", r"\1", s, flags=re.IGNORECASE)

    # Espacios múltiples -> uno solo
    s = re.sub(r"\s{2,}", " ", s).strip()

    return s


# ---------- Models ----------
class QueryIn(BaseModel):
    question: str
    target: Optional[Literal["sql", "excel"]] = "sql"


class Translation(BaseModel):
    type: Literal["sql", "excel"]
    text: str


class QueryOut(BaseModel):
    answer: str
    translation: Optional[Translation] = None
    rows: Optional[List[Dict]] = None


# ---------- Endpoints ----------
@app.get("/")
def health() -> Dict[str, str]:
    return {"message": "DataChat (Ollama) OK"}


@app.post("/query", response_model=QueryOut)
def query_data(payload: QueryIn) -> QueryOut:
    q = (payload.question or "").strip()
    if not q:
        raise HTTPException(status_code=400, detail="La pregunta está vacía")

    try:
        # Generar SQL
        sql_raw: str = sql_chain.invoke({"question": q})
        # print("[RAW OUTPUT]", sql_raw)

        # Extraer SELECT ...;
        match = re.search(r"(SELECT .*?;)", sql_raw, re.IGNORECASE | re.DOTALL)
        sql_clean = match.group(1) if match else sql_raw.split("SQLQuery:")[-1].strip()
        sql_safe = sql_clean.rstrip(";") + ";"

        # Normalizar para SQLite
        sql_sqlite = normalize_sql_for_sqlite(sql_safe)
        # print("[SQL SQLITE]", sql_sqlite)

        # Ejecutar
        with engine.connect() as conn:
            result = conn.execute(text(sql_sqlite))
            rows = [dict(r._mapping) for r in result]

        # Respuesta
        if not rows:
            answer = "No se encontraron resultados."
        elif len(rows) == 1 and len(rows[0]) == 1:
            key = list(rows[0].keys())[0]
            answer = f"{key}: {rows[0][key]}"
        else:
            answer = f"Se recuperaron {len(rows)} filas."

        return QueryOut(
            answer=answer,
            translation=Translation(type="sql", text=sql_sqlite),
            rows=rows,
        )

    except Exception as e:
        # print("[ERROR]", e)
        raise HTTPException(status_code=500, detail=f"Error inesperado: {e}")
