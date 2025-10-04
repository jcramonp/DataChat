import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, setAuth } from "../services/api"; // <- de tu services/api.js

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@datac.chat");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const res = await login({ email, password }); // {access_token, role}
      setAuth({ token: res.access_token, role: res.role });
      nav("/main");
    } catch (e: any) {
      setErr(e?.message || "No se pudo iniciar sesión");
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 40 }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" type="password" />
        <button type="submit">Entrar</button>
        {err && <div style={{ color: "#b00020" }}>{err}</div>}
      </form>
    </div>
  );
}
