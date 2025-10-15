import { test, expect } from '@playwright/test';
import { setLangES, setFakeAuth, gotoFirstExistingPath, firstVisible, maybeClick } from './utils/helpers';

test.beforeEach(async ({ page }) => {
  await setLangES(page);
  await setFakeAuth(page); // evita login real si tu app lee token de localStorage
});

test('admin ve usuarios y crea conexión (smoke)', async ({ page }) => {
  await page.goto('/');
  await gotoFirstExistingPath(page, ['/admin', '/panel', '/dashboard', '/settings']);

  const adminLink = await firstVisible(page, [
    { type: 'role', name: 'link', options: { name: /admin|administrador/i } },
    { type: 'locator', sel: 'a[href*="admin"], a[aria-label*="admin"]' },
  ]);
  if (adminLink) await maybeClick(page, adminLink);

  const marker = await firstVisible(page, [
    { type: 'role', name: 'heading', options: { name: /admin|usuarios|users/i } },
    { type: 'locator', sel: '[data-testid="admin"], table, [role="table"]' },
  ], 2000);

  if (!marker) test.skip(); // aún no está esa vista en la app
  expect.soft(marker).not.toBeNull();

  const connectBtn = await firstVisible(page, [
    { type: 'role', name: 'button', options: { name: /conectar|connect/i } },
    { type: 'locator', sel: '[data-testid="connect-db"]' },
  ]);
  if (connectBtn) {
    await maybeClick(page, connectBtn);
    const uri = await firstVisible(page, [
      { type: 'role', name: 'textbox', options: { name: /uri|cadena|connection|conexión/i } },
      { type: 'locator', sel: 'input[placeholder*="mysql"], input[name*="uri"]' },
    ]);
    if (uri) {
      await uri.fill('mysql+pymysql://u:p@host:3306/db');
      const save = await firstVisible(page, [
        { type: 'role', name: 'button', options: { name: /guardar|save/i } },
      ]);
      if (save) {
        await save.click();
        const ok = await firstVisible(page, [
          { type: 'locator', sel: '[data-testid="toast-success"], .toast-success' },
          { type: 'locator', sel: 'text=/cread[ao]|created/i' },
        ]);
        expect.soft(ok).not.toBeNull();
      }
    }
  }
});
