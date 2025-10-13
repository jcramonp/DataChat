import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enRaw from "./en.json?raw";
import esRaw from "./es.json?raw";
const en = JSON.parse(enRaw);
const es = JSON.parse(esRaw);

const savedLang = localStorage.getItem("lang") || "en";

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    lng: savedLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
