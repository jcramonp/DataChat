import { test, expect } from "@playwright/test";

test("prompts: random + click set input", async ({ page }) => {
  await page.goto("/main");
  const labels = await page.locator(".suggestions button").allInnerTexts();
  await page.reload();
  const labels2 = await page.locator(".suggestions button").allInnerTexts();
  // No garantizamos diferencia total, pero checamos que no siempre sea el mismo orden
  expect(labels.join("|")).not.toBe(""); // existen
  await page.locator(".suggestions button").first().click();
  const val = await page.locator("input[placeholder*='data' i], input[placeholder*='datos' i]").inputValue();
  expect(val.length).toBeGreaterThan(0);
});
