import { Link, useLocation, useNavigate } from 'react-router-dom';
import './NavBar.css';
import Logo from './Logo';
import { getAuth } from '../services/api';
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { token, role } = getAuth();
  const { t } = useTranslation();

  const Tab = ({
    to,
    children,
    dataTestId,
  }: {
    to: string;
    children: React.ReactNode;
    dataTestId?: string;
  }) => (
    <Link
      to={to}
      className={`nav-pill ${pathname === to ? 'active' : ''}`}
      {...(dataTestId ? { 'data-testid': dataTestId } : {})}
    >
      {children}
    </Link>
  );

  const logout = () => {
    localStorage.removeItem('token');
    nav('/login', { replace: true });
  };

  return (
    <header className="dc-nav">
      <div className="container nav-inner">
        <div className="dc-brand"><Logo size={30} /></div>

        // src/components/NavBar.tsx  (solo sustituye el bloque <nav className="dc-tabs">...</nav>)

        <nav className="dc-tabs">
          <Tab to="/">{t("nav.home")}</Tab>
          <Tab to="/faq">{t("nav2.faq")}</Tab>

          {/* 👇 SIEMPRE visibles para E2E */}
          <Tab to="/main" dataTestId="nav-sheets">
            {t("nav.main")}
          </Tab>
          <Tab to="/admin/users" dataTestId="nav-admin">
            {t("nav.admin")}
          </Tab>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {token ? (
            <>
              <span className="nav-pill" style={{ marginRight: 8 }}>{(role || '').toUpperCase()}</span>
              <button className="nav-pill" onClick={logout}>{t("nav.logout")}</button>
            </>
          ) : (
            <Link to="/login" className="nav-pill">{t("nav.login")}</Link>
          )}
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
