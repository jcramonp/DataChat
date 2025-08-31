import { Link, useLocation } from 'react-router-dom';

import './NavBar.css';

export default function NavBar() {
  const { pathname } = useLocation();

  const Tab = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link to={to} className={`nav-pill ${pathname === to ? 'active' : ''}`}>
      {children}
    </Link>
  );

  return (
    <header className="dc-nav">
      <div className="container nav-inner">
        <div className="dc-brand">
          <div className="logo-box" aria-hidden />
          <span className="brand-text">DataChat</span>
        </div>

        <nav className="dc-tabs">
          <Tab to="/">Home</Tab>
          <Tab to="/main">Main</Tab>
        </nav>
      </div>
    </header>
  );
}
