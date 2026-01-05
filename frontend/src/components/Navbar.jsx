import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const { isAuthed, user, logout } = useAuth();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-extrabold tracking-tight text-slate-900">
          WorkHub
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <NavLink className="text-slate-700 hover:text-slate-900" to="/businesses">
            Businesses
          </NavLink>

          {!isAuthed ? (
            <>
              <NavLink className="text-slate-700 hover:text-slate-900" to="/login">
                Login
              </NavLink>
              <NavLink className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800" to="/register">
                Register
              </NavLink>
            </>
          ) : (
            <>
              <span className="hidden text-slate-600 sm:inline">
                {user?.name} ({user?.role})
              </span>
              <button
                onClick={logout}
                className="rounded-lg border px-3 py-1.5 font-semibold text-slate-900 hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
