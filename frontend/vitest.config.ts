import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",                 // 👈 evita jsdom/whatwg-url
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    globals: true,
    include: ["src/**/*.spec.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**", "build/**"]
  }
});
