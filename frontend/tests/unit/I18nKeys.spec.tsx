import es from "@/i18n/es.json";
import en from "@/i18n/en.json";

it("mismas llaves en el nivel raíz ES/EN", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
});
