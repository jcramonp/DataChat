import { test, expect } from "@playwright/test";

test("FAQ en ES y EN", async ({ page }) => {
  await page.goto("/");
  // cambia a ES si tu selector está en el header o panel
  await page.locator("select").first().selectOption("es").catch(() => {});
  await page.goto("/faq");
  await expect(page.getByText(/Preguntas frecuentes/)).toBeVisible();
  // vuelve a EN
  await page.locator("select").first().selectOption("en").catch(() => {});
  await expect(page.getByText(/Frequently Asked Questions/)).toBeVisible();
  // abre un item
  await page.getByText(/¿Cómo|How do/i).first().click();
});
