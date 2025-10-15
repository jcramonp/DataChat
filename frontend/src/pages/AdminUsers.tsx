import { useState } from "react";
import { registerUser, getAuth } from "../services/api";
import { Link } from "react-router-dom";

export default function AdminUsers() {
  const { role } = getAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [urole, setUrole] = useState<"user" | "admin">("user");
  const [msg, setMsg] = useState("");

  if (role !== "admin") {
    return (
      <section className="container mt-16">
        <h3>Acceso restringido</h3>
        <p>Necesitas ser <b>admin</b> para acceder a esta página.</p>
        <Link className="nav-pill" to="/login">Ir a Login</Link>
      </section>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const r = await registerUser({ email, password, role: urole });
      setMsg(`✅ Usuario creado: ${r.email} (${r.role})`);
      setEmail("");
      setPassword("");
      setUrole("user");
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Error creando usuario"}`);
    }
  };

  return (
    <section
      className="container mt-16"
      style={{ maxWidth: 520 }}
      data-testid="admin-users"   // 👈 ancla estable de la vista
    >
      <h2>Administración de usuarios</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"       // 👈 accesible para getByRole('textbox', { name: /email/i })
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          aria-label="Password"    // 👈 accesible para getByRole('textbox', { name: /password|contraseña/i })
        />
        <select value={urole} onChange={(e) => setUrole(e.target.value as any)} aria-label="Rol">
          <option value="user">Usuario</option>
          <option value="admin">Administrador</option>
        </select>

        <button type="submit">Crear usuario</button>

        {msg && (
          <div
            style={{
              color: msg.startsWith("✅") ? "#16a34a" : "#b00020",
              marginTop: 10,
            }}
            {...(msg.startsWith("✅") ? { "data-testid": "toast-success" } : {})} // 👈 verificación de éxito en E2E
          >
            {msg}
          </div>
        )}
      </form>
    </section>
  );
}
