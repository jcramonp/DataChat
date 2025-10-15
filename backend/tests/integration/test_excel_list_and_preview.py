# backend/tests/integration/test_excel_list_and_preview.py
from httpx import AsyncClient
from backend.app_min import app
import pytest

@pytest.mark.asyncio
async def test_list_and_preview_sheets(tmp_path):
    # asume que el backend tiene datos de prueba apuntando a un .xlsx
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/excel/listSheets")
        assert r.status_code == 200
        sheets = r.json()["sheets"]
        assert len(sheets) >= 1

        r2 = await ac.get(f"/excel/preview?sheet={sheets[0]}&limit=5")
        assert r2.status_code == 200
        data = r2.json()
        assert "rows" in data and len(data["rows"]) <= 5
