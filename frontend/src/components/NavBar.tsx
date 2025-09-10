import { Link, useLocation } from 'react-router-dom';

import './NavBar.css';

import Logo from './Logo';

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
          <Logo size={30} />
        </div>

        <nav className="dc-tabs">
          <Tab to="/">Home</Tab>
          <Tab to="/main">Main</Tab>
        </nav>
      </div>
    </header>
  );
}
