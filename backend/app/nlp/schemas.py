from typing import List, Optional, Literal
from pydantic import BaseModel, field_validator

OpType = Literal["COUNT","SELECT","SUM","AVG","MIN","MAX","DISTINCT","TOP","GROUP_BY"]

class Filter(BaseModel):
    column: str
    op: str
    value: str

class Intent(BaseModel):
    source: Optional[str] = None
    operation: Optional[str] = None
    table: Optional[str] = None
    sheet: Optional[str] = None
    columns: List[str] = []
    filters: List[Filter] = []
    group_by: List[str] = []
    order_by: List[str] = []
    limit: Optional[int] = None
    question: str = ""
    rationale: Optional[str] = None

    # Normaliza source
    @field_validator("source", mode="before")
    def normalize_source(cls, v):
        if not v:
            return None
        v = v.lower()
        if v in ["sql", "sqlite"]:
            return "sql"
        if v in ["excel", "xlsx", "sheet"]:
            return "excel"
        return v

    # Normaliza operation
    @field_validator("operation", mode="before")
    def normalize_operation(cls, v):
        if not v:
            return None
        v = v.upper()
        mapping = {
            "COUNT": "COUNT",
            "SELECT": "SELECT",
            "SUM": "SUM",
            "AVG": "AVG",
            "AVERAGE": "AVG",
            "MIN": "MIN",
            "MAX": "MAX",
            "DISTINCT": "DISTINCT",
            "TOP": "TOP",
            "GROUPBY": "GROUP_BY",
            "GROUP_BY": "GROUP_BY",
        }
        return mapping.get(v, v)
