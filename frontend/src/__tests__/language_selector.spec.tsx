import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n";
import NavBar from "../components/NavBar";

it("cambia EN→ES y persiste en localStorage", async () => {
  await i18n.changeLanguage("en");
  render(<MemoryRouter><NavBar /></MemoryRouter>);

  // Arranca en EN
  expect(screen.getByText(/Home|nav.home/i)).toBeInTheDocument();

  const selector = screen.getByRole("combobox");
  fireEvent.change(selector, { target: { value: "es" } });

  // UI en ES
  expect(await screen.findByText(/Inicio|nav.home/i)).toBeInTheDocument();
  expect(localStorage.getItem("lang")).toBe("es");
});
