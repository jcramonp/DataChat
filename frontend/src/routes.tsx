// frontend/src/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Landing from "./pages/Landing";
import MainPage from "./pages/MainPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import AdminHome from "./pages/AdminHome";
import AdminUsers from "./pages/AdminUsers";
import AdminConnections from "./pages/AdminConnections";
import AdminSessions from "./pages/AdminSessions";
import FaqPage from "./pages/FaqPage";
import { getAuth } from "./services/api";
import History from "./pages/History";
import AdminLogs from "./pages/AdminLogs";

// (opcional) ejemplo de cómo calculabas el base para History
const API_BASE: string = (() => {
  const v = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (!v) throw new Error("VITE_API_URL is not set");
  return String(v).replace(/\/+$/, "");
})();

// Guardas
function RequireUser({ children }: { children: React.ReactNode }) {
  const { token, role } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { token, role } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/main" replace />;
  return <>{children}</>;
}

function RequireNonAdmin({ children }: { children: React.ReactNode }) {
  const { token, role } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

// ✅ Index inteligente: si hay sesión, redirige por rol; si no, muestra Landing
function RootIndex() {
  const { token, role } = getAuth();
  if (!token) return <Landing />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/main" replace />;
}

function HistoryRoute() {
  const { token } = getAuth() || { token: "" };
  return <History apiBase={API_BASE} token={token ?? ""} />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <RootIndex /> },
      { path: "login", element: <Login /> },

      // usuario (bloquea admin)
      {
        path: "main",
        element: (
          <RequireUser>
            <RequireNonAdmin>
              <MainPage />
            </RequireNonAdmin>
          </RequireUser>
        ),
      },
      {
        path: "history",
        element: (
          <RequireUser>
            <RequireNonAdmin>
              <HistoryRoute />
            </RequireNonAdmin>
          </RequireUser>
        ),
      },

      // admin
      { path: "admin", element: <RequireAdmin><AdminHome /></RequireAdmin> },
      { path: "admin/home", element: <RequireAdmin><AdminHome /></RequireAdmin> },
      { path: "admin/users", element: <RequireAdmin><AdminUsers /></RequireAdmin> },
      { path: "admin/connections", element: <RequireAdmin><AdminConnections /></RequireAdmin> },
      { path: "admin/sessions", element: <RequireAdmin><AdminSessions /></RequireAdmin> },
      { path: "admin/logs", element: <RequireAdmin><AdminLogs /></RequireAdmin> },

      { path: "/faq", element: <FaqPage /> },
    ],
  },
]);
