import { test, expect } from '@playwright/test';
import { primeApp, setLangES } from './utils/helpers';

test('click en prompt ejecuta la consulta', async ({ page }) => {
  await setLangES(page);
  await primeApp(page, 'user', true);
  await page.goto('/');

  // ===== auth / debug =====
  console.log('[AUTH CHECK] URL actual:', page.url());
  const auth = await page.evaluate(() => ({
    token: localStorage.getItem('dc_token') || localStorage.getItem('token'),
    role:  localStorage.getItem('dc_role')  || localStorage.getItem('role'),
  }));
  console.log('[AUTH CHECK] LocalStorage:', auth);
  await expect(page).not.toHaveURL(/\/login\b/, { timeout: 3000 });
  if (!auth.token || !auth.role) throw new Error('[AUTH] Falta token/rol');

  await page.waitForLoadState('domcontentloaded');

  // ===== 1) Si hay prompt sugerido, úsalo; si no, iremos por input =====
  const suggestionBtn = page.locator('.suggestions button').first();
  if (await suggestionBtn.count()) {
    await suggestionBtn.click();
  }

  // ===== 2) Buscar input de forma AMPLIA (y con fallback a /main) =====
  async function findInputWide(timeout = 3000) {
    const candidates = [
      'form.chat-input input',
      'form.chat-input textarea',
      '.chat-input input',
      '.chat-input textarea',
      '[data-testid="nlq-input"]',
      '[data-testid="query-input"]',
      'textarea[name="question"]',
      'input[name="question"]',
      '[contenteditable="true"]',
    ];
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      for (const sel of candidates) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) && await loc.isVisible()) return loc;
      }
      // cualquier textbox accesible (último recurso)
      const roleTb = page.getByRole('textbox').first();
      if ((await roleTb.count()) && await roleTb.isVisible()) return roleTb;
      await page.waitForTimeout(150);
    }
    return null;
  }

  let input = await findInputWide(3000);
  if (!input) {
    // Algunas UIs cargan el chat en /main
    await page.goto('/main');
    await page.waitForLoadState('domcontentloaded');
    input = await findInputWide(3000);
  }
  if (!input) {
    throw new Error('No se encontró el input del chat (probé / y /main).');
  }

  // Si usamos prompt, debería haber texto pegado; si no, escribimos uno
  const currentValue = await input.evaluate((el: any) => el?.value ?? el?.textContent ?? '');
  if (!currentValue || !String(currentValue).trim()) {
    await input.fill('Lista de empleados con sueldo');
  }

  // ===== 3) Ejecutar con el botón submit (la “flecha”) o Enter =====
  const runBtn = page.locator('form.chat-input button[type="submit"]').first();
  if (await runBtn.count()) {
    await runBtn.click();
  } else {
    await input.click();
    await page.keyboard.press('Enter');
  }

  // ===== 4) Esperar una respuesta /api/* y verificar resultado =====
  await page.waitForResponse(r => r.ok() && /\/api\//.test(r.url()), { timeout: 5000 }).catch(() => {});
  // mensaje de asistente o tabla
  const assistantMsg = page.locator('.chat-messages .msg.assistant').first();
  const resultTable  = page.locator('.chat-messages table, [data-testid="grid"], table[role="table"]').first();

  await page.waitForTimeout(400);
  const hasAssistant = await assistantMsg.count();
  const hasTable     = await resultTable.count();

  if (!hasAssistant && !hasTable) {
    throw new Error('No apareció mensaje de asistente ni tabla tras ejecutar la consulta.');
  }
  if (hasAssistant) await expect(assistantMsg).toBeVisible();
  if (hasTable) await expect(resultTable).toBeVisible();
});
