import { Link, useLocation, useNavigate } from 'react-router-dom';
import './NavBar.css';
import Logo from './Logo';
import { getAuth, clearAuth } from '../services/api';
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { token, role } = getAuth();
  const isAuthed = Boolean(token);

  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || localStorage.getItem('dc_lang') || "en").slice(0, 2);

  const isActive = (to: string) => pathname === to;

  const Tab = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      className={`nav-pill ${isActive(to) ? 'active' : ''}`}
      aria-current={isActive(to) ? 'page' : undefined}
    >
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
        <Link to="/" className="dc-brand" aria-label="DataChat Home">
          <Logo size={30} />
        </Link>

        <nav className="dc-tabs" aria-label="Primary">
          <Tab to="/">{t("nav.home")}</Tab>

          {/* Rutas según rol */}
          {isAuthed && role !== 'admin' && <Tab to="/main">{t("nav.main")}</Tab>}
          {isAuthed && role === 'admin' && <Tab to="/admin">{t("nav.admin")}</Tab>}
          {isAuthed && role === 'admin' && <Tab to="/admin/users">Users</Tab>}
          {isAuthed && role === 'admin' && <Tab to="/admin/sessions">Sessions</Tab>}
          {isAuthed && role === 'admin' && <Tab to="/admin/logs">{t("nav.logs")}</Tab>}

          {/* Público */}
          <Tab to="/faq">{t("nav2.faq")}</Tab>
        </nav>

        <div className="navbar-right">
          <select
            aria-label={t("language")}
            value={currentLang}
            onChange={handleLangChange}
            className="navbar-lang"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          {isAuthed ? (
            <>
              <span className="role-badge">{(role || '').toUpperCase()}</span>
              <button className="logout-btn" onClick={logout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-pill">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
