import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Logo from "../components/Logo";
import "../components/NavBar.css";
import "./Landing.css";
import { useAuth } from "../auth/AuthContext";

/** Mensajes de demo en contexto DataChat (EN/ES) */
type Msg = { role: "user" | "assistant"; text: string };

const MESSAGES = {
  en: [
    { role: "user", text: "Show Q3 sales by country." },
    { role: "assistant", text: "Here's a summary: USA $2.1M, Mexico $1.4M, Spain $980K, Colombia $650K." },
    { role: "user", text: "Top 5 customers by revenue, this year." },
    { role: "assistant", text: "Acme Corp, Globex, Contoso, Umbrella, Wayne Industries." },
    { role: "user", text: "How many employees joined in 2024?" },
    { role: "assistant", text: "84 new hires. Most in Engineering (32) and Sales (21)." },
  ] as Msg[],
  es: [
    { role: "user", text: "Muestra ventas del Q3 por país." },
    { role: "assistant", text: "Resumen: EE. UU. $2.1M, México $1.4M, España $980K, Colombia $650K." },
    { role: "user", text: "Top 5 clientes por facturación de este año." },
    { role: "assistant", text: "Acme Corp, Globex, Contoso, Umbrella, Wayne Industries." },
    { role: "user", text: "¿Cuántos empleados ingresaron en 2024?" },
    { role: "assistant", text: "84 altas nuevas. Mayoría en Ingeniería (32) y Ventas (21)." },
  ] as Msg[],
};

/** Hook simple para simular tipeo secuencial */
function useTypeSequence(all: Msg[], speed = 24, pause = 800) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState<Msg[]>([]);

  useEffect(() => {
    if (index >= all.length) return;
    const full = all[index].text;
    let i = 0;
    setTyped("");
    const id = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(id);
        setTimeout(() => {
          setDone((d) => [...d, all[index]]);
          setIndex((n) => n + 1);
        }, pause);
      }
    }, Math.max(8, 1000 / speed));
    return () => clearInterval(id);
  }, [index, all, speed, pause]);

  const current: Msg | null =
    index < all.length ? { role: all[index].role, text: typed } : null;

  return { done, current, finished: index >= all.length };
}

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { auth } = useAuth();
  const target = auth.role === "admin" ? "/admin" : "/main";

  const lang = (i18n.language || "en").slice(0, 2) as "en" | "es";
  const msgs = useMemo(() => MESSAGES[lang], [lang]);
  const { done, current } = useTypeSequence(msgs, 26, 900);

  return (
    <>
      {/* ===== HERO ===== */}
      <main className="landing-hero">
        {/* Izquierda: título + subtítulo + CTA */}
        <section className="hero-left">
          <div className="brand-line">
            <Logo size={40} withText />
          </div>
          <h1 className="hero-title">{t("landing.title")}</h1>
          <p className="hero-sub">{t("landing.subtitle")}</p>

          <Link to={target} className="hero-cta">
            {t("landing.cta")} <span className="cta-arrow">↗</span>
          </Link>
        </section>

        {/* Derecha: demo del chat */}
        <section className="hero-right">
          <div className="device">
            <div className="screen">
              {done.map((m, i) => (
                <div key={i} className={`bubble ${m.role} appear`}>
                  <p>{m.text}</p>
                </div>
              ))}
              {current && (
                <div className={`bubble ${current.role} typing`}>
                  <p>
                    {current.text}
                    <span className="cursor">|</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="floating q">Q</div>
          <div className="floating a">A</div>
        </section>
      </main>

      {/* ===== HOW IT WORKS (light section) ===== */}
      <section id="how-it-works" className="hiw">
        <div className="hiw-header">
          <span className="hiw-badge">{lang === "es" ? "Cómo funciona" : "How it works"}</span>
          <h2 className="hiw-title">
            {lang === "es"
              ? "De la pregunta a la respuesta en segundos"
              : "From question to answer in seconds"}
          </h2>
          <p className="hiw-sub">
            {lang === "es"
              ? "DataChat transforma preguntas en consultas a tu base de datos sin escribir SQL."
              : "DataChat turns questions into database queries—no SQL needed."}
          </p>
        </div>

        <div className="hiw-grid">
          <div className="hiw-steps">
            <article className="hiw-step">
              <div className="hiw-num">1</div>
              <div>
                <h3>{lang === "es" ? "Haz tu pregunta" : "Ask your question"}</h3>
                <p>
                  {lang === "es"
                    ? "Escribe en español o inglés. Por ejemplo: “Ventas del Q3 por país”."
                    : "Type in English or Spanish. For example: “Q3 sales by country.”"}
                </p>
              </div>
            </article>
            <article className="hiw-step">
              <div className="hiw-num">2</div>
              <div>
                <h3>{lang === "es" ? "Generamos la consulta" : "We generate the query"}</h3>
                <p>
                  {lang === "es"
                    ? "DataChat crea la consulta y la ejecuta con seguridad sobre tu conexión."
                    : "DataChat builds and safely runs the query against your connection."}
                </p>
              </div>
            </article>
            <article className="hiw-step">
              <div className="hiw-num">3</div>
              <div>
                <h3>{lang === "es" ? "Te devolvemos insight" : "We return insights"}</h3>
                <p>
                  {lang === "es"
                    ? "Verás resultados claros: tablas, totales y un resumen listo para compartir."
                    : "Get clear results—tables, totals, and a share-ready summary."}
                </p>
              </div>
            </article>
          </div>

          {/* Panel visual a la derecha (mock) */}
          <div className="hiw-media">
            <div className="hiw-card">
              <div className="hiw-wave" />
              <div className="hiw-card-body">
                <div className="hiw-chip">{lang === "es" ? "Demo" : "Demo"}</div>
                <p className="hiw-line">{lang === "es" ? "Usuario: Ventas Q3 por país" : "User: Q3 sales by country"}</p>
                <div className="hiw-table">
                  <div className="t-row t-head">
                    <div>Country</div><div>Sales</div>
                  </div>
                  <div className="t-row"><div>USA</div><div>$2.1M</div></div>
                  <div className="t-row"><div>Mexico</div><div>$1.4M</div></div>
                  <div className="t-row"><div>Spain</div><div>$980K</div></div>
                  <div className="t-row"><div>Colombia</div><div>$650K</div></div>
                </div>
                <p className="hiw-note">
                  {lang === "es"
                    ? "Resumen generado automáticamente a partir de tus datos."
                    : "Summary auto-generated from your data."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
