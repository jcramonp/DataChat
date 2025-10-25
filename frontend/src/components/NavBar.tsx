import { Link, useLocation, useNavigate } from 'react-router-dom';
import './NavBar.css';
import Logo from './Logo';
import { getAuth, clearAuth } from '../services/api';
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext"; // ✅ nuevo import

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { token, role } = getAuth();
  const isAuthed = Boolean(token);
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || "en").slice(0, 2);

  const { theme, toggleTheme } = useTheme(); // ✅ hook de tema

  const Tab = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link to={to} className={`nav-pill ${pathname === to ? 'active' : ''}`}>
      {children}
    </Link>
  );

  const logout = () => {
    clearAuth();
    nav('/login', { replace: true });
  };

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    localStorage.setItem("dc_lang", lng);
  };

  return (
    <header className="dc-nav">
      <div className="container nav-inner">
        <div className="dc-brand">
          <Logo size={30} />
        </div>

        <nav className="dc-tabs">
          <Tab to="/">Home</Tab>

          {/* Rutas según rol */}
          {isAuthed && role !== 'admin' && <Tab to="/main">Main</Tab>}
          {isAuthed && role === 'admin' && <Tab to="/admin">Admin</Tab>}
          {isAuthed && role === 'admin' && <Tab to="/admin/users">Users</Tab>}
          {isAuthed && role === 'admin' && <Tab to="/admin/sessions">Sessions</Tab>}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Selector de idioma */}
          <select
            aria-label="Language"
            value={currentLang}
            onChange={handleLangChange}
            className="nav-pill"
            style={{ paddingRight: 22 }}
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          {/* ✅ Toggle de tema */}
          <button
            onClick={toggleTheme}
            className="nav-pill"
            style={{
              cursor: "pointer",
              minWidth: 110,
              textAlign: "center",
            }}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>

          {/* Autenticación */}
          {isAuthed ? (
            <>
              <span className="nav-pill" style={{ marginRight: 8 }}>
                {(role || '').toUpperCase()}
              </span>
              <button className="nav-pill" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-pill">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
