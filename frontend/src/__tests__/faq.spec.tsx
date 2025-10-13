import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n";

it("FAQ en ES", async () => {
  const { default: FaqPage } = await import("../pages/FaqPage");
  await i18n.changeLanguage("es");
  render(<MemoryRouter><FaqPage /></MemoryRouter>);
  expect(screen.getByText(/Preguntas frecuentes/i)).toBeInTheDocument();
  expect(screen.getByText(/DataChat/i)).toBeInTheDocument(); // intro menciona DataChat en ambos idiomas
});

it("FAQ en EN", async () => {
  const { default: FaqPage } = await import("../pages/FaqPage");
  await i18n.changeLanguage("en");
  render(<MemoryRouter><FaqPage /></MemoryRouter>);
  // Ajusta al título que tengas en en.json (p.ej. "Frequently Asked Questions")
  expect(
    screen.getByText(/Frequently Asked Questions|Preguntas frecuentes/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/DataChat/i)).toBeInTheDocument();
});
