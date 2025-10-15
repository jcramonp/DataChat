import { renderWithI18n } from "../utils/renderWithI18n";
import FaqPage from "@/pages/FaqPage";

it("estructura estable (snapshot)", () => {
  const { container } = renderWithI18n(<FaqPage />, "es");
  expect(container).toMatchSnapshot();
});
