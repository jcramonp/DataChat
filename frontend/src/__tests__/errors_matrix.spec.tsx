// src/__tests__/errors_matrix.spec.tsx
import { render, screen } from "@testing-library/react";
import { act } from "react";
import i18n from "../i18n";
import E from "./helpers/ErrorSample";

it("403/404/network ES", async () => {
  await act(async () => {
    await i18n.changeLanguage("es");
  });
  render(<E code="forbidden" />);   expect(screen.getByText(/No tienes permisos/i)).toBeTruthy();
  render(<E code="not_found" />);   expect(screen.getByText(/Recurso no encontrado/i)).toBeTruthy();
  render(<E code="network" />);     expect(screen.getByText(/Error de red/i)).toBeTruthy();
});

it("403/404/network EN", async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
  render(<E code="forbidden" />);   expect(screen.getByText(/permission/i)).toBeTruthy();
  render(<E code="not_found" />);   expect(screen.getByText(/Resource not found/i)).toBeTruthy();
  render(<E code="network" />);     expect(screen.getByText(/Network error/i)).toBeTruthy();
});
