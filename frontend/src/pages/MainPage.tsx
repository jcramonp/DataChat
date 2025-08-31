import { useState } from 'react';

import { askData } from '../services/api';
import type { AskResponse } from '../services/api';

import './MainPage.css';

type Msg = {
  role: 'user' | 'assistant';
  text: string;
  translation?: AskResponse['translation'] | null;
};

export default function MainPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pushMessage = (msg: Msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const q = input.trim();
    if (!q) return;
    setInput('');
    pushMessage({ role: 'user', text: q });
    setLoading(true);
    try {
      const { answer, translation } = await askData(q);
      pushMessage({ role: 'assistant', text: answer, translation });
    } catch (err: unknown) {
      setError('No se pudo obtener respuesta del servidor.');
      pushMessage({ role: 'assistant', text: '⚠️ Error consultando el backend.' });
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
            Get Instant insights from your company database using natural language. No
            SQL-Excel knowledge required
          </p>
          <div className="suggestions">
            {[
              'How many employees joined this year?',
              'Show me sales by region',
              'Which customers have the highest orders',
            ].map((s) => (
              <button key={s} type="button" onClick={() => setInput(s)}>
                {s}
              </button>
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
              <button type="button" title="New Chat" onClick={() => setMessages([])}>
                ＋
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.text} className={`msg ${m.role}`}>
                <div>{m.text}</div>

                {/* US07: Mostrar query solo en respuestas del assistant */}
                {m.role === 'assistant' && m.translation?.text && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      View Query{' '}
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 12,
                          background: '#ece7f5',
                          color: '#4b3fb3',
                          padding: '2px 6px',
                          borderRadius: 8,
                        }}
                      >
                        {m.translation.type.toUpperCase()}
                      </span>
                    </summary>
                    <pre
                      style={{
                        background: '#0f172a',
                        color: '#e2e8f0',
                        padding: 10,
                        borderRadius: 10,
                        overflowX: 'auto',
                        marginTop: 6,
                      }}
                    >
                      {m.translation.text}
                    </pre>
                    <button
                      type="button"
                      onClick={async () =>
                        navigator.clipboard.writeText(m.translation!.text)
                      }
                      style={{
                        marginTop: 6,
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        background: '#f0ecfb',
                        color: '#5a49d6',
                        fontWeight: 600,
                      }}
                    >
                      Copy
                    </button>
                  </details>
                )}
              </div>
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
              {loading ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
