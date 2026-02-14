import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useLiveRefresh } from "../hooks/useLiveRefresh";

export default function Businesses() {
  const { version, live } = useLiveRefresh(true);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [businesses, latestStats] = await Promise.all([api.getBusinesses(), api.stats()]);
        setItems(businesses);
        setStats(latestStats);
        setErr("");
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [version]);

  return (
    <section className="dash-space">
      <header className="dash-head">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h1>Businesses Hiring Right Now</h1>
        </div>
        <span className={live ? "badge-live is-on" : "badge-live"}>{live ? "Live" : "Offline"}</span>
      </header>

      {stats && (
        <div className="metrics-grid">
          <article className="metric-card">
            <p>Businesses</p>
            <h3>{stats.businesses}</h3>
          </article>
          <article className="metric-card">
            <p>Ready Workers</p>
            <h3>{stats.ready_workers}</h3>
          </article>
          <article className="metric-card">
            <p>Pending Requests</p>
            <h3>{stats.pending_requests}</h3>
          </article>
        </div>
      )}

      <section className="panel">
        {loading && <p>Loading marketplace...</p>}
        {err && <div className="alert">{err}</div>}
        {!loading && !err && (
          <div className="tile-grid">
            {items.map((b) => (
              <Link key={b.id} to={`/businesses/${b.id}`} className="tile">
                <div className="tile-top">
                  <h3>{b.name}</h3>
                  <span className="chip">{b.category || "General"}</span>
                </div>
                <p>{b.location || "Location TBD"}</p>
                <small>Explore approved workers</small>
              </Link>
            ))}
            {items.length === 0 && <p>No businesses available yet.</p>}
          </div>
        )}
      </section>
    </section>
  );
}
