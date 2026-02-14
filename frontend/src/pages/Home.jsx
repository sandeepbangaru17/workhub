import { Link } from "react-router-dom";

export default function Home() {
  return (
    <section className="hero-shell">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">WorkHub Prime</p>
          <h1>Build and hire with live talent intelligence.</h1>
          <p>
            Real-time workforce visibility for businesses, owners, and workers.
            Approvals, availability, and onboarding flow through one premium control room.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/dashboard">
              Open Dashboard
            </Link>
            <Link className="btn btn-ghost" to="/businesses">
              Browse Marketplace
            </Link>
          </div>
        </div>

        <div className="hero-cards">
          <article className="glass-card floating delay-1">
            <h3>Owner Command Center</h3>
            <p>Approve requests, manage worker readiness, and run multiple businesses.</p>
          </article>
          <article className="glass-card floating delay-2">
            <h3>Live Worker Feed</h3>
            <p>Availability updates stream in instantly with no manual refresh.</p>
          </article>
          <article className="glass-card floating delay-3">
            <h3>Admin Oversight</h3>
            <p>Global moderation tools for quality control and platform trust.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
