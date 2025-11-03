import { useTranslation } from "react-i18next";
import "./MainPage.css"; // reutilizamos estilos (container, etc.)

type FaqItem = { q: string; a: string };

export default function FaqPage() {
  const { t } = useTranslation();
  const items = t("faq.items", { returnObjects: true }) as FaqItem[];

  return (
    <main className="container mt-16">
      <section className="chat-card" style={{ borderRadius: 16 }}>
        <h1 style={{ margin: 0 }}>{t("faq.title")}</h1>
        <p style={{ color: "#6b7280" }}>{t("faq.intro")}</p>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {items.map((it, i) => (
            <details key={i} style={{ background: "#fff", borderRadius: 12, padding: "10px 14px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{it.q}</summary>
              <p style={{ marginTop: 8, color: "#374151" }}>{it.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
