import { useEffect, useState } from "react";
import { api } from "../api";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
import WorkspaceLayout from "../components/WorkspaceLayout";

export default function AdminPortal() {
  const { version, live } = useLiveRefresh(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ businesses: 0, ready_workers: 0, pending_requests: 0 });
  const [businesses, setBusinesses] = useState([]);
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, biz, pending] = await Promise.all([api.stats(), api.adminBusinesses(), api.adminPendingWorkers()]);
      setStats(s);
      setBusinesses(biz);
      setPendingWorkers(pending);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [version]);

  async function decide(workerId, approve) {
    setSaving(true);
    try {
      await api.adminWorkerDecision(workerId, approve);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceLayout
      roleLabel="Admin Control"
      title="Platform Governance"
      subtitle="Approve worker onboarding and monitor business network health in real time."
      left={
        <div className="stack-mini">
          <span className={live ? "badge-live is-on" : "badge-live"}>{live ? "Live" : "Offline"}</span>
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
      }
    >
      {loading && <section className="panel">Loading admin portal...</section>}
      {error && <div className="alert">{error}</div>}

      {!loading && (
        <div className="workspace-grid">
          <section className="panel">
            <h3>Pending Worker Approvals</h3>
            {pendingWorkers.length === 0 && <p>No pending workers.</p>}
            {pendingWorkers.map((w) => (
              <article key={w.id} className="list-item">
                <div>
                  <strong>{w.name}</strong>
                  <p>{w.email}</p>
                  <small>{w.skills || "No skills listed"}</small>
                </div>
                <div className="cluster">
                  <button className="btn btn-primary" disabled={saving} onClick={() => decide(w.id, true)}>
                    Approve
                  </button>
                  <button className="btn btn-ghost" disabled={saving} onClick={() => decide(w.id, false)}>
                    Keep Pending
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>Businesses</h3>
            {businesses.length === 0 && <p>No businesses yet.</p>}
            {businesses.map((b) => (
              <article key={b.id} className="list-item">
                <div>
                  <strong>{b.name}</strong>
                  <p>{b.location || "-"}</p>
                </div>
                <span className="chip">{b.owner_name}</span>
              </article>
            ))}
          </section>
        </div>
      )}
    </WorkspaceLayout>
  );
}
