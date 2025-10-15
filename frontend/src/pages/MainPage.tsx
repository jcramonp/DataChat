import { useState, useEffect } from 'react';
import { askData, listExcelSheets, previewExcel } from '../services/api';
import type { ChatResponse } from '../services/api';
import './MainPage.css';
import { useAuth } from '../auth/AuthContext';
import ConnectionCard from "../components/ConnectionCard";
import { Link } from 'react-router-dom';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // 👇 bandera para E2E sin backend
  const forceExcel =
    typeof window !== 'undefined' && (window as any).__E2E_FORCE_EXCEL__ === true;

  // Chat
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Panel conexión
  const [showConn, setShowConn] = useState(false);
  const [lang, setLang] = useState<'es' | 'en'>((i18n.resolvedLanguage as 'es' | 'en') ?? 'es');

  // ⭐️ Fuente recordada en localStorage (clave: dc_source)
  const [source, setSource] = useState<SourceType>(() => {
    if (typeof window === 'undefined') return 'mysql';
    const saved = localStorage.getItem('dc_source') as SourceType | null;
    return saved && (saved === 'mysql' || saved === 'excel' || saved === 'saved') ? saved : 'mysql';
  });

  useEffect(() => {
    // Si el usuario (o el test) entra a /sheets, preparamos la vista Excel
    if (location.pathname.toLowerCase().includes('sheets')) {
      setShowConn(true);
      setSource('excel');
      setExcelPath((prev) => prev || './data/empleados_demo.xlsx');
    }
  }, [location.pathname]);

  useEffect(() => {
    try { localStorage.setItem('dc_source', source); } catch {}
  }, [source]);

  // MySQL
  const [sqlUrl, setSqlUrl] = useState(
    'mysql+pymysql://app:app@localhost:3306/empresa_demo?charset=utf8mb4'
  );

  // Excel
  const [excelPath, setExcelPath] = useState('./data/empleados_demo.xlsx');
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

  // === US05: Cargar hojas Excel ===
  useEffect(() => {
    if (source !== 'excel') return;

    // MODO MOCK (E2E sin backend)
    if (forceExcel) {
      const mockSheets = ['Empleados', 'Departamentos'];
      setSheets(mockSheets);
      setPreview(null);     // se setea en el siguiente effect
      setOffset(0);
      // si no hay hoja seleccionada o no existe, tomamos la primera
      setSheetName((prev) => (prev && mockSheets.includes(String(prev)) ? prev : mockSheets[0]));
      setError('');
      return; // ← no llames a la API
    }

    // MODO REAL (con backend)
    if (!excelPath) return;
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
  }, [source, excelPath, forceExcel]);

  // === US05: Previsualizar hoja ===
  useEffect(() => {
    if (source !== 'excel') return;
    if (!sheetName && sheetName !== 0) return;

    // MODO MOCK (E2E sin backend)
    if (forceExcel) {
      // Pequeño delay para simular carga real
      const timer = setTimeout(() => {
        const columns =
          String(sheetName).toLowerCase().includes('depto')
            ? ['id', 'nombre', 'sede']
            : ['id', 'nombre', 'apellido', 'sueldo'];
        const rows =
          String(sheetName).toLowerCase().includes('depto')
            ? [
                [1, 'Ventas', 'CDMX'],
                [2, 'Marketing', 'Bogotá'],
                [3, 'IT', 'Lima'],
              ]
            : [
                [1, 'Ana', 'Pérez', 1200],
                [2, 'Luis', 'Gómez', 1500],
                [3, 'Marta', 'Ruiz', 1100],
                [4, 'Iván', 'Hernández', 1300],
              ];

        // paginas simuladas con offset/limit
        const pageRows = rows.slice(offset, offset + limit);
        setPreview({ columns, rows: pageRows, total: rows.length });
        setError('');
      }, 80);
      return () => clearTimeout(timer);
    }

    // MODO REAL (con backend)
    if (!excelPath) return;
    setError('');
    previewExcel(excelPath, sheetName, offset, limit)
      .then(r => setPreview({ columns: r.columns, rows: r.rows, total: r.page.total }))
      .catch(() => setError(t("errors.excelPreview")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, excelPath, sheetName, offset, forceExcel]);

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
        token: auth.token ?? "",
        question: q,
        datasource,
        options: { language: lang, max_rows: 200 },
      });

      pushMessage({
        role: 'assistant',
        text: resp.answer,
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

      {/* === VISTA US05 (tabs de hojas + preview de Excel) === */}
      {source === 'excel' && (
        <section className="container mt-16">
          {/* Tabs de hojas */}
          {sheets?.length > 0 && (
            <div role="tablist" aria-label="Hojas" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {sheets.map((s, idx) => {
                const selected = String(sheetName) === String(s) || (sheetName === 0 && idx === 0);
                return (
                  <button
                    key={s}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => { setOffset(0); setSheetName(s); }}
                    {...(idx === 1 ? { 'data-testid': 'tab-2' } : {})}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: selected ? '2px solid #5a49d6' : '1px solid #e5e7eb',
                      background: selected ? '#f0ecfb' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {s || `Sheet${idx + 1}`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tabla de preview */}
          {preview && preview.columns?.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table role="table" data-testid="grid" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {preview.columns.map((c, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((v, ci) => (
                        <td key={ci} style={{ padding: 8, borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                          {v === null || v === undefined || v === '' ? '—' : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setOffset(o => Math.max(0, o - limit))}
                  disabled={offset === 0}
                >
                  {t("common.prev")}
                </button>
                <button
                  type="button"
                  onClick={() => setOffset(o => o + limit)}
                  disabled={(offset + limit) >= (preview?.total ?? 0)}
                >
                  {t("common.next")}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* CHAT */}
      <section className="container mt-16">
        <div className="chat-card">
          <div className="chat-header">
            <h3>{t("main.chat.title", "DataChat Assistant")}</h3>
            <div className="chat-actions">
              <button type="button" title={t("common.newChat")} onClick={() => setMessages([])}>
                ＋
              </button>

              {/* NEW: botón Historial dentro del chat */}
              <button
                type="button"
                title="Ver historial"
                onClick={() => navigate('/history')}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: '#f0ecfb',
                  color: '#5a49d6',
                  fontWeight: 600,
                }}
              >
                Historial
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
                      data-testid="sql-output"
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
                          role="table"
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
