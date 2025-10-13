import { render, screen } from "@testing-library/react";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";

function E({ code }: { code: string }) {
  const { t } = useTranslation();
  return <div>{t(`errors.${code}`)}</div>;
}

it("backend EN", async () => {
  await i18n.changeLanguage("en");
  render(<E code="backend" />);
  expect(screen.getByText(/Error contacting the backend/i)).toBeInTheDocument();
});

it("unauthorized ES", async () => {
  await i18n.changeLanguage("es");
  render(<E code="unauthorized" />);
  expect(screen.getByText(/No autorizado/i)).toBeInTheDocument();
});
