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
import { getAuth } from "./services/api";

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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Landing /> },
      { path: "login", element: <Login /> },

      { path: "main", element: <RequireUser><MainPage /></RequireUser> },

      // admin
      { path: "admin", element: <RequireAdmin><Navigate to="/admin/sessions" replace /></RequireAdmin> },
      { path: "admin/home", element: <RequireAdmin><AdminHome /></RequireAdmin> },
      { path: "admin/users", element: <RequireAdmin><AdminUsers /></RequireAdmin> },
      { path: "admin/connections", element: <RequireAdmin><AdminConnections /></RequireAdmin> },
      { path: "admin/sessions", element: <RequireAdmin><AdminSessions /></RequireAdmin> },
    ],
  },
]);;