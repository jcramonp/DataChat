import { useState, useEffect } from 'react';
import { askData, listExcelSheets, previewExcel } from '../services/api';
import type { ChatResponse } from '../services/api';
import './MainPage.css';
import DataTable from '../components/DataTable';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

type Msg = {
  role: 'user' | 'assistant';
  text: string;
  sql?: { type: 'sql' | 'pandas'; code: string } | null;
  table?: ChatResponse['table'] | null;
};

type SourceType = 'mysql' | 'excel' | 'saved';

export default function MainPage() {
  const { auth } = useAuth();

  // Chat
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Panel conexión
  const [showConn, setShowConn] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [source, setSource] = useState<SourceType>('mysql');

  // MySQL
  const [sqlUrl, setSqlUrl] = useState(
    'mysql+pymysql://app:app@localhost:3306/empresa_demo?charset=utf8mb4'
  );

  // Excel
  const [excelPath, setExcelPath] = useState('C:/data/empleados.xlsx');
  const [sheetName, setSheetName] = useState<string | number | undefined>(0);
  const [sheets, setSheets] = useState<string[]>([]);
  const [preview, setPreview] = useState<null | { columns: string[]; rows: any[][]; total: number }>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Saved (admin)
  const [connectionId, setConnectionId] = useState<number | ''>('');

  const pushMessage = (m: Msg) => setMessages(prev => [...prev, m]);

  // =========================
  // 📡 US05: Cargar hojas Excel
  // =========================
  useEffect(() => {
    if (source !== 'excel' || !excelPath) return;
    setSheets([]);
    setPreview(null);
    setOffset(0);

    listExcelSheets(excelPath)
      .then(({ sheets }) => {
        setSheets(sheets);
        const next = sheets?.length ? sheets[0] : 0;
        setSheetName(prev => (prev && sheets.includes(String(prev)) ? prev : next));
      })
      .catch(() => setError('No se pudieron cargar las hojas del Excel'));
  }, [source, excelPath]);

  // =========================
  // 📄 US05: Previsualizar hoja
  // =========================
  useEffect(() => {
    if (source !== 'excel' || !excelPath || sheetName === undefined || sheetName === null) return;
    setError('');
    previewExcel(excelPath, sheetName, offset, limit)
      .then(r => setPreview({ columns: r.columns, rows: r.rows, total: r.page.total }))
      .catch(() => setError('No se pudo previsualizar la hoja seleccionada'));
  }, [source, excelPath, sheetName, offset]);

  // =========================
  // 💬 Enviar mensaje
  // =========================
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const q = input.trim();
    if (!q) return;

    if (source === 'mysql' && !sqlUrl) {
      setError('Debes indicar la SQLAlchemy URL para MySQL.');
      return;
    }
    if (source === 'excel' && !excelPath) {
      setError('Debes indicar la ruta del Excel en el servidor.');
      return;
    }
    if (source === 'saved' && (connectionId === '' || isNaN(Number(connectionId)))) {
      setError('Debes indicar un Connection ID válido (número).');
      return;
    }

    setInput('');
    pushMessage({ role: 'user', text: q });
    setLoading(true);

    try {
      const datasource =
        source === 'mysql'
          ? ({ type: 'mysql', sqlalchemy_url: sqlUrl } as const)
          : source === 'excel'
          ? ({ type: 'excel', path: excelPath, sheet_name: sheetName } as const)
          : ({ type: 'saved', connection_id: Number(connectionId) } as const);

      const resp = await askData({
        token: auth.token,
        question: q,
        datasource,
        options: { language: lang, max_rows: 200 },
      });

      pushMessage({
        role: 'assistant',
        text: resp.answer_text,
        sql: resp.generated,
        table: resp.table ?? null,
      });
    } catch (err: any) {
      setError(err?.message || 'No se pudo obtener respuesta del servidor.');
      pushMessage({ role: 'assistant', text: '⚠️ Error consultando el backend.' });
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 🧠 Render
  // =========================
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container center">
          <h1 className="hero-title">Ask Your Data Anything</h1>
          <p className="hero-sub">
            Get instant insights from your company database using natural language. No SQL-Excel
            knowledge required.
          </p>
          <div className="suggestions">
            {[
              'How many employees joined this year?',
              'Show me sales by region',
              'Which customers have the highest orders',
            ].map(s => (
              <button key={s} type="button" onClick={() => setInput(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PANEL DE CONEXIÓN */}
      <section className="container mt-16">
        <div className="chat-card" style={{ borderTop: '1px solid #e7e3ef', borderRadius: 16 }}>
          <div className="conn-header">
            <h3 style={{ marginTop: 0 }}>Connection</h3>
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowConn(s => !s)}
              aria-expanded={showConn}
              aria-controls="conn-body"
              title={showConn ? 'Hide' : 'Show'}
            >
              {showConn ? 'Hide' : 'Show'}
            </button>
          </div>

          <div id="conn-body" className={`conn-body ${showConn ? 'open' : 'closed'}`} aria-hidden={!showConn}>
            {/* Tipo de fuente */}
            <div className="connection-controls" style={{ display: 'flex', gap: 12, margin: '10px 0' }}>
              <label>
                <input
                  type="radio"
                  name="source"
                  value="mysql"
                  checked={source === 'mysql'}
                  onChange={() => setSource('mysql')}
                />
                MySQL
              </label>
              <label>
                <input
                  type="radio"
                  name="source"
                  value="excel"
                  checked={source === 'excel'}
                  onChange={() => setSource('excel')}
                />
                Excel
              </label>
              <label>
                <input
                  type="radio"
                  name="source"
                  value="saved"
                  checked={source === 'saved'}
                  onChange={() => setSource('saved')}
                />
                Saved (admin)
              </label>
            </div>

            {/* Config común */}
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="text-sm" style={{ color: '#6b7280' }}>
                {auth?.token ? `Sesión iniciada (${auth.role?.toUpperCase() || 'USER'})` : 'No has iniciado sesión'}
              </div>

              <label className="text-sm">
                Language
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value as 'es' | 'en')}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: '1px solid #d9d9e3',
                    marginTop: 6,
                  }}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </label>

              {source === 'mysql' && (
                <label className="text-sm">
                  SQLAlchemy URL
                  <input
                    value={sqlUrl}
                    onChange={e => setSqlUrl(e.target.value)}
                    placeholder="mysql+pymysql://user:pass@host:3306/db"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid #d9d9e3',
                      marginTop: 6,
                    }}
                  />
                </label>
              )}

              {/* Excel */}
              {source === 'excel' && (
                <>
                  <label className="text-sm">
                    Excel path (server-visible)
                    <input
                      value={excelPath}
                      onChange={e => setExcelPath(e.target.value)}
                      placeholder="C:/data/empleados.xlsx"
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #d9d9e3',
                        marginTop: 6,
                      }}
                    />
                  </label>

                  {/* Selector de hoja */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Sheet:</label>
                      <select
                        className="border rounded px-2 py-1"
                        value={String(sheetName ?? '')}
                        onChange={e => {
                          setOffset(0);
                          setSheetName(e.target.value);
                        }}
                      >
                        {sheets.map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs opacity-70">
                        {preview ? `${preview.total} filas` : ''}
                      </span>
                    </div>

                    {/* Vista previa */}
                    {preview && preview.rows.length > 0 && (
                      <div className="border rounded">
                        <DataTable columns={preview.columns} rows={preview.rows} defaultPageSize={10} />
                      </div>
                    )}

                  </div>
                </>
              )}

              {source === 'saved' && (
                <label className="text-sm">
                  Connection ID
                  <input
                    value={String(connectionId)}
                    onChange={e =>
                      setConnectionId(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="1"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid #d9d9e3',
                      marginTop: 6,
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CHAT */}
      <section className="container mt-16">
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
            {messages.map((m, idx) => (
              <div key={idx + m.text} className={`msg ${m.role}`}>
                <div>{m.text}</div>

                {m.role === 'assistant' && m.sql?.code && (
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
                        {m.sql.type.toUpperCase()}
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
                      {m.sql.code}
                    </pre>
                    <button
                      type="button"
                      onClick={async () => navigator.clipboard.writeText(m.sql!.code)}
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
                    {m.table && m.table.columns?.length ? (
                      <div style={{ marginTop: 12, overflowX: 'auto' }}>
                        <table
                          style={{
                            borderCollapse: 'collapse',
                            width: '100%',
                            fontSize: '14px',
                          }}
                        >
                          <thead>
                            <tr>
                              {m.table.columns.map((c, i) => (
                                <th
                                  key={i}
                                  style={{
                                    border: '1px solid #e5e7eb',
                                    padding: '8px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    background: '#f1f5f9',
                                    color: '#111827',
                                  }}
                                >
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {m.table.rows.map((r, ri) => (
                              <tr key={ri}>
                                {r.map((v, ci) => (
                                  <td
                                    key={ci}
                                    style={{
                                      border: '1px solid #f1f3f5',
                                      padding: '6px 8px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {v === null || v === undefined || v === '' ? '—' : String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
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
              onChange={e => setInput(e.target.value)}
              placeholder={
                lang === 'es'
                  ? '¿Cuántos empleados hay en la sede 2?'
                  : 'How many employees are in site 2?'
              }
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
