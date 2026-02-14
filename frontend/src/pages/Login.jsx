import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const auth = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const data = await api.login(email, password);
      auth.login({ name: data.name, role: data.role, email });
      nav("/");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-wrap auth-wrap-glass">
      <div className="glass-login-card">
        <h2>Login</h2>
        <p className="auth-sub">Default admin: admin@workhub.local / admin123</p>

        {err && <div className="alert">{err}</div>}

        <form onSubmit={onSubmit} className="auth-form-glass">
          <div className="input-group-float">
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="email">Email</label>
          </div>

          <div className="input-group-float">
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <label htmlFor="password">Password</label>
          </div>

          <button disabled={loading} className="btn-login-glass">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="footer-glass">
          Do not have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </div>
      </div>
    </section>
  );
}
