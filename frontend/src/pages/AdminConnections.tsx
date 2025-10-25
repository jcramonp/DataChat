import { useEffect, useState } from "react";
import { createConnection, listConnections, getAuth } from "../services/api";
import { Link } from "react-router-dom";

type DbType = "mysql" | "postgres" | "sqlite";

type Connection = {
  id: number;
  name: string;
  db_type: DbType;
  sqlalchemy_url: string;
  is_active: boolean;
};

export default function AdminConnections() {
  const { role } = getAuth();
  const [name, setName] = useState("");
  const [dbType, setDbType] = useState<DbType>("sqlite");
  const [url, setUrl] = useState("sqlite:///./data_demo.sqlite3");
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);

  // Solo admins
  if (role !== "admin") {
    return (
      <section className="container mt-16">
        <h3>Acceso restringido</h3>
        <p>Necesitas ser <b>admin</b> para acceder a esta página.</p>
        <Link className="nav-pill" to="/login">Ir a Login</Link>
      </section>
    );
  }

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await listConnections();
      setItems(data);
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "No se pudo listar conexiones"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await createConnection({ name, db_type: dbType, sqlalchemy_url: url });
      setMsg(`✅ Conexión creada: ${r.name} (#${r.id})`);
      setName("");
      setUrl(dbType === "sqlite" ? "sqlite:///./data_demo.sqlite3" : "");
      await refresh();
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Error creando conexión"}`);
    }
  };

  return (
    <section className="container mt-16" style={{ maxWidth: 720 }}>
      <h2>Conexiones (ADMIN)</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="sqlite_demo" />
        </label>

        <label>
          Tipo de base de datos
          <select
            value={dbType}
            onChange={(e) => {
              const val = e.target.value as DbType;
              setDbType(val);
              if (val === "sqlite") setUrl("sqlite:///./data_demo.sqlite3");
              if (val === "mysql") setUrl("mysql+pymysql://user:pass@host:3306/db?charset=utf8mb4");
              if (val === "postgres") setUrl("postgresql+psycopg2://user:pass@host:5432/db");
            }}
          >
            <option value="sqlite">SQLite</option>
            <option value="mysql">MySQL</option>
            <option value="postgres">PostgreSQL</option>
          </select>
        </label>

        <label>
          SQLAlchemy URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="sqlite:///./archivo.sqlite3"
          />
        </label>

        <small style={{ color: "#6b7280" }}>
          Ejemplos: <br />
          • SQLite: <code>sqlite:///./data_demo.sqlite3</code><br />
          • MySQL: <code>mysql+pymysql://app:app@localhost:3306/empresa_demo?charset=utf8mb4</code><br />
          • PostgreSQL: <code>postgresql+psycopg2://user:pass@localhost:5432/mi_db</code>
        </small>

        <button type="submit" className="btn-primary">Guardar y validar</button>

        {msg && (
          <div style={{ color: msg.startsWith("✅") ? "#16a34a" : "#b00020" }}>{msg}</div>
        )}
      </form>

      <hr style={{ margin: "24px 0" }} />

      <h3>Conexiones registradas</h3>
      {loading ? (
        <div>Cargando…</div>
      ) : items.length === 0 ? (
        <div>No hay conexiones.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>ID</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Tipo</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>URL</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Activa</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: 8 }}>{c.id}</td>
                  <td style={{ padding: 8 }}>{c.name}</td>
                  <td style={{ padding: 8 }}>{c.db_type.toUpperCase()}</td>
                  <td style={{ padding: 8, fontFamily: "monospace" }}>{c.sqlalchemy_url}</td>
                  <td style={{ padding: 8 }}>{c.is_active ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Link className="nav-pill" to="/admin">Volver a Admin</Link>
      </div>
    </section>
  );
}
