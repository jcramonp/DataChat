import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setAuth } from "../services/api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@datac.chat");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const { access_token, role } = await login({ email, password });
      setAuth({ token: access_token, role });
      // 🔁 redirección por rol
      if (role === "admin") nav("/admin", { replace: true });
      else nav("/main", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Error de login");
    }
  };

  return (
    <section className="container mt-32" style={{ maxWidth: 420 }}>
      <h2>Login</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" />
        <button type="submit">Entrar</button>
        {err && <div style={{ color: "#b00020" }}>{err}</div>}
      </form>
    </section>
  );
}
