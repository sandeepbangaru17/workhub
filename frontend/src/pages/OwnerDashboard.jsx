import { useEffect, useState } from "react";
import api from "../api/client";

export default function OwnerDashboard() {
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [err, setErr] = useState("");

  const loadBusinesses = async () => {
    const r = await api.get("/api/businesses");
    setBusinesses(r.data);
    if (r.data[0]) setSelected(r.data[0].id);
  };

  const loadWorkers = async (bizId) => {
    const r = await api.get(`/api/businesses/${bizId}/workers`);
    setWorkers(r.data);
  };

  useEffect(() => {
    loadBusinesses().catch(() => setErr("Failed to load businesses"));
  }, []);

  useEffect(() => {
    if (selected) loadWorkers(selected).catch(() => {});
  }, [selected]);

  const approve = async (workerId) => {
    await api.post(`/api/workers/${workerId}/approve`);
    await loadWorkers(selected);
  };

  const setStatus = async (workerId, status) => {
    await api.patch(`/api/workers/${workerId}/status`, { status });
    await loadWorkers(selected);
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto" }}>
      <h2>Owner Dashboard</h2>
      {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

      <div style={{ marginBottom: 12 }}>
        <label>Business: </label>
        <select value={selected || ""} onChange={(e) => setSelected(Number(e.target.value))}>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.city})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {workers.map((w) => (
          <div key={w.id} style={{ padding: 12, border: "1px solid #eee" }}>
            <b>{w.worker_name}</b> — {w.worker_phone}
            <div>Status: <b>{w.status}</b></div>

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {w.status === "pending" ? <button onClick={() => approve(w.id)}>Approve</button> : null}
              <button onClick={() => setStatus(w.id, "ready")}>Set Ready</button>
              <button onClick={() => setStatus(w.id, "busy")}>Set Busy</button>
              <button onClick={() => setStatus(w.id, "pending")}>Set Pending</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
