import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

import './NavBar.css';

import Logo from './Logo';

export default function NavBar() {
  const { pathname } = useLocation();
  const { auth, logout } = useAuth();

  const Tab = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link to={to} className={`nav-pill ${pathname === to ? 'active' : ''}`}>
      {children}
    </Link>
  );

  return (
    <header className="dc-nav">
      <div className="container nav-inner">
        <div className="dc-brand"><Logo size={30} /></div>
        <nav className="dc-tabs">
          <Link to="/" className={`nav-pill ${pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/main" className={`nav-pill ${pathname === '/main' ? 'active' : ''}`}>Main</Link>
        </nav>
        <div>
          {auth.token ? (
            <>
              <span className="nav-pill" style={{ marginRight: 8 }}>
                {auth.role?.toUpperCase()}
              </span>
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
