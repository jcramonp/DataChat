import { Link } from 'react-router-dom';

import './Landing.css';

export default function Landing() {
  return (
    <main className="landing-wrap">
      <section className="hero-card">
        <div className="hero-logo">
          <div className="hero-logo-icon" aria-hidden />
          <h1>DataChat</h1>
        </div>
        <h2 className="hero-title">Query your data. No SQL. No formulas</h2>
        <p className="hero-sub">
          Convert Spanish questions to database queries instantly. Get clear
          answers without technical knowledge.
        </p>
        <Link to="/main" className="cta-btn">
          Start Now
        </Link>
      </section>
    </main>
  );
}
