import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "../components/Logo";
import "../components/NavBar.css";
import "./Landing.css";
import { useAuth } from '../auth/AuthContext';

export default function Landing() {
  const { t } = useTranslation();
  const { auth } = useAuth(); // obtenemos el rol

  // 👇 definimos la ruta de destino según el rol
  const target = auth.role === "admin" ? "/admin" : "/main";

  return (
    <main className="landing-wrap">
      <section className="hero-card">
        <div className="hero-logo">
          <Logo size={48} />
        </div>

        <h3 className="hero-title">{t("landing.title")}</h3>
        <p className="hero-sub">{t("landing.subtitle")}</p>

        {/* 👇 el botón lleva a /admin si es admin, o /main si es usuario */}
        <Link to={target} className="cta-btn">
          {t("landing.cta")}
        </Link>
      </section>
    </main>
  );
}
