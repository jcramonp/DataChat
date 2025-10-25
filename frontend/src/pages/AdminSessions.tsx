import { useEffect, useState } from "react";
import { getAuth, listAdminSessions, revokeAdminSession } from "../services/api";

// 1. Ajustamos la forma de Session a lo que devuelve el backend actualizado
type Session = {
  jti: string;
  sub: string;
  role: string;
  issued_at: number | null;   // antes iat
  expires_at: number | null;  // antes exp
  last_seen: number | null;   // antes last_use
  revoked: boolean;
};

// 2. helper para formatear timestamps UNIX (segundos) a texto lindo
function formatTs(ts?: number | null) {
  if (ts === null || ts === undefined) return "—";
  // si viene 0 o algo raro, también lo tratamos como vacío
  if (!ts) return "—";

  const d = new Date(ts * 1000); // backend manda segundos, Date usa ms
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminSessions() {
  const { token } = getAuth();
  const [items, setItems] = useState<Session[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Carga sesiones desde el backend
  const load = async () => {
    if (!token) {
      setErr("No token");
      setItems([]);
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const { items } = await listAdminSessions(token);
      // forzamos siempre array
      setItems(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Revocar una sesión seleccionada
  const handleRevoke = async (jti: string) => {
    if (!token) return;
    try {
      await revokeAdminSession(token, jti);
      await load(); // recargar tabla después de revocar
    } catch (e: any) {
      alert(e?.message || "No se pudo revocar");
    }
  };

  // efecto inicial + refresco periódico (cada 8s)
  useEffect(() => {
    let alive = true;

    const firstLoad = async () => {
      await load();
    };
    firstLoad();

    const id = setInterval(() => {
      if (alive) load();
    }, 8000);

    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <section className="container mt-16">
      <h2>Sesiones activas</h2>

      {err && (
        <div style={{ color: "#b00020", marginTop: 8, marginBottom: 8 }}>
          {err}
        </div>
      )}
      {loading && (
        <div style={{ marginTop: 8, marginBottom: 8, color: "#6b7280" }}>
          Cargando…
        </div>
      )}

      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {[
                "JTI",
                "Usuario",
                "Rol",
                "Emitido",
                "Expira",
                "Último uso",
                "Revocada",
                "",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    textAlign: "left",
                    padding: 8,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 12,
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  No hay sesiones.
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.jti}>
                  <td style={{ padding: 8 }}>
                    {s.jti ? s.jti.slice(0, 10) + "…" : "—"}
                  </td>

                  <td style={{ padding: 8 }}>{s.sub || "—"}</td>

                  <td style={{ padding: 8 }}>{s.role || "—"}</td>

                  {/* Emitido */}
                  <td style={{ padding: 8 }}>
                    {formatTs(s.issued_at)}
                  </td>

                  {/* Expira */}
                  <td style={{ padding: 8 }}>
                    {formatTs(s.expires_at)}
                  </td>

                  {/* Último uso */}
                  <td style={{ padding: 8 }}>
                    {formatTs(s.last_seen)}
                  </td>

                  <td style={{ padding: 8 }}>{s.revoked ? "Sí" : "No"}</td>

                  <td style={{ padding: 8 }}>
                    {!s.revoked && (
                      <button
                        onClick={() => handleRevoke(s.jti)}
                        className="nav-pill"
                        style={{
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "4px 8px",
                        }}
                      >
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
