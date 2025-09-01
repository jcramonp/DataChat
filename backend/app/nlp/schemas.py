from typing import List, Optional, Literal
from pydantic import BaseModel

OpType = Literal["COUNT","SELECT","SUM","AVG","MIN","MAX","DISTINCT","TOP","GROUP_BY"]

class Filter(BaseModel):
    column: str
    op: Literal["=","!=","<",">","<=",">=","LIKE","IN","NOT IN","BETWEEN"]
    value: str

class Intent(BaseModel):
    source: Literal["sql","excel"]
    operation: OpType
    table: Optional[str] = None        # para SQL
    sheet: Optional[str] = None        # para Excel
    columns: List[str] = []
    filters: List[Filter] = []
    group_by: List[str] = []
    order_by: List[str] = []
    limit: Optional[int] = None
    # Texto original y explicación breve (útil para auditoría)
    question: str
    rationale: Optional[str] = None
