import { useEffect, useState } from "react";
import { api } from "../api";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
import WorkspaceLayout from "../components/WorkspaceLayout";

export default function OwnerPortal() {
  const { version, live } = useLiveRefresh(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ businesses: 0, ready_workers: 0, pending_requests: 0 });
  const [businesses, setBusinesses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({ name: "", category: "", location: "" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, biz, req, wrk] = await Promise.all([api.stats(), api.ownerBusinesses(), api.ownerRequests(), api.ownerWorkers()]);
      setStats(s);
      setBusinesses(biz);
      setRequests(req);
      setWorkers(wrk);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [version]);

  async function runAction(fn) {
    setSaving(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorkspaceLayout
      roleLabel="Owner Workspace"
      title="Business Operations"
      subtitle="Create businesses, process incoming worker requests, and update worker status."
      left={
        <div className="stack-mini">
          <span className={live ? "badge-live is-on" : "badge-live"}>{live ? "Live" : "Offline"}</span>
          <article className="metric-card">
            <p>Your Businesses</p>
            <h3>{businesses.length}</h3>
          </article>
          <article className="metric-card">
            <p>Ready Workers</p>
            <h3>{stats.ready_workers}</h3>
          </article>
          <article className="metric-card">
            <p>Pending Requests</p>
            <h3>{requests.length}</h3>
          </article>
        </div>
      }
    >
      {loading && <section className="panel">Loading owner workspace...</section>}
      {error && <div className="alert">{error}</div>}

      {!loading && (
        <div className="workspace-grid">
          <section className="panel">
            <h3>Create Business</h3>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.ownerCreateBusiness(form);
                  setForm({ name: "", category: "", location: "" });
                });
              }}
            >
              <input required placeholder="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <button className="btn btn-primary" disabled={saving}>
                Add Business
              </button>
            </form>
          </section>

          <section className="panel">
            <h3>Incoming Worker Requests</h3>
            {requests.length === 0 && <p>No pending requests.</p>}
            {requests.map((r) => (
              <article key={r.request_id} className="list-item">
                <div>
                  <strong>{r.worker_name}</strong>
                  <p>{r.business_name}</p>
                  <small>{r.skills || "No skills listed"}</small>
                </div>
                <div className="cluster">
                  <button className="btn btn-primary" disabled={saving} onClick={() => runAction(() => api.ownerDecision(r.request_id, true))}>
                    Approve
                  </button>
                  <button className="btn btn-ghost" disabled={saving} onClick={() => runAction(() => api.ownerDecision(r.request_id, false))}>
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>Your Workers</h3>
            {workers.length === 0 && <p>No approved workers yet.</p>}
            {workers.map((w) => (
              <article key={`${w.worker_id}-${w.business_name}`} className="list-item">
                <div>
                  <strong>{w.name}</strong>
                  <p>{w.business_name}</p>
                  <small>{w.email}</small>
                </div>
                <div className="cluster">
                  <button className="btn btn-ghost" disabled={saving} onClick={() => runAction(() => api.ownerWorkerStatus(w.worker_id, "ready"))}>
                    Ready
                  </button>
                  <button className="btn btn-primary" disabled={saving} onClick={() => runAction(() => api.ownerWorkerStatus(w.worker_id, "busy"))}>
                    Busy
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </WorkspaceLayout>
  );
}
