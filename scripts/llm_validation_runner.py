# scripts/llm_validation_runner.py
import json
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# ==============================
# Cargar variables de entorno
# ==============================
load_dotenv()

# Archivos
PROMPTS_FILE = Path(os.getenv("PROMPTS_FILE", "tests/prompts_llm_validation.txt"))
RESULTS_JSON = Path(os.getenv("RESULTS_JSON", "tests/llm_evaluation_outputs.json"))
RESULTS_MD = Path(os.getenv("RESULTS_MD", "tests/llm_evaluation_table.md"))

# Backend (LLM primario = tu DataChat con gpt-4o-mini)
PRIMARY_BASE_URL = os.getenv("PRIMARY_BASE_URL", "http://127.0.0.1:8000")
PRIMARY_CHAT_ENDPOINT = os.getenv("PRIMARY_CHAT_ENDPOINT", "/chat")

# Campos del body
PROMPT_FIELD = os.getenv("PROMPT_FIELD", "question")
DATASOURCE_FIELD = os.getenv("DATASOURCE_FIELD", "datasource")
OPTIONS_FIELD = "options"  # fijo en tu API

# DATASOURCE_JSON -> dict (obligatorio)
_ds_raw = os.getenv("DATASOURCE_JSON", "").strip()
if _ds_raw:
    try:
        DATASOURCE_OBJ = json.loads(_ds_raw)
    except json.JSONDecodeError:
        raise RuntimeError("ERROR: DATASOURCE_JSON no es JSON válido en .env")
else:
    raise RuntimeError("ERROR: Debes definir DATASOURCE_JSON en tu .env (diccionario con type/sqlalchemy_url)")

# OPTIONS_JSON -> dict (opcional)
_opt_raw = os.getenv("OPTIONS_JSON", "").strip()
if _opt_raw:
    try:
        OPTIONS_OBJ = json.loads(_opt_raw)
    except json.JSONDecodeError:
        raise RuntimeError("ERROR: OPTIONS_JSON no es JSON válido en .env")
else:
    OPTIONS_OBJ = {}

# Clave preferida en la respuesta (por swagger: answer_text)
PRIMARY_RESPONSE_KEY = os.getenv("PRIMARY_RESPONSE_KEY", "answer_text")

# Auth del endpoint
PRIMARY_AUTH_HEADER_NAME = os.getenv("PRIMARY_AUTH_HEADER_NAME", "Authorization")
PRIMARY_AUTH_TOKEN = os.getenv("PRIMARY_AUTH_TOKEN", "")  # ej: "Bearer <JWT>"

# Timeout / pausas
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))
INTER_PROMPT_SLEEP = float(os.getenv("INTER_PROMPT_SLEEP", "0.8"))

# Evaluador local (Ollama)
EVAL_MODEL = os.getenv("EVAL_MODEL", "qwen2.5:7b-instruct")

# ==============================
# Utilidades
# ==============================

def load_prompts(path: Path) -> list[str]:
    if not path.exists():
        raise FileNotFoundError(f"No existe el archivo de prompts: {path}")
    items = []
    with path.open("r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            # soporta líneas "1. prompt"
            if line[0].isdigit() and ". " in line:
                try:
                    _, rest = line.split(". ", 1)
                    line = rest.strip()
                except ValueError:
                    pass
            items.append(line)
    if not items:
        raise ValueError("El archivo de prompts está vacío.")
    return items


def call_primary_llm(prompt: str) -> str:
    """
    Llama a tu backend:
      POST {PRIMARY_BASE_URL}{PRIMARY_CHAT_ENDPOINT}
      Body: { "question": <prompt>, "datasource": <DATASOURCE_OBJ>, "options": <OPTIONS_OBJ?> }
      Auth: Bearer <token> (si se define)
    """
    url = PRIMARY_BASE_URL.rstrip("/") + PRIMARY_CHAT_ENDPOINT

    payload = {
        PROMPT_FIELD: prompt,
        DATASOURCE_FIELD: DATASOURCE_OBJ,
    }
    if OPTIONS_OBJ:
        payload[OPTIONS_FIELD] = OPTIONS_OBJ

    headers = {"Content-Type": "application/json"}
    if PRIMARY_AUTH_HEADER_NAME and PRIMARY_AUTH_TOKEN:
        headers[PRIMARY_AUTH_HEADER_NAME] = PRIMARY_AUTH_TOKEN

    r = requests.post(url, json=payload, headers=headers, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    data = r.json()

    # 1) Clave fija si se definió por env (soporta "a.b" anidado)
    if PRIMARY_RESPONSE_KEY and isinstance(data, dict):
        cur = data
        ok = True
        for part in PRIMARY_RESPONSE_KEY.split("."):
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            else:
                ok = False
                break
        if ok and isinstance(cur, (str, int, float)):
            return str(cur)

    # 2) Fallbacks comunes
    if isinstance(data, dict):
        for k in ("reply", "answer", "output", "response", "content", "text", "message"):
            if k in data:
                return str(data[k])
        # anidado
        if "data" in data and isinstance(data["data"], dict):
            for k in ("reply", "answer", "output", "response", "content", "text", "message"):
                if k in data["data"]:
                    return str(data["data"][k])

    # 3) Último recurso: serializa todo
    return json.dumps(data, ensure_ascii=False)


def eval_prompt_template(prompt: str, response_text: str) -> str:
    # Prompt ajustado para Qwen/Ollama a fin de que retorne JSON estricto
    return f"""
You are an evaluator. Rate the following assistant response on a 1–5 scale for:
- truthfulness
- completeness
- relevance
- clarity

Rules:
- Be strict but fair.
- If response is wrong or hallucinated, truthfulness <= 2.
- If key info is missing, completeness <= 3.
- If it doesn't answer the prompt, relevance <= 2.
- If confusing, clarity <= 3.

Return ONLY a valid JSON object, no extra text, exactly with keys:
  "truthfulness", "completeness", "relevance", "clarity", "comment"

Prompt:
\"\"\"{prompt}\"\"\"

Response:
\"\"\"{response_text}\"\"\"
""".strip()


def evaluate_with_ollama(prompt: str, response_text: str) -> dict:
    # Cliente Python de Ollama
    import ollama
    res = ollama.chat(
        model=EVAL_MODEL,
        messages=[{"role": "user", "content": eval_prompt_template(prompt, response_text)}],
        options={"temperature": 0.2},  # más determinista
    )
    text = (res.get("message", {}) or {}).get("content", "") or ""
    return safe_json(text)


def safe_json(text: str) -> dict:
    try:
        data = json.loads(text)
    except Exception:
        return {
            "truthfulness": 0,
            "completeness": 0,
            "relevance": 0,
            "clarity": 0,
            "comment": f"[INVALID_JSON] {text[:300]}",
        }
    for k in ("truthfulness", "completeness", "relevance", "clarity"):
        try:
            data[k] = float(data.get(k, 0))
        except Exception:
            data[k] = 0.0
    data["comment"] = str(data.get("comment", ""))[:600]
    return data


def compute_averages(rows: list[dict]) -> dict:
    n = len(rows)
    if n == 0:
        return {k: 0.0 for k in ("truthfulness", "completeness", "relevance", "clarity")}
    sums = {k: 0.0 for k in ("truthfulness", "completeness", "relevance", "clarity")}
    for r in rows:
        for k in sums:
            sums[k] += float(r.get(k, 0))
    return {k: round(v / n, 2) for k, v in sums.items()}


def generate_markdown_table(rows: list[dict], averages: dict) -> str:
    lines = []
    lines.append("| # | Prompt | Truthfulness | Completeness | Relevance | Clarity | Evaluator Comment |")
    lines.append("|---|--------|--------------|--------------|-----------|---------|-------------------|")
    for r in rows:
        idx = r["id"]
        prompt = r["prompt"].replace("\n", " ")
        if len(prompt) > 80:
            prompt = prompt[:77] + "..."
        comment = r.get("comment", "").replace("|", "\\|").replace("\n", " ")
        lines.append(
            f"| {idx} | {prompt} | {r['truthfulness']} | {r['completeness']} | "
            f"{r['relevance']} | {r['clarity']} | {comment} |"
        )
    lines.append("")
    lines.append("**Average Scores:**")
    lines.append(f"- Truthfulness: **{averages['truthfulness']}**")
    lines.append(f"- Completeness: **{averages['completeness']}**")
    lines.append(f"- Relevance: **{averages['relevance']}**")
    lines.append(f"- Clarity: **{averages['clarity']}**")
    return "\n".join(lines)


def main():
    prompts = load_prompts(PROMPTS_FILE)
    RESULTS_JSON.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    for i, prompt in enumerate(prompts, start=1):
        print(f"\n=== Prompt {i}/{len(prompts)} ===\n{prompt}")

        primary_resp = call_primary_llm(prompt)
        print(f"Primary: {primary_resp[:220]}{'...' if len(primary_resp) > 220 else ''}")

        eval_dict = evaluate_with_ollama(prompt, primary_resp)
        print(f"Score: {eval_dict}")

        rows.append({
            "id": i,
            "prompt": prompt,
            "response_main": primary_resp,
            "truthfulness": eval_dict["truthfulness"],
            "completeness": eval_dict["completeness"],
            "relevance": eval_dict["relevance"],
            "clarity": eval_dict["clarity"],
            "comment": eval_dict["comment"],
        })

        time.sleep(INTER_PROMPT_SLEEP)

    with RESULTS_JSON.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

    averages = compute_averages(rows)
    md = generate_markdown_table(rows, averages)
    with RESULTS_MD.open("w", encoding="utf-8") as f:
        f.write(md)

    print(f"\nJSON guardado en: {RESULTS_JSON}")
    print(f"Tabla Markdown guardada en: {RESULTS_MD}")
    print("\n✔ Copia la tabla a docs/LLM_Validation_Test_Results.md (sección 4).")


if __name__ == "__main__":
    main()
