import { useEffect, useState } from "react";
import { listAdminLogs, clearAdminLogs } from "../services/api";
import DataTable from "../components/DataTable";
import { useToast } from "../ui/Toast";
import { useTranslation } from "react-i18next";

export default function AdminLogs() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const { t } = useTranslation();

  async function load() {
    setLoading(true);
    try {
      const res = await listAdminLogs({ limit: 200, offset: 0, level, action, q });
      setItems(res.items);
      setTotal(res.total);
    } catch (e:any) {
      toast.error(e?.message || "No se pudieron cargar los logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const columns = ["ts", "level", "actor", "action", "path", "meta"];
  const rows = items.map(it => ([
    it.ts,
    it.level,
    it.actor || "—",
    it.action,
    it.path || "—",
    JSON.stringify(it.meta)
  ]));

  return (
    <section className="container">
      <h2>Activity logs</h2>

      <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12}}>
        <select value={level} onChange={e => setLevel(e.target.value)}>
          <option value="">level: any</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </select>
        <input placeholder="action…" value={action} onChange={e => setAction(e.target.value)}/>
        <input placeholder="search…" value={q} onChange={e => setQ(e.target.value)}/>
        <button type="button" className="btn-primary" onClick={load} disabled={loading}>
          {t("common.search")}
        </button>

        <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              if (!confirm("¿Borrar todos los logs?")) return;
              try {
                const r = await clearAdminLogs();
                toast.success(`Eliminados: ${r.deleted}`);
                load();
              } catch (e: any) {
                toast.error(e?.message || "No se pudo limpiar");
              }
            }}
            style={{marginLeft: "auto"}}
        >
          {t("common.clear")}
        </button>

      </div>

      <div style={{opacity: loading ? 0.6 : 1}}>
        <DataTable columns={columns} rows={rows} defaultPageSize={10}/>
      </div>
      <div style={{marginTop: 8, opacity: 0.7}}>{total} registros</div>
    </section>
  );
}
