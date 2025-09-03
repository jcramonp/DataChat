# backend/app/nlp/engine.py
import json
import re
from langchain_community.chat_models import ChatOllama
from langchain.output_parsers import PydanticOutputParser
from .schemas import Intent
from .prompts import BASE_PROMPT


def robust_json_loads(raw: str):
    """
    Intenta extraer un JSON válido desde la salida de un LLM.
    """
    # Buscar el primer { y el último }
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No se encontró un JSON en la respuesta del LLM")

    json_str = raw[start:end + 1]

    # Reemplazar comillas mal escapadas dentro de los valores
    # Por ejemplo: "O'Connor" -> "O\'Connor"
    json_str = re.sub(r'(?<=: )"([^"]*?)"', lambda m: '"' + m.group(1).replace('"', '\\"') + '"', json_str)

    return json.loads(json_str)

class NLPEngine:
    def __init__(self, model_name: str = "llama3", temperature: float = 1.0):
        # Usa Ollama en localhost
        self.llm = ChatOllama(model=model_name, temperature=temperature)
        self.parser = PydanticOutputParser(pydantic_object=Intent)

    def interpret(self, question: str, schema_hint: str, source_hint: str | None = None) -> Intent:
        prompt = BASE_PROMPT.partial(schema_hint=schema_hint)
        messages = prompt.format_messages(
            question=question,
            schema_hint=schema_hint,
            source_hint=source_hint or ""
        )

        raw = self.llm.invoke(messages).content
        print("=== RAW OUTPUT FROM LLM ===")
        print(raw)

        data = robust_json_loads(raw)

        return self.parser.parse(json.dumps(data))
