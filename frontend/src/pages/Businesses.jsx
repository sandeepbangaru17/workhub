import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBusinesses } from "../api";

export default function Businesses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const data = await getBusinesses();
        setItems(data);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>WorkHub</h1>
      <p style={{ marginTop: 6, opacity: 0.75 }}>Select a business to view workers.</p>

      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Businesses</h2>

        {loading && <div>Loading…</div>}
        {err && (
          <div style={{ background: "#fff2f2", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10, color: "#b00020" }}>
            {err}
          </div>
        )}

        {!loading && !err && (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {items.map((b) => (
              <Link
                key={b.id}
                to={`/businesses/${b.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid #f0f0f0",
                  borderRadius: 12,
                  padding: 14,
                  display: "block",
                }}
              >
                <div style={{ fontWeight: 700 }}>{b.name}</div>
                <div style={{ opacity: 0.75 }}>{b.location || "-"}</div>
                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>View workers →</div>
              </Link>
            ))}
            {items.length === 0 && <div style={{ opacity: 0.75 }}>No businesses yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
