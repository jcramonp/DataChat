import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../i18n";
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();   // 👈 limpia el cache de módulos entre tests
  vi.clearAllMocks();
});

it("NavBar admin tab > muestra Admin para rol admin", async () => {
  await i18n.changeLanguage("en");

  // Mock por test
  vi.doMock("../services/api", () => ({
    getAuth: () => ({ token: "fake", role: "admin" }),
    clearAuth: () => {}
  }));

  // Importa DESPUÉS del mock
  const { default: NavBar } = await import("../components/NavBar");

  const { container } = render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>
  );

  // Limita la búsqueda al <nav> (evita confundir con el badge "ADMIN")
  const nav = container.querySelector("nav.dc-tabs")!;
  expect(within(nav).getByRole("link", { name: /Admin/i })).toBeInTheDocument();
});

it("NavBar admin tab > oculta Admin para usuario normal", async () => {
  await i18n.changeLanguage("en");

  vi.doMock("../services/api", () => ({
    getAuth: () => ({ token: "fake", role: "user" }),
    clearAuth: () => {}
  }));

  const { default: NavBar } = await import("../components/NavBar");

  const { container } = render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>
  );

  const nav = container.querySelector("nav.dc-tabs")!;
  expect(within(nav).queryByRole("link", { name: /Admin/i })).toBeNull();
});
