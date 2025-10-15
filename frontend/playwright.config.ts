// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',   // <- aquí
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',              // <- Vite
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'inherit',                   // <- verás errores de Vite en la consola
    stderr: 'inherit',
  },
});
