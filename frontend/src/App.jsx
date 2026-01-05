import { useEffect, useState } from "react";
import { getBusinesses } from "./api";

export default function App() {
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
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>WorkHub</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.75 }}>Find businesses and apply for work.</p>
        </div>
        <span style={{ padding: "6px 10px", border: "1px solid #eee", borderRadius: 999, fontSize: 12 }}>
          Backend: localhost:5000
        </span>
      </header>

      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
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
              <div key={b.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700 }}>{b.name}</div>
                <div style={{ opacity: 0.75 }}>{b.city}</div>
              </div>
            ))}

            {items.length === 0 && (
              <div style={{ opacity: 0.75 }}>No businesses yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
