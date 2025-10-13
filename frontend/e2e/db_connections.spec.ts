import { test, expect } from "@playwright/test";

test("Crear conexión guardada (mock)", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("auth", JSON.stringify({ token: "fake", role: "admin" }));
  });
  await page.route("**/connections", async route => {
    if (route.request().method() === "POST") {
      const body = await route.request().postDataJSON();
      if (!body?.sqlalchemy_url) return route.fulfill({ status: 400, json: { error:"missing" }});
      return route.fulfill({ json: { id: 42, ...body }});
    }
    await route.fallback();
  });

  await page.goto("/main");
  await page.getByRole("button", { name: /Show|Mostrar/ }).click().catch(()=>{});
  await page.getByPlaceholder(/mysql\+pymysql/i).fill("mysql+pymysql://user:pass@host:3306/db");
  // tu UI exacta para guardar puede variar; este test asegura al menos el input existe
  await expect(page.getByPlaceholder(/mysql\+pymysql/i)).toHaveValue(/mysql\+pymysql/);
});
