from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173","*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

class QueryIn(BaseModel): question: str
class QueryOut(BaseModel): answer: str

@app.post("/query", response_model=QueryOut)
def query_data(payload: QueryIn):
    return {"answer": f"(MVP) Recibí tu pregunta: “{payload.question}”"}
