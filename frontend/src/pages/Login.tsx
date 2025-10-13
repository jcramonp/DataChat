import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setAuth } from "../services/api";
import { useTranslation } from "react-i18next";

export default function Login() {
  const nav = useNavigate();
  const { t } = useTranslation(); // +++
  const [email, setEmail] = useState("admin@datac.chat");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const { access_token, role } = await login({ email, password });
      setAuth({ token: access_token, role });
      if (role === "admin") nav("/admin", { replace: true });
      else nav("/main", { replace: true });
    } catch (e: any) {
      setErr(t("login.errorGeneric")); // +++
    }
  };

  return (
    <section className="container mt-32" style={{ maxWidth: 420 }}>
      <h2>{t("login.title")}</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.email")} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t("login.password")} />
        <button type="submit">{t("login.submit")}</button>
        {err && <div style={{ color: "#b00020" }}>{err}</div>}
      </form>
    </section>
  );
}
