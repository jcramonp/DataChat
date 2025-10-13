import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n";
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  // Mock mínimo para evitar llamadas reales
  vi.doMock("../services/api", () => ({
    askData: vi.fn(),
    listExcelSheets: vi.fn().mockResolvedValue({ sheets: [] }),
    previewExcel: vi.fn().mockResolvedValue({ columns: [], rows: [], page: { total: 0 } }),
    getAuth: vi.fn().mockReturnValue({ token: null, role: null }),
    clearAuth: vi.fn()
  }));
});

it("EN: toggle abre/cierra y muestra placeholders en inglés", async () => {
  const { default: MainPage } = await import("../pages/MainPage");
  await i18n.changeLanguage("en");

  render(<MemoryRouter><MainPage /></MemoryRouter>);

  
  const btn = screen.getByRole("button", { name: /^Show$/i }); // antes: /Show/i


  expect(btn).toBeInTheDocument();

  // Abre
  fireEvent.click(btn);
  // Placeholders en EN
  expect(screen.getAllByPlaceholderText(/mysql\+pymysql:\/\/user:pass@host:3306\/db/i).length).toBeGreaterThan(0);
  expect(screen.getAllByPlaceholderText(/C:\/data\/employees\.xlsx/i).length).toBeGreaterThan(0);
  expect(screen.getAllByPlaceholderText(/Connection ID/i).length).toBeGreaterThan(0);

  // Inputs del chat en EN
  expect(screen.getByPlaceholderText(/Ask me anything about your data/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Send/i })).toBeInTheDocument();
});

it("ES: toggle abre/cierra y muestra placeholders en español", async () => {
  const { default: MainPage } = await import("../pages/MainPage");
  await i18n.changeLanguage("es");

  render(<MemoryRouter><MainPage /></MemoryRouter>);

  const btn = screen.getByRole("button", { name: /Mostrar/i });
  expect(btn).toBeInTheDocument();

  // Abre
  fireEvent.click(btn);
  // Placeholders en ES
  expect(screen.getAllByPlaceholderText(/mysql\+pymysql:\/\/usuario:clave@host:3306\/db/i).length).toBeGreaterThan(0);
  expect(screen.getAllByPlaceholderText(/C:\/data\/empleados\.xlsx/i).length).toBeGreaterThan(0);
  expect(screen.getAllByPlaceholderText(/ID de conexión/i).length).toBeGreaterThan(0);

  // Inputs del chat en ES
  expect(screen.getByPlaceholderText(/Pregúntame lo que quieras/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Enviar/i })).toBeInTheDocument();
});
