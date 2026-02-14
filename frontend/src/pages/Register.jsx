import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      await api.register(name, email, password, role);
      nav("/login");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <p className="eyebrow">Onboarding</p>
        <h1>Create Your WorkHub Account</h1>
        <p>Join as a worker or business owner.</p>

        {err && <div className="alert">{err}</div>}

        <form className="form-stack" onSubmit={onSubmit}>
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password (min 4 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="worker">Worker</option>
            <option value="owner">Owner</option>
          </select>
          <button disabled={loading} className="btn btn-primary">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p>
          Already have access?{" "}
          <Link to="/login" className="inline-link">
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}
