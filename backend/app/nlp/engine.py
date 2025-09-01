# backend/app/nlp/engine.py
import json
from langchain_community.chat_models import ChatOllama
from langchain.output_parsers import PydanticOutputParser
from .schemas import Intent
from .prompts import BASE_PROMPT

class NLPEngine:
    def __init__(self, model_name: str = "llama3", temperature: float = 0.0):
        # Usa Ollama en localhost
        self.llm = ChatOllama(model=model_name, temperature=temperature)
        self.parser = PydanticOutputParser(pydantic_object=Intent)

    def interpret(self, question: str, schema_hint: str, source_hint: str | None = None) -> Intent:
        prompt = BASE_PROMPT.partial(schema_hint=schema_hint)
        messages = prompt.format_messages(
            question=question + (f"\nFuente esperada: {source_hint}" if source_hint else "")
        )

        raw = self.llm.invoke(messages).content
        print("=== RAW OUTPUT FROM LLM ===")
        print(raw)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}")
            data = json.loads(raw[start:end+1])

        return self.parser.parse(json.dumps(data))
