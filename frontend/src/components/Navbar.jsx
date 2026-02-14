import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";

export default function Navbar() {
  const { isAuthed, user, logout: clearAuth, booting } = useAuth();

  const onLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore API failures and clear local auth state.
    } finally {
      clearAuth();
    }
  };

  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <Link to="/" className="brand">
          <span className="brand-dot" />
          WorkHub
        </Link>

        <nav className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/businesses">Marketplace</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          {!isAuthed && !booting && <NavLink to="/login">Login</NavLink>}
          {!isAuthed && !booting && (
            <NavLink to="/register" className="pill-link">
              Register
            </NavLink>
          )}
        </nav>

        {isAuthed && (
          <div className="auth-chip">
            <span>
              {user?.name} ({user?.role})
            </span>
            <button className="btn btn-ghost" onClick={onLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
