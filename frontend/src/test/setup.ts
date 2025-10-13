// frontend/src/test/setup.ts
import "@testing-library/jest-dom";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Limpia el DOM tras cada test
afterEach(() => {
  cleanup();
});
