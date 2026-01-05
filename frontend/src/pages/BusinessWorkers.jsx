import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function BusinessWorkers() {
  const { id } = useParams(); // business id
  const { token, user } = useAuth();

  const [workers, setWorkers] = useState([]);
  const [status, setStatus] = useState("");
  const [experience, setExperience] = useState(0);
  const [skills, setSkills] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const url = status
        ? `http://localhost:5000/api/businesses/${id}/workers?status=${encodeURIComponent(status)}`
        : `http://localhost:5000/api/businesses/${id}/workers`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load workers");
      setWorkers(data);
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status]);

  async function apply() {
    setMsg("");
    setErr("");

    if (!token) return setErr("Please login as worker to apply.");

    try {
      const res = await fetch("http://localhost:5000/api/workers/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          business_id: Number(id),
          experience: Number(experience),
          skills,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Apply failed");

      setMsg("Applied successfully ✅");
      setSkills("");
      setExperience(0);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: "0 16px" }}>
      <h2>Workers for business #{id}</h2>

      <div style={{ margin: "10px 0" }}>
        <label>
          Filter status:{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="ready">Ready</option>
            <option value="busy">Busy</option>
          </select>
        </label>
      </div>

      {err && <div style={{ color: "crimson" }}>{err}</div>}
      {msg && <div style={{ color: "green" }}>{msg}</div>}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {workers.map((w) => (
          <div key={w.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 10 }}>
            <div style={{ fontWeight: 600 }}>{w.worker_name}</div>
            <div>Phone: {w.worker_phone}</div>
            <div>Experience: {w.experience}</div>
            <div>Skills: {w.skills}</div>
            <div>Status: {w.status}</div>
          </div>
        ))}
        {workers.length === 0 && <div>No workers found.</div>}
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h3>Apply (worker)</h3>
      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <div style={{ opacity: 0.8 }}>
          Logged in as: {user ? `${user.name} (${user.role})` : "Not logged in"}
        </div>

        <input
          type="number"
          min="0"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Experience (years)"
        />
        <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Skills (comma separated)" />
        <button onClick={apply}>Apply</button>
      </div>
    </div>
  );
}
