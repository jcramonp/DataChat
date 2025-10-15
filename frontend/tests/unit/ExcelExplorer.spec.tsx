import { render, screen } from "@testing-library/react";
import SheetsExplorer from "@/components/SheetsExplorer"; // ← mock físico

it("renderiza el explorador de hojas (mock)", () => {
  render(<SheetsExplorer />);
  expect(screen.getByTestId("sheets-explorer")).toBeInTheDocument();
});
