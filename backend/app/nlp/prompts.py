from langchain.prompts import ChatPromptTemplate

# El contexto de esquema se inyecta dinámicamente (tablas, columnas o cabeceras de Excel).
BASE_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "ESQUEMA DISPONIBLE:\n{schema_hint}\n"
     "Responde SOLO con un JSON válido que cumpla exactamente este formato:\n"
     "{{\n"
     "  \"source\": \"sql|excel\",\n"
     "  \"operation\": \"COUNT|SELECT|SUM|AVG|MIN|MAX|DISTINCT|TOP|GROUP_BY\",\n"
     "  \"table\": \"string | null\",\n"
     "  \"sheet\": \"string | null\",\n"
     "  \"columns\": [\"columna1\", \"columna2\"],\n"
     "  \"filters\": [{{\"column\": \"string\", \"op\": \"=|!=|<|>|<=|>=|LIKE|IN|NOT IN|BETWEEN\", \"value\": \"string\"}}],\n"
     "  \"group_by\": [\"columna\"],\n"
     "  \"order_by\": [\"columna\"],\n"
     "  \"limit\": number | null,\n"
     "  \"question\": \"string\",\n"
     "  \"rationale\": \"string | null\"\n"
     "}}\n"
     "No agregues explicaciones fuera del JSON.")
])
