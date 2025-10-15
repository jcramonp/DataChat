import { render, screen } from "@testing-library/react";
import AdminView from "@/pages/AdminView"; // ← ahora resuelve al mock físico

it("muestra lista de usuarios (mock)", async () => {
  render(<AdminView />);
  const rows = await screen.findAllByRole("row");
  expect(rows.length).toBeGreaterThan(1);
});
