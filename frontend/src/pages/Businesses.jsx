import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Businesses() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:5000/api/businesses");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load businesses");
        setItems(data);
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: "0 16px" }}>
      <h2>Businesses</h2>
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {items.map((b) => (
          <div key={b.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 10 }}>
            <div style={{ fontWeight: 600 }}>{b.name}</div>
            <div style={{ opacity: 0.8 }}>{b.city}</div>
            <div style={{ marginTop: 8 }}>
              <Link to={`/businesses/${b.id}`}>View workers</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
