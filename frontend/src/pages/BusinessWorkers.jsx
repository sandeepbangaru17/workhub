import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useLiveRefresh } from "../hooks/useLiveRefresh";

export default function BusinessWorkers() {
  const { id } = useParams();
  const { version, live } = useLiveRefresh(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.getBusinessWorkers(id);
        setItems(data);
        setErr("");
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, version]);

  return (
    <section className="dash-space">
      <header className="dash-head">
        <div>
          <p className="eyebrow">Business Talent Board</p>
          <h1>Approved Workers</h1>
        </div>
        <div className="cluster">
          <span className={live ? "badge-live is-on" : "badge-live"}>{live ? "Live" : "Offline"}</span>
          <Link className="btn btn-ghost" to="/businesses">
            Back
          </Link>
        </div>
      </header>

      <section className="panel">
        {loading && <p>Loading workers...</p>}
        {err && <div className="alert">{err}</div>}
        {!loading && !err && (
          <div className="tile-grid">
            {items.map((w) => (
              <article key={w.id} className="tile">
                <div className="tile-top">
                  <h3>{w.name}</h3>
                  <span className="chip">{w.status}</span>
                </div>
                <p>{w.email}</p>
                <small>Experience: {w.experience || "-"}</small>
                <small>Location: {w.location || "-"}</small>
                <small>Skills: {w.skills || "-"}</small>
              </article>
            ))}
            {items.length === 0 && <p>No approved workers yet.</p>}
          </div>
        )}
      </section>
    </section>
  );
}
