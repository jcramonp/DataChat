import { Page } from '@playwright/test';

export async function setLangES(page: Page) {
  await page.addInitScript(() => localStorage.setItem('i18nextLng', 'es'));
}

export async function setFakeAuth(page: Page) {
  // ajusta la clave si tu app usa otra (ej: 'auth', 'jwt', etc.)
  await page.addInitScript(() => localStorage.setItem('token', 'e2e-token'));
  localStorage.setItem('role', 'admin');
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
