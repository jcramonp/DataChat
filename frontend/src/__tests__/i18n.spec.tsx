import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n";
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

it("muestra EN", async () => {
  await i18n.changeLanguage("en");
  const { default: Landing } = await import("../pages/Landing");
  render(<MemoryRouter><Landing /></MemoryRouter>);
  expect(screen.getByText(/Start Now/i)).toBeInTheDocument();
});

it("muestra ES", async () => {
  await i18n.changeLanguage("es");

  // Mockea todo el módulo antes de importar MainPage
  vi.doMock("../services/api", () => ({
    // stubs mínimos que usan tus componentes
    askData: vi.fn(),
    listExcelSheets: vi.fn().mockResolvedValue({ sheets: [] }),
    previewExcel: vi.fn().mockResolvedValue({ columns: [], rows: [], page: { total: 0 } }),
    getAuth: vi.fn().mockReturnValue({ token: null, role: null }),
    clearAuth: vi.fn()
  }));

  const { default: MainPage } = await import("../pages/MainPage");
  render(<MemoryRouter><MainPage /></MemoryRouter>);

  expect(screen.getByText(/Conexión/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Pregúntame lo que quieras/i)).toBeInTheDocument();
});
