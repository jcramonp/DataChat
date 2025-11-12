import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Stat = { label: string; value: string | number; hint?: string };

export default function AdminHome() {
  const { t } = useTranslation();
  const nav = useNavigate();

  // Dummy stats (conecta aquí tu data real si quieres)
  const stats: Stat[] = [
    { label: t("admin.stats.connections", "Conexiones"), value: 5, hint: t("admin.stats.active", "Activas") },
    { label: t("admin.stats.users", "Usuarios"), value: 42, hint: t("admin.stats.new_today", "Nuevos hoy") },
    { label: t("admin.stats.sessions", "Sesiones"), value: 9, hint: t("admin.stats.live", "En vivo") },
    { label: t("admin.stats.eventsToday", "Eventos hoy"), value: 128, hint: t("admin.stats.logs", "Logs") },
  ];

  const quick = [
    { label: t("admin.quick.newConn", "Crear conexión"), onClick: () => nav("/admin/connections") },
    { label: t("admin.quick.inviteUser", "Invitar usuario"), onClick: () => nav("/admin/users") },
    { label: t("admin.quick.revokeTokens", "Revocar tokens"), onClick: () => nav("/admin/sessions") },
  ];

  const cards = [
    {
      title: t("admin.cards.connections", "Conexiones"),
      desc: t("admin.cards.connections_desc", "Gestiona orígenes y credenciales"),
      to: "/admin/connections",
    },
    {
      title: t("admin.cards.users", "Usuarios"),
      desc: t("admin.cards.users_desc", "Altas, bajas y roles"),
      to: "/admin/users",
    },
    {
      title: t("admin.cards.activity", "Actividad"),
      desc: t("admin.cards.activity_desc", "Auditoría y seguridad"),
      to: "/admin/logs",
    },
  ];

  const recent = [
    { time: "12:40", action: "LOGIN", who: "admin@acme.com", meta: "IP 34.232.10.1" },
    { time: "12:31", action: "QUERY", who: "ana@acme.com", meta: "SELECT top 5 customers" },
    { time: "12:15", action: "REVOKE", who: "admin@acme.com", meta: "session JTI …34fa" },
  ];

  return (
    <div className="admin-wrap">
      {/* CSS incrustado para no crear archivo nuevo */}
      <style>{`
        .admin-wrap{ padding:18px 24px 40px; color:#0f172a; }
        .admin-head{ position:sticky; top:12px; z-index:1; background:transparent; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; padding:6px 0 14px; }
        .role-chip{ display:inline-block; padding:5px 10px; border-radius:999px; background:#e9e6fb; color:#4b3fb3; font-weight:800; font-size:12px; }
        .head-title{ margin:6px 0 4px; font-size: clamp(22px, 3.6vw, 32px); font-weight:900; }
        .head-sub{ margin:0; color:#475569; }
        .head-actions{ display:flex; gap:10px; flex-wrap:wrap; }
        .pill-btn{ padding:10px 14px; border-radius:999px; border:1px solid #eef1f6; background:#fff; font-weight:800; box-shadow:0 8px 18px rgba(17,24,39,.06); cursor:pointer; }
        .pill-btn:hover{ filter:brightness(1.03); }
        .grid{ display:grid; gap:16px; margin:10px 0 22px; }
        .stats-grid{ grid-template-columns: repeat(4, minmax(0,1fr)); }
        @media (max-width: 980px){ .stats-grid{ grid-template-columns: 1fr 1fr; } }
        .stat-card{ border:1px solid #eef1f6; border-radius:16px; padding:14px; background:#fff; box-shadow:0 16px 34px rgba(17,24,39,.06); }
        .stat-value{ font-size:28px; font-weight:900; }
        .stat-label{ color:#334155; font-weight:800; }
        .stat-hint{ color:#64748b; font-size:12px; margin-top:2px; }
        .navcards-grid{ grid-template-columns: repeat(3, minmax(0,1fr)); }
        @media (max-width: 980px){ .navcards-grid{ grid-template-columns: 1fr; } }
        .nav-card{ position:relative; display:block; text-decoration:none; color:inherit; border:1px solid #eef1f6; border-radius:18px; padding:16px 16px 18px; background:#fff;
          box-shadow:0 18px 40px rgba(17,24,39,.08);
          background-image:
            radial-gradient(600px 240px at 110% -20%, rgba(163,108,242,.12), transparent 60%),
            radial-gradient(600px 240px at -10% 120%, rgba(108,92,231,.12), transparent 60%); }
        .nav-card h3{ margin:4px 0 6px; font-size:18px; font-weight:900; }
        .nav-card p{ margin:0; color:#475569; }
        .nav-dot{ width:10px; height:10px; border-radius:999px; background:linear-gradient(135deg,#6c5ce7,#a36cf2); box-shadow: 0 0 0 4px rgba(163,108,242,.18); }
        .nav-arrow{ position:absolute; right:12px; bottom:10px; font-weight:900; opacity:.55; }
        .recent{ margin-top:6px; }
        .recent-head{ display:flex; align-items:center; justify-content:space-between; }
        .recent-head h2{ margin:0; font-size:20px; font-weight:900; }
        .view-all{ text-decoration:none; color:#4b3fb3; font-weight:800; }
        .recent-table{ border:1px solid #eef1f6; border-radius:16px; overflow:hidden; background:#fff; box-shadow:0 18px 40px rgba(17,24,39,.06); }
        .r-row{ display:grid; grid-template-columns: 90px 120px 1fr 2fr; gap:8px; padding:10px 12px; border-top:1px solid #f0f3fa; }
        .r-row:first-child{ border-top:none; }
        .r-head{ background:#f9fafc; font-weight:900; color:#334155; }
        .muted{ color:#64748b; }
        .chip{ display:inline-block; padding:4px 8px; border-radius:999px; font-size:12px; font-weight:800; }
        .chip-login{ background:#e3f2fd; color:#1e88e5; }
        .chip-query{ background:#e6fffa; color:#0f766e; }
        .chip-revoke{ background:#fde8e8; color:#b91c1c; }
      `}</style>

      {/* Header */}
      <header className="admin-head">
        <div>
          <span className="role-chip">ADMIN</span>
          <h1 className="head-title">{t("admin.panelTitle", "Panel de administración")}</h1>
          <p className="head-sub">
            {t("admin.panelSubtitle", "Gestiona conexiones, usuarios y seguridad")}
          </p>
        </div>
        <div className="head-actions">
          {quick.map((q) => (
            <button key={q.label} className="pill-btn" onClick={q.onClick}>
              {q.label}
            </button>
          ))}
        </div>
      </header>

      {/* Stats */}
      <section className="grid stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
            {s.hint && <div className="stat-hint">{s.hint}</div>}
          </div>
        ))}
      </section>

      {/* Cards */}
      <section className="grid navcards-grid">
        {cards.map((c) => (
          <Link key={c.title} to={c.to} className="nav-card">
            <div className="nav-dot" />
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <span className="nav-arrow">↗</span>
          </Link>
        ))}
      </section>

      {/* Recent activity */}
      <section className="recent">
        <div className="recent-head">
          <h2>{t("admin.recentActivity", "Actividad reciente")}</h2>
          <Link to="/admin/logs" className="view-all">
            {t("admin.viewAll", "Ver todo")}
          </Link>
        </div>
        <div className="recent-table">
          <div className="r-row r-head">
            <div>{t("admin.th.time", "Hora")}</div>
            <div>{t("admin.th.action", "Acción")}</div>
            <div>{t("admin.th.user", "Usuario")}</div>
            <div>{t("admin.th.meta", "Meta")}</div>
          </div>
          {recent.map((r, i) => (
            <div className="r-row" key={i}>
              <div>{r.time}</div>
              <div>
                <span className={`chip chip-${r.action.toLowerCase()}`}>{r.action}</span>
              </div>
              <div>{r.who}</div>
              <div className="muted">{r.meta}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
