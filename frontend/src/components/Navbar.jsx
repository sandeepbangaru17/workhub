import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 16, borderBottom: "1px solid #eee", display: "flex", gap: 12 }}>
      <Link to="/">WorkHub</Link>

      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        {(user?.role === "owner" || user?.role === "admin") && <Link to="/owner">Owner</Link>}

        {!user ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <span>
              {user.name} ({user.role})
            </span>
            <button onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </div>
  );
}
