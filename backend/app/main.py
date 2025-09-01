from fastapi import FastAPI
from app.api.routes import router as nlp_router

app = FastAPI(title="DataChat Backend")

app.include_router(nlp_router, prefix="/nlp", tags=["NLP"])

@app.get("/")
def health():
    return {"status": "ok"}
