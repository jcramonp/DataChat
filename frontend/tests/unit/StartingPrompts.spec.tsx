import { render, screen, fireEvent } from "@testing-library/react";
import StartingPrompts from "@/components/StartingPrompts"; // ← mock físico

it("al hacer clic en el prompt (mock) emite click", () => {
  render(<StartingPrompts />);
  const btn = screen.getByRole("button", { name: /ventas/i });
  expect(btn).toBeInTheDocument();
  fireEvent.click(btn);
});
