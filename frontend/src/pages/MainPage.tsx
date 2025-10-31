import { useEffect, useRef, useState } from 'react';
import { askData, listExcelSheetsById, previewExcelById, uploadExcel } from '../services/api';
import type { ChatResponse } from '../services/api';
import './MainPage.css';
import { useAuth } from '../auth/AuthContext';
import ConnectionCard from "../components/ConnectionCard";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import DataTable from '../components/DataTable';

type Msg = {
  role: 'user' | 'assistant';
  text: string;
  sql?: { type: 'sql' | 'pandas'; code: string } | null;
  table?: ChatResponse['table'] | null;
};

type SourceType = 'mysql' | 'excel' | 'saved';

/** 
 * Botón de micrófono inline:
 * - Toca para grabar / vuelve a tocar para detener.
 * - Sube el audio a /asr/transcribe.
 * - Pasa el texto transcrito al padre con onText (no envía automáticamente).
 */
function MicCapture({ onText, apiBase }: { onText: (t: string) => void; apiBase?: string }) {
  const [supported, setSupported] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(!!(navigator.mediaDevices && (window as any).MediaRecorder));
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch { }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function start() {
    if (!supported || busy) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstart = () => setRecording(true);
      mr.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        setBusy(true);
        try {
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          const fd = new FormData();
          fd.append("file", blob, "audio.webm");
          const base = apiBase ?? (import.meta.env.VITE_API_URL as string);
          const res = await fetch(`${base}/asr/transcribe`, { method: "POST", body: fd });
          if (!res.ok) {
            const msg = await res.text().catch(() => "");
            throw new Error(`ASR ${res.status}: ${msg || "error"}`);
          }
          const data = await res.json();
          const text = (data?.text || "").trim();
          if (text) onText(text);
        } catch (e) {
          console.error(e);
        } finally {
          setBusy(false);
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
    } catch (e) {
      console.error(e);
    }
  }

  function stop() {
    try {
      mediaRecorderRef.current?.stop();
    } catch { }
  }

  function toggle() {
    if (!supported || busy) return;
    if (!recording) start();
    else stop();
  }

  // Botón minimalista solo con ícono 🎤, cambia a rojo cuando graba
  return (
    <button
      type="button"
      onClick={toggle}
      title={supported ? (recording ? "Detener" : "Grabar") : "Micrófono no soportado"}
      disabled={!supported || busy}
      aria-label={recording ? "Detener grabación" : "Comenzar grabación"}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: 'none',
        cursor: supported && !busy ? 'pointer' : 'not-allowed',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: recording ? '#dc2626' : '#6b7280',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        margin: '0 8px'
      }}
    >
      {/* mic icon */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21H9v2h6v-2h-2v-3.08A7 7 0 0 0 19 11h-2z" />
      </svg>
    </button>
  );
}

export default function MainPage() {
  const { auth } = useAuth();
  const navigate = useNavigate();
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
  const [excelFileId, setExcelFileId] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Saved (admin)
  const [connectionId, setConnectionId] = useState<number | ''>('');

  const pushMessage = (m: Msg) => setMessages(prev => [...prev, m]);

  // Mantener sincronizado el idioma
  useEffect(() => {
    const next = (i18n.resolvedLanguage as 'es' | 'en') ?? 'es';
    if (next !== lang) setLang(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.resolvedLanguage]);

  //  US05: Cargar hojas Excel
  useEffect(() => {
    if (source !== 'excel' || !excelFileId) return;
    setSheets([]);
    setPreview(null);
    setOffset(0);

    listExcelSheetsById(excelFileId, auth.token ?? '')
      .then(({ sheets }) => {
        setSheets(sheets);
        const next = sheets?.length ? sheets[0] : 0;
        setSheetName(prev => (prev && sheets.includes(String(prev)) ? prev : next));
      })
      .catch(() => setError(t("errors.excelSheets")));
  }, [source, excelFileId]);

  //  US05: Previsualizar hoja
  useEffect(() => {
    if (source !== 'excel' || !excelFileId || sheetName === undefined || sheetName === null) return;
    setError('');
    previewExcelById(excelFileId, sheetName, offset, limit, auth.token ?? '')
      .then(r => setPreview({ columns: r.columns, rows: r.rows, total: r.page.total }))
      .catch(() => setError(t("errors.excelPreview")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, excelFileId, sheetName, offset]);

  /** Envía pregunta al backend (uso existente) */
  const sendPrompt = async (q: string): Promise<boolean> => {
    const question = (q || '').trim();
    setError('');
    if (!question) return false;

    // Validaciones
    if (source === 'mysql' && !sqlUrl) {
      setError(t("errors.missingSqlUrl"));
      return false;
    }
    if (source === 'excel' && !excelFileId) {
      setError(t("errors.missingExcelPath"));
      return false;
    }
    if (source === 'saved' && (connectionId === '' || isNaN(Number(connectionId)))) {
      setError(t("errors.invalidConnectionId"));
      return false;
    }

    const datasource =
      source === 'mysql'
        ? ({ type: 'mysql', sqlalchemy_url: sqlUrl } as const)
        : source === 'excel'
          ? ({ type: 'excel', file_id: excelFileId, sheet_name: sheetName } as const)
          : ({ type: 'saved', connection_id: Number(connectionId) } as const);

    pushMessage({ role: 'user', text: question });
    setLoading(true);

    try {
      const resp = await askData({
        token: auth.token ?? "",
        question,
        datasource,
        options: { language: lang, max_rows: 200 },
      });

      pushMessage({
        role: 'assistant',
        text: resp.answer,
        sql: resp.generated,
        table: resp.table ?? null,
      });
      return true;
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
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Envío por formulario (texto)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    const ok = await sendPrompt(q);
    if (ok) setInput('');
  };

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
          title={t("main.connection.title")}
          show={showConn}
          onToggle={() => setShowConn(s => !s)}
          showText={t("common.show")}
          hideText={t("common.hide")}
          signedText={
            (auth?.token
              ? t("session.signedIn", { role: (auth.role?.toUpperCase() || "USER") })
              : t("session.signedOut"))
          }
          langLabel={t("language")}
          lang={lang}
          onLangChange={(next) => { setLang(next); i18n.changeLanguage(next); }}
          sourceLabel={t("connection.source")}
          sourceAriaLabel={t("connection.sourceAria")}
          mysqlLabel={t("connection.sources.mysql")}
          excelLabel={t("connection.sources.excel")}
          savedLabel={t("connection.sources.admin")}
          source={source}
          onSourceChange={(s) => setSource(s)}
          sqlalchemyLabel={t("main.labels.sqlalchemyUrl")}
          sqlalchemyPlaceholder={t("main.mysql.placeholder")}
          sqlUrl={sqlUrl}
          onSqlUrlChange={setSqlUrl}
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

          {source === 'excel' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px' }}>
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const inputEl = e.currentTarget as HTMLInputElement;
                  const file = inputEl.files?.[0];
                  if (!file) return;
                  setError('');
                  setUploading(true);

                  try {
                    if (!auth.token) {
                      setError(t("errors.unauthorized"));
                      return;
                    }
                    const res = await uploadExcel(file, auth.token);
                    setExcelFileId(res.file_id);
                    setExcelPath(file.name);
                  } catch (err) {
                    setError(t("errors.excelUpload") || "Error al subir el archivo");
                  } finally {
                    setUploading(false);
                    inputEl.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('excel-file-input')?.click()}
                className="btn-secondary"
                disabled={uploading}
              >
                {uploading ? t("common.uploading", "Subiendo…") : t("common.upload", "Subir Excel")}
              </button>
              {excelPath ? <span style={{ opacity: 0.8 }}>{excelPath}</span> : null}
              {excelFileId ? (
                <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7 }}>
                  id: {excelFileId.slice(0, 8)}…
                </span>
              ) : null}
            </div>
          )}
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
                  {m.table ? (
                    m.table.columns?.length && m.table.rows?.length ? (
                      <div style={{ marginTop: 12 }}>
                        <DataTable
                          columns={m.table.columns}
                          rows={m.table.rows as any[][]}
                          defaultPageSize={10}
                          pageSizeOptions={[5, 10, 20, 50, 100]}
                          className="dt-embedded"
                        />
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, opacity: 0.75 }}>
                        {t("common.noData", "Sin datos para mostrar")}
                      </div>
                    )
                  ) : null}
                </details>
              )}
            </div>
          ))}
          {loading && <div className="msg assistant">… {t("main.chat.thinking")}</div>}
        </div>

        <form
          onSubmit={handleSend}
          className="chat-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 0',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("main.chat.placeholder")}
            style={{
              flexGrow: 1,
              height: '40px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '15px',
            }}
          />

          <MicCapture
            onText={(t) => setInput(t)}
            apiBase={import.meta.env.VITE_API_URL as string}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              height: '40px',
              padding: '0 18px',
              border: 'none',
              borderRadius: '10px',
              background: '#5a49d6',
              color: 'white',
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? t("main.chat.sending") : t("main.chat.send")}
          </button>
        </form>


        {error && <div className="error">{error}</div>}
      </div>
    </section >
    </>
  );
}
