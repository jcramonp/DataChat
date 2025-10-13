import { render, screen } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { useTranslation } from "react-i18next";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
});

function LangLabel() {
  const { t } = useTranslation();
  return <div>{t("language")}</div>;
}

it("usa ES si localStorage.lang=es", async () => {
  localStorage.setItem("lang", "es");
  await import("../i18n"); // importa después de setear localStorage
  render(<LangLabel />);
  expect(screen.getByText(/Idioma/i)).toBeInTheDocument();
});

it("usa EN si localStorage.lang=en", async () => {
  localStorage.setItem("lang", "en");
  await import("../i18n");
  render(<LangLabel />);
  expect(screen.getByText(/Language/i)).toBeInTheDocument();
});
