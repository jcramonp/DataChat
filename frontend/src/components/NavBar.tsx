import { Link, useLocation, useNavigate } from 'react-router-dom';
import './NavBar.css';
import Logo from './Logo';
import { getAuth, clearAuth } from '../services/api';

export default function NavBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { token, role } = getAuth();

  const Tab = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link to={to} className={`nav-pill ${pathname === to ? 'active' : ''}`}>
      {children}
    </Link>
  );

  const logout = () => {
    clearAuth();
    nav('/login', { replace: true });
  };

  return (
    <header className="dc-nav">
      <div className="container nav-inner">
        <div className="dc-brand"><Logo size={30} /></div>

        <nav className="dc-tabs">
          <Tab to="/">Home</Tab>
          {/* usuarios comunes ven Main; admin ve Admin */}
          {role === 'admin' ? <Tab to="/admin/users">Admin</Tab> : <Tab to="/main">Main</Tab>}
        </nav>

        <div>
          {token ? (
            <>
              <span className="nav-pill" style={{ marginRight: 8 }}>{(role || '').toUpperCase()}</span>
              <button className="nav-pill" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="nav-pill">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
