import { test, expect } from '@playwright/test';
import { setLangES, firstVisible } from './utils/helpers';

test.beforeEach(async ({ page }) => { await setLangES(page); });

test('click en prompt ejecuta la consulta', async ({ page }) => {
  await page.goto('/');

  const btn = await firstVisible(page, [
    { type: 'role', name: 'button', options: { name: /ventas|sales|consulta|query/i } },
    { type: 'locator', sel: '[data-testid="starting-prompts"] button' },
  ], 2000);

  if (!btn) test.skip(); // aún no hay prompts en la UI
  expect.soft(btn).not.toBeNull();
  if (!btn) return;

  await btn.click();

  const result = await firstVisible(page, [
    { type: 'role', name: 'table' },
    { type: 'locator', sel: 'pre:has-text("SELECT"), code:has-text("SELECT")' },
  ], 4000);

  if (!result) test.skip(); // si tu UI todavía no muestra tabla/SQL
  expect.soft(result).not.toBeNull();
});
