from typing import List
from .schemas import Intent, Filter

def _filters_sql(filters: List[Filter]) -> str:
    if not filters: return ""
    parts = []
    for f in filters:
        val = f.value
        # Si parece numérico, no comillar; si no, comillar simple
        if not val.replace(".","",1).isdigit():
            val = f"'{val}'"
        parts.append(f"{f.column} {f.op} {val}")
    return " WHERE " + " AND ".join(parts)

def intent_to_sql(intent: Intent) -> str:
    table = intent.table or "tabla"
    cols = intent.columns or ["*"]

    if intent.operation == "COUNT":
        base = f"SELECT COUNT(*) AS total FROM {table}"
    elif intent.operation in {"SUM","AVG","MIN","MAX"} and len(cols) == 1:
        base = f"SELECT {intent.operation}({cols[0]}) AS value FROM {table}"
    elif intent.operation == "DISTINCT" and len(cols) >= 1:
        base = f"SELECT DISTINCT {', '.join(cols)} FROM {table}"
    elif intent.operation == "TOP":
        base = f"SELECT {', '.join(cols)} FROM {table}"
    elif intent.operation == "GROUP_BY" and intent.group_by:
        aggr = ", ".join(cols) if cols else "*"
        base = f"SELECT {', '.join(intent.group_by)}, {aggr} FROM {table}"
    else:
        base = f"SELECT {', '.join(cols)} FROM {table}"

    sql = base + _filters_sql(intent.filters)

    if intent.operation == "GROUP_BY" and intent.group_by:
        sql += f" GROUP BY {', '.join(intent.group_by)}"

    if intent.order_by:
        sql += f" ORDER BY {', '.join(intent.order_by)}"

    if intent.operation == "TOP" and intent.limit:
        sql += f" LIMIT {intent.limit}"
    elif intent.limit is not None:
        sql += f" LIMIT {intent.limit}"

    return sql + ";"

def intent_to_pandas(intent: Intent, df_name: str = "df") -> str:
    """
    Devuelve una cadena con la 'operación pandas' a ejecutar sobre un DataFrame llamado df_name.
    Nota: la ejecución real NO es parte de HU06.
    """
    filt = " & ".join([f"({df_name}['{f.column}'] { '==' if f.op=='=' else f.op } {repr(f.value)})" for f in intent.filters]) or "True"
    select_cols = intent.columns if intent.columns else None

    if intent.operation == "COUNT":
        expr = f"{df_name}.loc[{filt}].shape[0]"
    elif intent.operation in {"SUM","AVG","MIN","MAX"} and len(intent.columns)==1:
        op_map = {"SUM":"sum","AVG":"mean","MIN":"min","MAX":"max"}
        expr = f"{df_name}.loc[{filt}, '{intent.columns[0]}'].{op_map[intent.operation]}()"
    elif intent.operation == "DISTINCT" and select_cols:
        expr = f"{df_name}.loc[{filt}, {select_cols}].drop_duplicates()"
    else:
        if select_cols:
            expr = f"{df_name}.loc[{filt}, {select_cols}]"
        else:
            expr = f"{df_name}.loc[{filt}]"

    if intent.limit:
        expr = f"({expr}).head({intent.limit})"

    return expr
