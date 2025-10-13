// src/__tests__/routes_admin_guard.spec.tsx
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import * as api from "../services/api";
import i18n from "../i18n";

vi.spyOn(api, "getAuth").mockImplementation(() => ({ token: "t", role: "user" }));

it("bloquea /admin/users para user", async () => {
  await i18n.changeLanguage("en");
  const { routeObjects } = await import("../routes"); // <- ahora existe
  const router = createMemoryRouter(routeObjects, { initialEntries: ["/admin/users"] });

  render(<RouterProvider router={router} />);

  // Ajusta el matcher a lo que renderiza tu RequireAdmin (redirige a /main)
  // por ejemplo, algo que esté en MainPage o en el layout tras redirigir:
  expect(await screen.findByText(/DataChat Assistant/i)).toBeInTheDocument();
});
