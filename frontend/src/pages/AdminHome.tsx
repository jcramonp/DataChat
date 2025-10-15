import { Link } from 'react-router-dom';

export default function AdminHome() {
  return (
    <section className="container mt-16" style={{ textAlign: 'center' }} data-testid="admin">
      <h2>Panel de administración</h2>
      <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link className="nav-pill" to="/admin/connections">Conexiones</Link>
        <Link className="nav-pill" to="/admin/users">Usuarios</Link>
      </div>
    </section>
  );
}
