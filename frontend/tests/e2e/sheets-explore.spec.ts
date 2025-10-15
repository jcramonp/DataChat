import { test, expect } from '@playwright/test';
import { primeApp, firstVisible, setLangES } from './utils/helpers';

test('ver tabla y alternar hojas', async ({ page }) => {
  await setLangES(page);
  await primeApp(page, 'user', true);

  // 🔧 MOCKS: estabiliza el flujo aunque el backend no responda
  await page.route('**/api/excel/sheets**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sheets: ['Hoja1', 'Hoja2'] }),
    })
  );

  await page.route('**/api/excel/preview**', route => {
    const url = route.request().url();
    const isHoja2 = /sheet(=|%3D)Hoja2/i.test(url);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        columns: ['A', 'B'],
        rows: isHoja2
          ? [{ A: 'p', B: 3 }, { A: 'q', B: 4 }]
          : [{ A: 'x', B: 1 }, { A: 'y', B: 2 }],
      }),
    });
  });

  await page.goto('/sheets');

  // ===== comprobación de auth/contexto =====
  console.log('[AUTH CHECK] URL actual:', page.url());
  const ctx = await page.evaluate(() => ({
    token: localStorage.getItem('dc_token') || localStorage.getItem('token'),
    role:  localStorage.getItem('dc_role')  || localStorage.getItem('role'),
    src:   localStorage.getItem('dc_source'),
  }));
  console.log('[AUTH CHECK] LocalStorage:', ctx);
  await expect(page).not.toHaveURL(/\/login\b/, { timeout: 3000 });
  if (!ctx.token || !ctx.role) throw new Error('[AUTH] Falta token/rol');
  if (ctx.src !== 'excel') throw new Error('[CTX] dc_source no es "excel"');
  // ========================================

  // Si tu UI tiene un botón para listar hojas:
  const listBtn = page.getByTestId('list-sheets');
  if (await listBtn.count()) await listBtn.click();

  // Busca el grid por varios candidatos
  const grid = await firstVisible(page, [
    { type: 'locator', sel: '[data-testid="grid"]' },
    { type: 'locator', sel: '[role="grid"]' },
    { type: 'locator', sel: 'table[role="table"]' },
    { type: 'locator', sel: 'table' },
  ], 4000);
  if (!grid) throw new Error('No se encontró el grid/tabla en /sheets');
  await expect(grid).toBeVisible();

  // Alternar hoja 2 si existe
  const tab2 = page.getByTestId('tab-2');
  if (await tab2.count()) {
    await tab2.click();
    await expect(grid).toBeVisible(); // grid sigue visible
  }
});
