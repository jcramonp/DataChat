import { Link, useLocation, useNavigate } from "react-router-dom";
import "./NavBar.css";
import Logo from "./Logo";
import { getAuth, clearAuth } from "../services/api";
import { useTranslation } from "react-i18next";

const Tab = ({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) => (
  <Link
    to={to}
    className={`nav-pill ${active ? "active" : ""}`}
    aria-current={active ? "page" : undefined}
  >
    {children}
  </Link>
);

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { token, role } = getAuth();
  const isAuthed = Boolean(token);

  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || localStorage.getItem("dc_lang") || "en")
    .slice(0, 2)
    .toLowerCase();

  const changeLang = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("dc_lang", lng);
  };

  const is = (p: string) => pathname === p;

  const logout = () => {
    clearAuth();
    nav("/login", { replace: true });
  };

  return (
    <header className="dc-nav">
      <div className="nav-inner">
        {/* Left - Brand */}
        <Link to="/" className="dc-brand" aria-label="DataChat Home">
          <Logo size={34} />
          {/* Si no quieres texto al lado del logo, borra la línea de abajo */}
          {/* <span className="dc-brand-name">DataChat</span> */}
        </Link>

        {/* Center - Rail */}
        <div className="nav-center">
          <nav className="seg-rail" aria-label="Primary">
            <Tab to="/" active={is("/")}>{t("nav.home")}</Tab>

            {isAuthed && role !== "admin" && (
              <Tab to="/main" active={is("/main")}>
                {t("nav.main")}
              </Tab>
            )}

            {isAuthed && role === "admin" && (
              <>
                <Tab to="/admin" active={is("/admin")}>
                  {t("nav.admin")}
                </Tab>
                <Tab to="/admin/users" active={is("/admin/users")}>
                  Users
                </Tab>
                <Tab to="/admin/sessions" active={is("/admin/sessions")}>
                  Sessions
                </Tab>
                <Tab to="/admin/logs" active={is("/admin/logs")}>
                  {t("nav.logs")}
                </Tab>
              </>
            )}

            <Tab to="/faq" active={is("/faq")}>{t("nav2.faq")}</Tab>
          </nav>
        </div>

        {/* Right - Language, role, login/logout */}
        <div className="nav-right">
          <select
            aria-label={t("language")}
            className="lang-compact"
            value={currentLang}
            onChange={(e) => changeLang(e.target.value)}
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>

          {isAuthed ? (
            <>
              <span className="role-badge">{(role || "").toUpperCase()}</span>
              <button className="btn-solid" onClick={logout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-solid">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
