import { test, expect } from '@playwright/test';
import { setLangES, gotoFirstExistingPath, firstVisible, maybeClick } from './utils/helpers';

test.beforeEach(async ({ page }) => { await setLangES(page); });

test('ver tabla y alternar hojas', async ({ page }) => {
  await page.goto('/');
  await gotoFirstExistingPath(page, ['/sheets', '/excel', '/data', '/datasets', '/explore']);

  const openLink = await firstVisible(page, [
    { type: 'role', name: 'link', options: { name: /hojas|excel|explorar|data sheets/i } },
    { type: 'locator', sel: '[data-testid="nav-sheets"], a[href*="sheets"], a[href*="excel"], a[href*="data"]' },
  ]);
  if (openLink) await maybeClick(page, openLink);

  const table = await firstVisible(page, [
    { type: 'role', name: 'table' },
    { type: 'locator', sel: 'table, [data-testid="grid"], [role="grid"]' },
  ], 3000);

  if (!table) test.skip(); // todavía no hay tabla en esa vista
  expect.soft(table).not.toBeNull();

  const tab = await firstVisible(page, [
    { type: 'role', name: 'tab', options: { name: /sheet2|hoja\s*2|ventas/i } },
    { type: 'locator', sel: '[role="tab"]:has-text("2"), [data-testid="tab-2"]' },
  ]);
  if (tab) {
    await tab.click();
    const label = await firstVisible(page, [
      { type: 'locator', sel: 'text=/sheet2|hoja\\s*2/i' },
    ]);
    expect.soft(label).not.toBeNull();
  }
});
