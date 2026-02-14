import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { useLiveRefresh } from "../hooks/useLiveRefresh";

function StatCard({ label, value }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

export default function Dashboard() {
  const { user, isAuthed, booting, syncMe } = useAuth();
  const { version, live } = useLiveRefresh(isAuthed);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [adminData, setAdminData] = useState({ businesses: [], pendingWorkers: [] });
  const [ownerData, setOwnerData] = useState({ businesses: [], requests: [], workers: [] });
  const [workerData, setWorkerData] = useState({ profile: null, requests: [], businesses: [] });
  const [saving, setSaving] = useState(false);

  const [ownerForm, setOwnerForm] = useState({ name: "", category: "", location: "" });
  const [workerForm, setWorkerForm] = useState({ skills: "", experience: "", location: "", status: "pending" });

  async function loadDashboard() {
    if (!isAuthed) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [statsData, me] = await Promise.all([api.stats(), api.me()]);
      setStats(statsData);

      if (!user || user.role !== me.role || user.name !== me.name) {
        await syncMe();
      }

      if (me.role === "admin") {
        const [businesses, pendingWorkers] = await Promise.all([api.adminBusinesses(), api.adminPendingWorkers()]);
        setAdminData({ businesses, pendingWorkers });
      }

      if (me.role === "owner") {
        const [businesses, requests, workers] = await Promise.all([
          api.ownerBusinesses(),
          api.ownerRequests(),
          api.ownerWorkers(),
        ]);
        setOwnerData({ businesses, requests, workers });
      }

      if (me.role === "worker") {
        const [requests, businesses] = await Promise.all([api.workerRequests(), api.getBusinesses()]);
        setWorkerData({ profile: me.worker, requests, businesses });
        setWorkerForm({
          skills: me.worker?.skills || "",
          experience: me.worker?.experience || "",
          location: me.worker?.location || "",
          status: me.worker?.status || "pending",
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, user?.role, version]);

  const statusClass = useMemo(() => (live ? "badge-live is-on" : "badge-live"), [live]);

  async function runAction(fn) {
    setSaving(true);
    setError("");
    try {
      await fn();
      await loadDashboard();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (booting || loading) {
    return <div className="panel">Loading dashboard...</div>;
  }

  if (!isAuthed) {
    return (
      <section className="panel">
        <h2>Sign in to open your control center.</h2>
        <p>Each role gets dedicated workflows and live updates.</p>
        <div className="cluster">
          <Link className="btn btn-primary" to="/login">
            Login
          </Link>
          <Link className="btn btn-ghost" to="/register">
            Register
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="dash-space">
      <header className="dash-head">
        <div>
          <p className="eyebrow">Operations Console</p>
          <h1>{user?.role?.toUpperCase()} Dashboard</h1>
        </div>
        <span className={statusClass}>{live ? "Live" : "Offline"}</span>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="metrics-grid">
        <StatCard label="Businesses" value={stats?.businesses ?? 0} />
        <StatCard label="Ready Workers" value={stats?.ready_workers ?? 0} />
        <StatCard label="Pending Requests" value={stats?.pending_requests ?? 0} />
      </div>

      {user?.role === "admin" && (
        <div className="dash-grid">
          <section className="panel">
            <h3>Pending Worker Approvals</h3>
            {adminData.pendingWorkers.length === 0 && <p>No pending workers.</p>}
            {adminData.pendingWorkers.map((w) => (
              <article className="list-item" key={w.id}>
                <div>
                  <strong>{w.name}</strong>
                  <p>{w.email}</p>
                  <small>{w.skills || "No skills yet"}</small>
                </div>
                <div className="cluster">
                  <button disabled={saving} className="btn btn-primary" onClick={() => runAction(() => api.adminWorkerDecision(w.id, true))}>
                    Approve
                  </button>
                  <button disabled={saving} className="btn btn-ghost" onClick={() => runAction(() => api.adminWorkerDecision(w.id, false))}>
                    Keep Pending
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>All Businesses</h3>
            {adminData.businesses.length === 0 && <p>No businesses yet.</p>}
            {adminData.businesses.map((b) => (
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

      {user?.role === "owner" && (
        <div className="dash-grid">
          <section className="panel">
            <h3>Create Business</h3>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.ownerCreateBusiness(ownerForm);
                  setOwnerForm({ name: "", category: "", location: "" });
                });
              }}
            >
              <input placeholder="Business name" value={ownerForm.name} onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })} required />
              <input placeholder="Category" value={ownerForm.category} onChange={(e) => setOwnerForm({ ...ownerForm, category: e.target.value })} />
              <input placeholder="Location" value={ownerForm.location} onChange={(e) => setOwnerForm({ ...ownerForm, location: e.target.value })} />
              <button disabled={saving} className="btn btn-primary">
                Add Business
              </button>
            </form>
          </section>

          <section className="panel">
            <h3>Incoming Requests</h3>
            {ownerData.requests.length === 0 && <p>No pending requests.</p>}
            {ownerData.requests.map((r) => (
              <article key={r.request_id} className="list-item">
                <div>
                  <strong>{r.worker_name}</strong>
                  <p>{r.business_name}</p>
                  <small>{r.skills || "No skills listed"}</small>
                </div>
                <div className="cluster">
                  <button disabled={saving} className="btn btn-primary" onClick={() => runAction(() => api.ownerDecision(r.request_id, true))}>
                    Approve
                  </button>
                  <button disabled={saving} className="btn btn-ghost" onClick={() => runAction(() => api.ownerDecision(r.request_id, false))}>
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>Your Workers</h3>
            {ownerData.workers.length === 0 && <p>No approved workers yet.</p>}
            {ownerData.workers.map((w) => (
              <article key={`${w.worker_id}-${w.business_name}`} className="list-item">
                <div>
                  <strong>{w.name}</strong>
                  <p>{w.business_name}</p>
                  <small>{w.email}</small>
                </div>
                <div className="cluster">
                  <button disabled={saving} className="btn btn-ghost" onClick={() => runAction(() => api.ownerWorkerStatus(w.worker_id, "ready"))}>
                    Ready
                  </button>
                  <button disabled={saving} className="btn btn-primary" onClick={() => runAction(() => api.ownerWorkerStatus(w.worker_id, "busy"))}>
                    Busy
                  </button>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}

      {user?.role === "worker" && (
        <div className="dash-grid">
          <section className="panel">
            <h3>Profile & Availability</h3>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                runAction(() => api.workerUpdateProfile(workerForm));
              }}
            >
              <input placeholder="Skills (comma separated)" value={workerForm.skills} onChange={(e) => setWorkerForm({ ...workerForm, skills: e.target.value })} />
              <input placeholder="Experience" value={workerForm.experience} onChange={(e) => setWorkerForm({ ...workerForm, experience: e.target.value })} />
              <input placeholder="Location" value={workerForm.location} onChange={(e) => setWorkerForm({ ...workerForm, location: e.target.value })} />
              <select value={workerForm.status} onChange={(e) => setWorkerForm({ ...workerForm, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="ready">Ready</option>
                <option value="busy">Busy</option>
              </select>
              <button disabled={saving} className="btn btn-primary">
                Save Profile
              </button>
            </form>
          </section>

          <section className="panel">
            <h3>Join Businesses</h3>
            {workerData.businesses.map((b) => (
              <article key={b.id} className="list-item">
                <div>
                  <strong>{b.name}</strong>
                  <p>{b.location || "-"}</p>
                </div>
                <button disabled={saving} className="btn btn-ghost" onClick={() => runAction(() => api.workerJoinBusiness(b.id))}>
                  Request Join
                </button>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>Your Join Requests</h3>
            {workerData.requests.length === 0 && <p>No requests yet.</p>}
            {workerData.requests.map((r) => (
              <article className="list-item" key={r.id}>
                <div>
                  <strong>{r.business_name}</strong>
                  <p>{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className="chip">{r.status}</span>
              </article>
            ))}
          </section>
        </div>
      )}
    </section>
  );
}
