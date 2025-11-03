import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/authcontext";

/** Decode minimal JWT to infer role if backend doesn't send it */
function roleFromToken(token?: string | null): "admin" | "user" | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
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
  const { setAuth } = useAuth();               // ✅ usamos el contexto

  const [email, setEmail] = useState("admin@datac.chat"); // valores demo
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      // tu servicio ya llama al endpoint de login
      const { access_token, role } = await login({ email, password });

      // normalizamos/derivamos el rol
      const inferred =
        (role && String(role).toLowerCase()) ||
        roleFromToken(access_token) ||
        "user";

      // ✅ guardamos en el AuthContext (esto también sincroniza localStorage)
      setAuth({ token: access_token, role: inferred as "admin" | "user" });

      // redirección según rol
      if (inferred === "admin") nav("/admin", { replace: true });
      else nav("/main", { replace: true });
    } catch (e: any) {
      setErr(t("login.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container mt-32" style={{ maxWidth: 420 }}>
      <h2>{t("login.title")}</h2>
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
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t("login.loading") || "…" : t("login.submit")}
        </button>
        {err && <div style={{ color: "#b00020" }}>{err}</div>}
      </form>
    </section>
  );
}
