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
  const [index, setIndex] = useState(0);          // qué mensaje
  const [typed, setTyped] = useState("");         // texto tipeado del mensaje actual
  const [done, setDone] = useState<Msg[]>([]);    // mensajes completados

  useEffect(() => {
    if (index >= all.length) return; // terminado
    const full = all[index].text;
    let i = 0;
    setTyped(""); // reiniciar
    const id = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(id);
        // esperar un poco y avanzar
        setTimeout(() => {
          setDone((d) => [...d, all[index]]);
          setIndex((n) => n + 1);
        }, pause);
      }
    }, Math.max(8, 1000 / speed)); // velocidad a caracteres/seg
    return () => clearInterval(id);
  }, [index, all, speed, pause]);

  const current: Msg | null =
    index < all.length ? { role: all[index].role, text: typed } : null;

  return { done, current, finished: index >= all.length };
}

export default function Landing() {
  const { t, i18n } = useTranslation();
  const { auth } = useAuth(); // rol actual
  const target = auth.role === "admin" ? "/admin" : "/main"; // destino CTA

  const lang = (i18n.language || "en").slice(0, 2) as "en" | "es";
  const msgs = useMemo(() => MESSAGES[lang], [lang]);
  const { done, current } = useTypeSequence(msgs, 26, 900);

  return (
    <main className="landing-hero">
      {/* Izquierda: título + subtítulo + CTA */}
      <section className="hero-left">
        <div className="brand-line">
          <Logo size={40} withText />
        </div>
        <h1 className="hero-title">{t("landing.title")}</h1>
        <p className="hero-sub">{t("landing.subtitle")}</p>

        <Link to={target} className="hero-cta">
          {t("landing.cta")}
          <span className="cta-arrow">↗</span>
        </Link>
      </section>

      {/* Derecha: demo del chat */}
      <section className="hero-right">
        <div className="device">
          <div className="screen">
            {/* Mensajes ya completados */}
            {done.map((m, i) => (
              <div key={i} className={`bubble ${m.role} appear`}>
                <p>{m.text}</p>
              </div>
            ))}
            {/* Mensaje en tipeo */}
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

        {/* burbujas flotantes decorativas estilo “Q/A” */}
        <div className="floating q">Q</div>
        <div className="floating a">A</div>
      </section>
    </main>
  );
}
