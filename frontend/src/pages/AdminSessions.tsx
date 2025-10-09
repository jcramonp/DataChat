import { useEffect, useState } from "react";
import { getAuth } from "../services/api";

type Session = {
  jti: string;
  sub: string;
  role: string;
  issued_at: number;
  expires_at: number;
  last_seen: number;
  revoked: boolean;
};

export default function AdminSessions() {
  const { token } = getAuth();
  const [items, setItems] = useState<Session[]>([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/admin/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setItems(await res.json());
    } catch (e: any) {
      setErr(e.message || "No se pudo cargar");
    }
  };

  const revoke = async (jti: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/admin/sessions/${jti}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await load();
    } catch (e: any) {
      alert(e.message || "No se pudo revocar");
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 8000); // refresco suave
    return () => clearInterval(id);
  }, []);

  return (
    <section className="container mt-16">
      <h2>Sesiones activas</h2>
      {err && <div style={{ color: "#b00020" }}>{err}</div>}
      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["JTI", "Usuario", "Rol", "Emitido", "Expira", "Último uso", "Revocada", ""].map(h => (
                <th key={h} style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", padding: 8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(s => (
              <tr key={s.jti}>
                <td style={{ padding: 8 }}>{s.jti.slice(0, 10)}…</td>
                <td style={{ padding: 8 }}>{s.sub}</td>
                <td style={{ padding: 8 }}>{s.role}</td>
                <td style={{ padding: 8 }}>{new Date(s.issued_at * 1000).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{new Date(s.expires_at * 1000).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{new Date(s.last_seen * 1000).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{s.revoked ? "Sí" : "No"}</td>
                <td style={{ padding: 8 }}>
                  {!s.revoked && (
                    <button onClick={() => revoke(s.jti)} className="nav-pill">Revocar</button>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={8} style={{ padding: 12, color: "#6b7280" }}>No hay sesiones.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
