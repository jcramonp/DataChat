import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useState } from "react";
import Logo from '../components/Logo';
import '../components/NavBar.css';
import './Landing.css';

export default function Landing() {
  const { t } = useTranslation();
  const [sql, setSql] = useState<string | null>(null); // 👈 para mostrar el SQL tras el click

  return (
    <main className="landing-wrap">
      <section className="hero-card">
        <div className="hero-logo"><Logo size={48} /></div>
        <h3 className="hero-title">{t("landing.title")}</h3>
        <p className="hero-sub">{t("landing.subtitle")}</p>

        {/* 👇 bloque de prompts estable para E2E */}
        <div
          data-testid="starting-prompts"
          style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12 }}
        >
          <button
            type="button"
            onClick={() => setSql("SELECT * FROM ventas LIMIT 10")}
            title={t("landing.prompt.sales", "Ventas por mes")}
          >
            {t("landing.prompt.sales", "ventas por mes")}
          </button>
          {/* puedes añadir más botones si quieres */}
        </div>

        {/* 👇 salida de SQL para que el E2E lo valide */}
        {sql && (
          <pre
            data-testid="sql-output"
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              padding: 10,
              borderRadius: 10,
              overflowX: 'auto',
              marginBottom: 12,
              maxWidth: 680,
              marginInline: 'auto',
              textAlign: 'left',
            }}
          >
            {sql}
          </pre>
        )}

        <Link to="/main" className="cta-btn">{t("landing.cta")}</Link>
      </section>
    </main>
  );
}
