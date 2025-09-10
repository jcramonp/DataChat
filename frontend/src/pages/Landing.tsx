import { Link } from 'react-router-dom';

import Logo from '../components/Logo';
// Reutilizamos los estilos de la navbar para el brand-pill
import '../components/NavBar.css';

import './Landing.css';

export default function Landing() {
  return (
    <>
      <main className="landing-wrap">
        <section className="hero-card">
          {/* Logo grande en el héroe */}
          <div
            className="hero-logo"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
          >
            <Logo size={48} />
          </div>

          <h3 className="hero-title">Query your data. No SQL. No formulas</h3>
          <p className="hero-sub">
            Convert Spanish and English questions to database queries instantly. Get clear answers
            without technical knowledge.
          </p>
          <Link to="/main" className="cta-btn">
            Start Now
          </Link>
        </section>
      </main>
    </>
  );
}
