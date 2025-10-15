import { createBrowserRouter, Navigate } from 'react-router-dom';

import App from './App';
import Landing from './pages/Landing';
import MainPage from './pages/MainPage';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import AdminHome from './pages/AdminHome';
import AdminUsers from './pages/AdminUsers';
import AdminConnections from './pages/AdminConnections';
import FaqPage from "./pages/FaqPage";
import { getAuth } from './services/api';
import History from './pages/History';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function RequireUser({ children }: { children: React.ReactNode }) {
  const { token } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { token, role } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HistoryRoute() {
  const { token } = getAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <History apiBase={API_BASE} token={token} />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> },

      // rutas de usuario
      { path: 'main', element: <RequireUser><MainPage /></RequireUser> },
      { path: 'sheets', element: <RequireUser><MainPage /></RequireUser> },
      { path: 'history', element: <RequireUser><HistoryRoute /></RequireUser> },

      // rutas de admin
      { path: 'admin', element: <RequireAdmin><AdminHome /></RequireAdmin> },
      { path: 'admin/users', element: <RequireAdmin><AdminUsers /></RequireAdmin> },
      { path: 'admin/connections', element: <RequireAdmin><AdminConnections /></RequireAdmin> },
      { path: 'faq', element: <FaqPage />},
    ],
  },
]);
