import { useEffect, useState } from "react";
import { api } from "../api";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
import WorkspaceLayout from "../components/WorkspaceLayout";

export default function WorkerPortal() {
  const { version, live } = useLiveRefresh(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [profile, setProfile] = useState({ skills: "", experience: "", location: "", status: "pending" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [me, req, biz] = await Promise.all([api.me(), api.workerRequests(), api.getBusinesses()]);
      setProfile({
        skills: me.worker?.skills || "",
        experience: me.worker?.experience || "",
        location: me.worker?.location || "",
        status: me.worker?.status || "pending",
      });
      setRequests(req);
      setBusinesses(biz);
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
      roleLabel="Worker Workspace"
      title="Career Console"
      subtitle="Maintain your profile, set availability, and request to join businesses."
      left={
        <div className="stack-mini">
          <span className={live ? "badge-live is-on" : "badge-live"}>{live ? "Live" : "Offline"}</span>
          <article className="metric-card">
            <p>Join Requests</p>
            <h3>{requests.length}</h3>
          </article>
          <article className="metric-card">
            <p>Availability</p>
            <h3>{profile.status}</h3>
          </article>
        </div>
      }
    >
      {loading && <section className="panel">Loading worker workspace...</section>}
      {error && <div className="alert">{error}</div>}

      {!loading && (
        <div className="workspace-grid">
          <section className="panel">
            <h3>Worker Profile</h3>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                runAction(() => api.workerUpdateProfile(profile));
              }}
            >
              <input placeholder="Skills" value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} />
              <input placeholder="Experience" value={profile.experience} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} />
              <input placeholder="Location" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
              <select value={profile.status} onChange={(e) => setProfile({ ...profile, status: e.target.value })}>
                <option value="pending">Pending</option>
                <option value="ready">Ready</option>
                <option value="busy">Busy</option>
              </select>
              <button className="btn btn-primary" disabled={saving}>
                Save Profile
              </button>
            </form>
          </section>

          <section className="panel">
            <h3>Businesses Open to Join</h3>
            {businesses.map((b) => (
              <article key={b.id} className="list-item">
                <div>
                  <strong>{b.name}</strong>
                  <p>{b.location || "-"}</p>
                </div>
                <button className="btn btn-ghost" disabled={saving} onClick={() => runAction(() => api.workerJoinBusiness(b.id))}>
                  Request Join
                </button>
              </article>
            ))}
          </section>

          <section className="panel">
            <h3>Your Request Timeline</h3>
            {requests.length === 0 && <p>No requests yet.</p>}
            {requests.map((r) => (
              <article key={r.id} className="list-item">
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
    </WorkspaceLayout>
  );
}
