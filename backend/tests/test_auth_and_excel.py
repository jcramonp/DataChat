from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ask_requires_auth():
    r = client.post("/ask", json={"question":"test"})
    assert r.status_code in (401,403)

def test_excel_sheets_contract():
    r = client.post("/excel/sheets", json={"path":"C:/data/empleados.xlsx"})
    assert r.status_code in (200,400,404)
    # si 200, valida shape
    if r.status_code == 200:
        data = r.json()
        assert isinstance(data.get("sheets", []), list)
