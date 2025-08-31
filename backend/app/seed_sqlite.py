from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///./datachat.db", future=True)

DDL = """
DROP TABLE IF EXISTS employees;
CREATE TABLE employees(
  id INTEGER PRIMARY KEY,
  name TEXT,
  age INTEGER,
  email TEXT,
  phone TEXT,
  joined_at TEXT,
  region TEXT
);
"""

INS = """
INSERT INTO employees (name, age, email, phone, joined_at, region) VALUES
('Ana', 31, 'ana@example.com',  '3001112222', '2024-02-10', 'Andean'),
('Luis', 28, NULL,               '3003334444', '2025-01-05', 'Caribbean'),
('Marta', 45, 'marta@example.com','3005556666', '2023-07-12', 'Andean'),
('Jorge', 36, 'jorge@example.com',NULL,         '2022-03-22', 'Orinoquía'),
('Sara', 33, 'sara@example.com', '3007778888', '2025-05-21', 'Pacific');
"""

def run_script_multi(conn, script: str):
    # Ejecuta cada sentencia separada por ';'
    for stmt in script.split(";"):
        sql = stmt.strip()
        if sql:
            conn.execute(text(sql))

with engine.begin() as conn:
    run_script_multi(conn, DDL)
    conn.execute(text(INS))

print("SQLite listo con datos de ejemplo.")
