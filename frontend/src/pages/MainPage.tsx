import { useState, useEffect } from 'react';
import { askData, listExcelSheets, previewExcel } from '../services/api';
import type { ChatResponse } from '../services/api';
import './MainPage.css';
import { useAuth } from '../auth/AuthContext';
import ConnectionCard from "../components/ConnectionCard";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";

type Msg = {
  role: 'user' | 'assistant';
  text: string;
  sql?: { type: 'sql' | 'pandas'; code: string } | null;
  table?: ChatResponse['table'] | null;
};

type SourceType = 'mysql' | 'excel' | 'saved';

export default function MainPage() {
  const { auth } = useAuth();
  const { t, i18n } = useTranslation();

  // Chat
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Panel conexión
  const [showConn, setShowConn] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>((i18n.resolvedLanguage as 'es' | 'en') ?? 'es');
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

  // Mantener sincronizado el idioma de i18next con el estado local
  useEffect(() => {
    const next = (i18n.resolvedLanguage as 'es' | 'en') ?? 'es';
    if (next !== lang) setLang(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.resolvedLanguage]);

  //  US05: Cargar hojas Excel
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
      .catch(() => setError(t("errors.excelSheets")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, excelPath]);

  //  US05: Previsualizar hoja
  useEffect(() => {
    if (source !== 'excel' || !excelPath || sheetName === undefined || sheetName === null) return;
    setError('');
    previewExcel(excelPath, sheetName, offset, limit)
      .then(r => setPreview({ columns: r.columns, rows: r.rows, total: r.page.total }))
      .catch(() => setError(t("errors.excelPreview")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, excelPath, sheetName, offset]);

  //  Enviar mensaje
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const q = input.trim();
    if (!q) return;

    // Validaciones previas al envío
    if (source === 'mysql' && !sqlUrl) {
      setError(t("errors.missingSqlUrl"));
      return;
    }
    if (source === 'excel' && !excelPath) {
      setError(t("errors.missingExcelPath"));
      return;
    }
    if (source === 'saved' && (connectionId === '' || isNaN(Number(connectionId)))) {
      setError(t("errors.invalidConnectionId"));
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
      const msg = (err?.message || "").toLowerCase();
      if (err?.status === 401 || msg.includes("jwt") || msg.includes("unauthorized") || msg.includes("no autorizado")) {
        setError(t("errors.unauthorized"));
      } else if (err?.status === 403) {
        setError(t("errors.forbidden"));
      } else if (err?.status === 404) {
        setError(t("errors.not_found"));
      } else if (msg.includes("network")) {
        setError(t("errors.network"));
      } else {
        setError(t("errors.backend"));
      }
      pushMessage({ role: 'assistant', text: `⚠️ ${t("errors.backend")}` });
    } finally {
      setLoading(false);
    }
  };

  // Render
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container center">
          <h1 className="hero-title">{t("landing.title")}</h1>
          <p className="hero-sub">{t("landing.subtitle")}</p>
          <div className="suggestions">
            {[
              t("main.suggestions.q1"),
              t("main.suggestions.q2"),
              t("main.suggestions.q3"),
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
        <ConnectionCard
          // UI
          title={t("main.connection.title")}
          show={showConn}
          onToggle={() => setShowConn(s => !s)}
          showText={t("common.show")}
          hideText={t("common.hide")}

          // Sesión / Idioma
          signedText={
            auth?.token
              ? t("session.signedIn", { role: (auth.role?.toUpperCase() || "USER") })
              : t("session.signedOut")
          }
          langLabel={t("language")}
          lang={lang}
          onLangChange={(next) => { setLang(next); i18n.changeLanguage(next); }}

          // Fuente: labels traducidos
          sourceLabel={t("connection.source")}
          sourceAriaLabel={t("connection.sourceAria")}
          mysqlLabel={t("connection.sources.mysql")}
          excelLabel={t("connection.sources.excel")}
          savedLabel={t("connection.sources.admin")}

          // Fuente: estado y handlers
          source={source}
          onSourceChange={(s) => setSource(s)}

          // MySQL
          sqlalchemyLabel={t("main.labels.sqlalchemyUrl")}
          sqlalchemyPlaceholder={t("main.mysql.placeholder")}
          sqlUrl={sqlUrl}
          onSqlUrlChange={setSqlUrl}

          // Excel
          excelPathLabel={t("main.labels.excelPath")}
          excelPathPlaceholder={t("main.excel.placeholder")}
          excelPath={excelPath}
          onExcelPathChange={setExcelPath}
          sheetLabel={t("main.labels.sheet")}
          rowsLabel={t("main.labels.rows")}
          sheets={sheets}
          sheetName={sheetName}
          onSheetNameChange={(v) => {
            setOffset(0);
            setSheetName(v);
          }}
          preview={preview}

          // Saved/Admin
          connectionIdLabel={t("main.labels.connectionId")}
          connectionId={connectionId}
          onConnectionIdChange={setConnectionId}
        />
      </section>

      {/* CHAT */}
      <section className="container mt-16">
        <div className="chat-card">
          <div className="chat-header">
            <h3>{t("main.chat.title", "DataChat Assistant")}</h3>
            <div className="chat-actions">
              <button type="button" title={t("common.newChat")} onClick={() => setMessages([])}>
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
                      {t("common.viewQuery")}{' '}
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
                      {t("common.copy")}
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
            {loading && <div className="msg assistant">… {t("main.chat.thinking")}</div>}
          </div>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleSend} className="chat-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t("main.chat.placeholder")}
            />
            <button type="submit" disabled={loading}>
              {loading ? t("main.chat.sending") : t("main.chat.send")}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
