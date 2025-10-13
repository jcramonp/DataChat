import React, { useEffect, useState } from "react";
import { fetchHistory, clearHistory } from "../services/history";
import type { HistoryItem } from "../services/history";

type Props = {
  apiBase: string;
  token: string;
};

const History: React.FC<Props> = ({ apiBase, token }) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

    const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHistory(apiBase, token);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  };

  const onClear = async () => {
    try {
      setLoading(true);
      setError(null);
      await clearHistory(apiBase, token);
      setItems([]);
    } catch (e: any) {
      setError(e?.message || 'Error limpiando historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);


  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Query History</h1>
        <button
          onClick={onClear}
          className="px-3 py-2 rounded bg-red-600 text-white hover:opacity-90"
        >
          Limpiar historial
        </button>
      </div>

      {loading && <div>Cargando…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && items.length === 0 && <div>No hay consultas aún.</div>}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="border rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm text-gray-500">
                  {new Date(it.created_at).toLocaleString()}
                </div>
                <div className="font-medium">{it.question}</div>
              </div>
              <div className="text-sm">
                <span className="px-2 py-1 rounded bg-gray-100 mr-2">
                  {it.generated?.type ? it.generated.type.toUpperCase() : "CHAT"}
                </span>
                <span className="text-gray-600">{it.row_count} filas</span>
              </div>
            </div>

            <div className="mt-3">
              <button
                className="text-blue-700 underline"
                onClick={() => setExpanded((prev) => (prev === it.id ? null : it.id))}
              >
                {expanded === it.id ? "Ocultar respuesta" : "Ver respuesta"}
              </button>
              {expanded === it.id && (
                <pre className="mt-2 text-sm overflow-auto bg-gray-50 p-3 rounded whitespace-pre-wrap">
{(it.answer_text && it.answer_text.trim()) 
  ? it.answer_text 
  : (it.generated?.code ? `Respuesta no guardada en este item.\n[Legacy] Código generado:\n${it.generated.code}` : "Sin contenido")}
                </pre>
              )}
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-gray-700">Datasource</summary>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
{JSON.stringify(it.datasource, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
