import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from "../api";

export default function BusinessWorkers() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const res = await fetch(`${API_URL}/api/businesses/${id}/workers`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load workers");
        setItems(data);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Workers</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>Business ID: {id}</p>
        </div>
        <Link to="/" style={{ textDecoration: "none" }}>← Back</Link>
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, marginTop: 16 }}>
        {loading && <div>Loading…</div>}
        {err && (
          <div style={{ background: "#fff2f2", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10, color: "#b00020" }}>
            {err}
          </div>
        )}

        {!loading && !err && (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((w) => (
              <div key={w.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>{w.worker_name}</div>
                  <span style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #eee", borderRadius: 999 }}>
                    {w.status}
                  </span>
                </div>
                <div style={{ opacity: 0.75, marginTop: 6 }}>Phone: {w.worker_phone}</div>
                <div style={{ opacity: 0.75 }}>Experience: {w.experience} years</div>
                <div style={{ opacity: 0.75 }}>Skills: {w.skills || "-"}</div>
              </div>
            ))}
            {items.length === 0 && <div style={{ opacity: 0.75 }}>No workers found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
