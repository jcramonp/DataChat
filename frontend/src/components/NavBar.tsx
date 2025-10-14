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

  const Tab = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link to={to} className={`nav-pill ${pathname === to ? 'active' : ''}`}>
      {children}
    </Link>
  );

  const logout = () => {
    // Replace with appropriate logout logic if needed, e.g., removing token from localStorage
    localStorage.removeItem('token');
    nav('/login', { replace: true });
  };

  return (
    <header className="dc-nav">
      <div className="container nav-inner">
        <div className="dc-brand"><Logo size={30} /></div>

        <nav className="dc-tabs">
          <Tab to="/">{t("nav.home")}</Tab>
          <Tab to="/faq">{t("nav2.faq")}</Tab>
          {role === 'admin'
            ? <Tab to="/admin/users">{t("nav.admin")}</Tab>
            : <Tab to="/main">{t("nav.main")}</Tab>}
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
          <LanguageSelector /> {/* +++ */}
        </div>
      </div>
    </header>
  );
}
