import { Page } from '@playwright/test';

export async function setLangES(page: Page) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'es'));
}

/**
 * Nuevo helper recomendado para /sheets:
 * - Activa el mock de Excel (window.__E2E_FORCE_EXCEL__)
 * - Inyecta auth y recuerda la fuente 'excel' ANTES de que cargue la app
 *
 * Uso:
 *   await primeApp(page, 'user'); // o 'admin'
 *   await page.goto('/sheets');
 */
export async function primeApp(
  page: Page,
  role: 'user' | 'admin' = 'user',
  forceExcel = true
) {
  await page.addInitScript(({ role, forceExcel }) => {
    // @ts-ignore - bandera que lee MainPage para mockear Excel
    (window as any).__E2E_FORCE_EXCEL__ = !!forceExcel;
    try {
      // ✅ Mantén las llaves antiguas…
      localStorage.setItem('token', 'e2e-token');
      localStorage.setItem('role', role);

      // ✅ …y añade las que usa la app actualmente
      localStorage.setItem('dc_token', 'e2e-token');
      localStorage.setItem('dc_role', role);

      // También en sessionStorage por si la app mira ahí
      sessionStorage.setItem('token', 'e2e-token');
      sessionStorage.setItem('role', role);
      sessionStorage.setItem('dc_token', 'e2e-token');
      sessionStorage.setItem('dc_role', role);

      if (forceExcel) {
        localStorage.setItem('dc_source', 'excel');
        sessionStorage.setItem('dc_source', 'excel');
      }

      // Re-seed en microtask por si algo limpia en el primer tick
      Promise.resolve().then(() => {
        try {
          localStorage.setItem('dc_token', 'e2e-token');
          localStorage.setItem('dc_role', role);
          sessionStorage.setItem('dc_token', 'e2e-token');
          sessionStorage.setItem('dc_role', role);
          if (forceExcel) {
            localStorage.setItem('dc_source', 'excel');
            sessionStorage.setItem('dc_source', 'excel');
          }
        } catch {}
      });
    } catch {}
  }, { role, forceExcel });
}

export async function setFakeAuth(page: Page) {
  await page.addInitScript(() => {
    try {
      // Mantén antiguas
      localStorage.setItem('token', 'e2e-token');
      localStorage.setItem('role', 'admin');

      // Añade las actuales
      localStorage.setItem('dc_token', 'e2e-token');
      localStorage.setItem('dc_role', 'admin');

      // También en sessionStorage
      sessionStorage.setItem('token', 'e2e-token');
      sessionStorage.setItem('role', 'admin');
      sessionStorage.setItem('dc_token', 'e2e-token');
      sessionStorage.setItem('dc_role', 'admin');

      // Fuente excel (por si aplica)
      localStorage.setItem('dc_source', 'excel');
      sessionStorage.setItem('dc_source', 'excel');

      // Re-seed microtask
      Promise.resolve().then(() => {
        try {
          localStorage.setItem('dc_token', 'e2e-token');
          localStorage.setItem('dc_role', 'admin');
          sessionStorage.setItem('dc_token', 'e2e-token');
          sessionStorage.setItem('dc_role', 'admin');
        } catch {}
      });
    } catch {}
  });
}

export async function maybeClick(
  page: Page,
  locator: ReturnType<Page['getByRole']> | ReturnType<Page['locator']>,
  timeout = 1500
) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    await locator.click({ timeout });
    return true;
  } catch {
    return false;
  }
}

export async function gotoFirstExistingPath(page: Page, paths: string[]) {
  for (const p of paths) {
    try {
      const res = await page.goto(p, { waitUntil: 'domcontentloaded' });
      const status = res?.status();
      // En SPA, navegaciones internas pueden devolver null; lo tomamos como OK
      if (!status || status < 400) return p;
    } catch {
      // intenta con la siguiente
    }
  }
  // si ninguna funcionó, nos quedamos con la primera como fallback
  return paths[0];
}

export async function firstVisible(
  page: Page,
  candidates: Array<{ type: 'role'|'locator', name?: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1], sel?: string }>,
  timeoutEach = 1200
) {
  for (const c of candidates) {
    try {
      const loc = c.type === 'role'
        ? page.getByRole(c.name as any, c.options as any)
        : page.locator(c.sel as string);
      await loc.first().waitFor({ state: 'visible', timeout: timeoutEach });
      return loc.first();
    } catch { /* sigue intentando */ }
  }
  return null;
}
