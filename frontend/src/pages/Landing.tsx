import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "../components/Logo";
import "../components/NavBar.css"; // puedes dejarlo si Navbar vive fuera
import "./Landing.css";
import { useAuth } from "../auth/authcontext";

export default function Landing() {
  const { t } = useTranslation();
  const { auth } = useAuth();

  // Si es admin -> /admin, si no -> /main
  const target = auth.role === "admin" ? "/admin" : "/main";

  return (
    <main className="landing-wrap">
      <section className="landing-hero-card">
        {/* Logo + marca */}
        <div
          className="hero-brand"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Logo size={48} />
          <div
            style={{
              fontWeight: 600,
              fontSize: "1rem",
              color: "inherit",
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            DataChat
          </div>
        </div>

        {/* Headline */}
        <h1 className="hero-headline">
          {t("landing.title")}
        </h1>

        {/* Subtítulo */}
        <p className="hero-desc">
          {t("landing.subtitle")}
        </p>

        {/* CTA */}
        <Link to={target} className="cta-btn">
          {t("landing.cta")}
        </Link>
      </section>
    </main>
  );
}
