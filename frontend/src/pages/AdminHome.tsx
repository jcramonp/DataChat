import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function AdminHome() {
  const { t } = useTranslation();

  return (
    <section className="container mt-16" style={{ textAlign: "center" }}>
      <h2>{t("admin.title", "Panel de administración")}</h2>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link className="nav-pill" to="/admin/connections">
          {t("admin.buttons.connections", "Conexiones")}
        </Link>

        <Link className="nav-pill" to="/admin/users">
          {t("admin.buttons.users", "Usuarios")}
        </Link>

        <Link className="nav-pill" to="/admin/logs">
          {t("admin.buttons.logs", "Logs")}
        </Link>
      </div>
    </section>
  );
}

