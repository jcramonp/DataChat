import { test, expect } from "@playwright/test";

test("Excel: lista de hojas y preview", async ({ page }) => {
  await page.route("**/excel/sheets", async route => {
    await route.fulfill({ json: { sheets: ["Employees", "Departments"] } });
  });
  await page.route("**/excel/preview**", async route => {
    await route.fulfill({ json: {
      columns: ["Name", "Role"], rows: [["Ana","Dev"],["Luis","Sales"]],
      page: { total: 2 }
    }});
  });

  await page.goto("/main");
  await page.getByPlaceholder(/empleados\.xlsx|employees\.xlsx/i).fill("C:/data/empleados.xlsx");
  await expect(page.getByText(/Employees/)).not.toBeVisible(); // aún no hay selector abierto
  // Abre panel conexión si está cerrado
  await page.getByRole("button", { name: /Show|Mostrar/ }).click().catch(()=>{});
  // selecciona hoja
  await page.getByRole("combobox").selectOption("Employees");
  await expect(page.getByText(/Name/)).toBeVisible();
});
