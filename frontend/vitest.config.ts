import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@/pages/AdminView": new URL("./tests/mocks/AdminViewMock.tsx", import.meta.url).pathname,
      "@/components/SheetsExplorer": new URL("./tests/mocks/SheetsExplorerMock.tsx", import.meta.url).pathname,
      "@/components/StartingPrompts": new URL("./tests/mocks/StartingPromptsMock.tsx", import.meta.url).pathname,
    },
  },
  test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["./tests/setupTests.ts"],
  css: false,
  include: ["tests/unit/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
  exclude: ["tests/e2e/**", "node_modules", "dist"],
  }
});
