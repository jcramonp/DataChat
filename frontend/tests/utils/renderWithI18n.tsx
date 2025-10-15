import { render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import type { ReactElement } from "react";
import { setupTestI18n } from "../i18nTest";

export function renderWithI18n(ui: ReactElement, lang: "es" | "en" = "es") {
  const i18n = setupTestI18n(lang);
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}
