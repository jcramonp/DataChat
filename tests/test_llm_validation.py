# tests/test_llm_validation.py
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts" / "llm_validation_runner.py"
RESULTS_JSON = ROOT / "tests" / "llm_evaluation_outputs.json"

MIN_TRUTH = float(os.getenv("LLM_MIN_TRUTHFULNESS", "4.5"))
MIN_COMPLETENESS = float(os.getenv("LLM_MIN_COMPLETENESS", "4.3"))
MIN_RELEVANCE = float(os.getenv("LLM_MIN_RELEVANCE", "4.7"))
MIN_CLARITY = float(os.getenv("LLM_MIN_CLARITY", "4.3"))

def compute_averages(rows):
    keys = ["truthfulness", "completeness", "relevance", "clarity"]
    sums = {k: 0.0 for k in keys}
    n = len(rows)
    for r in rows:
        for k in keys:
            sums[k] += float(r.get(k, 0))
    return {k: round(sums[k]/n, 2) if n else 0.0 for k in keys}

def test_llm_validation_thresholds():
    assert os.getenv("OPENAI_API_KEY"), "Falta OPENAI_API_KEY en el entorno."
    # Ejecutar runner
    subprocess.run(["python", str(RUNNER)], check=True)

    assert RESULTS_JSON.exists(), f"No se encontró {RESULTS_JSON}"
    rows = json.loads(RESULTS_JSON.read_text(encoding="utf-8"))
    assert isinstance(rows, list) and rows, "Resultados de evaluación vacíos"

    avgs = compute_averages(rows)
    assert avgs["truthfulness"] >= MIN_TRUTH, f"Truthfulness {avgs['truthfulness']} < {MIN_TRUTH}"
    assert avgs["completeness"] >= MIN_COMPLETENESS, f"Completeness {avgs['completeness']} < {MIN_COMPLETENESS}"
    assert avgs["relevance"] >= MIN_RELEVANCE, f"Relevance {avgs['relevance']} < {MIN_RELEVANCE}"
    assert avgs["clarity"] >= MIN_CLARITY, f"Clarity {avgs['clarity']} < {MIN_CLARITY}"
