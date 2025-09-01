from fastapi import APIRouter
from pydantic import BaseModel
from app.nlp.engine import NLPEngine
from app.nlp.translator import intent_to_sql, intent_to_pandas

router = APIRouter()
engine = NLPEngine()

class InterpretRequest(BaseModel):
    question: str
    schema_hint: str          # En HU06 lo pasamos desde el frontend o lo trae otro servicio
    source_hint: str | None = None  # "sql" o "excel" si ya se sabe

@router.post("/interpret")
def interpret(req: InterpretRequest):
    intent = engine.interpret(req.question, req.schema_hint, req.source_hint)
    query = intent_to_sql(intent) if intent.source == "sql" else intent_to_pandas(intent)
    return {
        "intent": intent.dict(),
        "query_candidate": query
    }
