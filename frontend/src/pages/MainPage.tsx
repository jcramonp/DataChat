import { useState } from "react";
import "./MainPage.css";
import { askData } from "../services/api";

type Msg = { role: "user" | "assistant"; text: string };

export default function MainPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const push = (role: Msg["role"], text: string) =>
    setMessages((prev) => [...prev, { role, text }]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const q = input.trim();
    if (!q) return;
    setInput("");
    push("user", q);
    setLoading(true);
    try {
      const { answer } = await askData(q);
      push("assistant", answer);
    } catch {
      setError("No se pudo obtener respuesta del servidor.");
      push("assistant", "⚠️ Error consultando el backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container center">
          <h1 className="hero-title">Ask Your Data Anything</h1>
          <p className="hero-sub">
            Get Instant insights from your company database using natural language.
            No SQL-Excel knowledge required
          </p>
          <div className="suggestions">
            {[
              "How many employees joined this year?",
              "Show me sales by region",
              "Which customers have the highest orders",
            ].map((s) => (
              <button key={s} onClick={() => setInput(s)}>{s}</button>
            ))}
          </div>
        </div>
      </section>

      {/* CHAT */}
      <section className="container mt-32">
        <div className="chat-card">
          <div className="chat-header">
            <h3>DataChat Assistant</h3>
            <div className="chat-actions">
              <button title="New Chat" onClick={() => setMessages([])}>＋</button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>{m.text}</div>
            ))}
            {loading && <div className="msg assistant">… DataChat is thinking</div>}
          </div>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleSend} className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What are the total sales of July?"
            />
            <button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
