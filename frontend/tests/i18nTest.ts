import i18n, { type i18n as I18nType } from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  es: {
    translation: {
      faq: {
        title: "Preguntas frecuentes",
        items: [
          { q: "¿Cómo conecto mi base?", a: "Ve a Admin → Conexiones." },
          { q: "¿Excel soportado?", a: "Sí, xlsx/csv para demo." }
        ]
      },
      // agrega aquí mínimamente lo que rendericen tus componentes durante tests
      landing: { title: "Consulta tus datos" }
    }
  },
  en: {
    translation: {
      faq: {
        title: "FAQ",
        items: [
          { q: "How to connect DB?", a: "Go to Admin → Connections." },
          { q: "Excel supported?", a: "Yes, xlsx/csv for demo." }
        ]
      },
      landing: { title: "Query your data" }
    }
  }
};

export function setupTestI18n(lang: "es" | "en" = "es"): I18nType {
  const instance = i18n.createInstance();
  instance.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: "en",
    interpolation: { escapeValue: false }
  });
  return instance;
}
