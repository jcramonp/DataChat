import { test, expect } from "@playwright/test";

test("NavBar muestra Admin para rol admin", async ({ page }) => {
  // simula sesión admin
  await page.addInitScript(() => {
    localStorage.setItem("auth", JSON.stringify({ token: "fake", role: "admin" }));
  });
  await page.goto("/");
  await expect(page.getByText(/Admin/i)).toBeVisible();
});

test("Admin: lista de usuarios (mock)", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("auth", JSON.stringify({ token: "fake", role: "admin" }));
  });
  await page.route("**/admin/users**", async route => {
    await route.fulfill({ json: [{ id:1, email:"admin@datac.chat" }, { id:2, email:"user@datac.chat"} ]});
  });
  await page.goto("/");
  await page.getByText(/Admin/i).click();
  await expect(page).toHaveURL(/admin/);
  await expect(page.getByText(/admin@datac\.chat/)).toBeVisible();
});
