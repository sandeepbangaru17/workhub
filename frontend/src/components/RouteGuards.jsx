import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function EntryRedirect() {
  const { booting, isAuthed, user } = useAuth();
  if (booting) return <div className="panel">Loading...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export function RequireAuth({ children }) {
  const { booting, isAuthed } = useAuth();
  if (booting) return <div className="panel">Loading...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

export function PublicOnly({ children }) {
  const { booting, isAuthed, user } = useAuth();
  if (booting) return <div className="panel">Loading...</div>;
  if (isAuthed) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

export function RequireRole({ role, children }) {
  const { booting, isAuthed, user } = useAuth();
  if (booting) return <div className="panel">Loading...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}
