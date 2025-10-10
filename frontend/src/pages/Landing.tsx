import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Logo from '../components/Logo';
import '../components/NavBar.css';
import './Landing.css';

export default function Landing() {
  const { t } = useTranslation(); // +++

  return (
    <main className="landing-wrap">
      <section className="hero-card">
        <div className="hero-logo"><Logo size={48} /></div>
        <h3 className="hero-title">{t("landing.title")}</h3>
        <p className="hero-sub">{t("landing.subtitle")}</p>
        <Link to="/main" className="cta-btn">{t("landing.cta")}</Link>
      </section>
    </main>
  );
}
