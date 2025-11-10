import { Link, useLocation, useNavigate } from "react-router-dom";
import "./NavBar.css";
import Logo from "./Logo";
import { getAuth, clearAuth } from "../services/api";
import { useTranslation } from "react-i18next";

type TabProps = {
  to: string;
  active: boolean;
  children: React.ReactNode;
};

const Tab = ({ to, active, children }: TabProps) => (
  <Link
    to={to}
    className={`nav-pill ${active ? "active" : ""}`}
    aria-current={active ? "page" : undefined}
  >
    {children}
  </Link>
);

// Links tipo “How it works, Privacy…” (se ocultan al estar logueado)
const EXTRA_LINKS = [
  { label: "How it works", to: "/" },
  { label: "Privacy", to: "/" },
  { label: "Pricing", to: "/" },
  { label: "About", to: "/" },
  { label: "Resources", to: "/" },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { token, role } = getAuth();
  const isAuthed = Boolean(token);

  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || localStorage.getItem("dc_lang") || "en")
    .slice(0, 2)
    .toLowerCase() as "en" | "es";

  const setLang = (lng: "en" | "es") => {
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
          {/* Si quieres mostrar texto junto al logo, descomenta: */}
          {/* <span className="dc-brand-name">DataChat</span> */}
        </Link>

        {/* Center - Rail */}
        <div className="nav-center">
          <nav className="seg-rail" aria-label="Primary">
            <Tab to="/" active={is("/")}>{t("nav.home")}</Tab>

            {/* Enlaces “extra”: solo si NO hay sesión */}
            {!isAuthed &&
              EXTRA_LINKS.map((l) => (
                <Tab key={l.label} to={l.to} active={false}>
                  {l.label}
                </Tab>
              ))}

            {/* Rutas según rol */}
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

            <Tab to="/faq" active={is("/faq")}>
              {t("nav2.faq")}
            </Tab>
          </nav>
        </div>

        {/* Right - EN/ES + Login/Logout + rol */}
        <div className="nav-right">
          <div className="lang-buttons" aria-label="Language">
            <button
              className={`lang-pill ${currentLang === "en" ? "active" : ""}`}
              onClick={() => setLang("en")}
              type="button"
            >
              EN
            </button>
            <button
              className={`lang-pill ${currentLang === "es" ? "active" : ""}`}
              onClick={() => setLang("es")}
              type="button"
            >
              ES
            </button>
          </div>

          {isAuthed ? (
            <>
              <span className="role-badge">{(role || "").toUpperCase()}</span>
              <button className="btn-gradient" onClick={logout}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-gradient">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
