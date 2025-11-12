import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

/** Decode minimal JWT to infer role if backend doesn't send it */
function roleFromToken(token?: string | null): "admin" | "user" | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    const raw = payload.role || payload.rol || payload.perfil;
    const r = typeof raw === "string" ? raw.toLowerCase() : "";
    return r === "admin" || r === "user" ? (r as "admin" | "user") : null;
  } catch {
    return null;
  }
}

export default function Login() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const { setAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { access_token, role } = await login({ email, password });

      const inferred =
        (role && String(role).toLowerCase()) ||
        roleFromToken(access_token) ||
        "user";

      setAuth({ token: access_token, role: inferred as "admin" | "user" });

      if (inferred === "admin") nav("/admin", { replace: true });
      else nav("/main", { replace: true });
    } catch {
      setErr(t("login.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container" style={{ maxWidth: 420, marginTop: 64 }}>
      <h2 style={{ marginBottom: 12 }}>{t("login.title")}</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("login.email")}
          autoComplete="username"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder={t("login.password")}
          autoComplete="current-password"
        />
      </form>
      <button
        type="button"
        onClick={onSubmit}
        className="btn-primary"
        disabled={loading}
        style={{ marginTop: 10, width: "100%" }}
      >
        {loading ? t("login.loading") || "…" : t("login.submit")}
      </button>
      {err && <div style={{ color: "#b00020", marginTop: 8 }}>{err}</div>}
    </section>
  );
}
