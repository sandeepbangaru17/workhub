import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight">
          WorkHub
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" to="/businesses">
            Businesses
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-slate-100" to="/login">
            Login
          </Link>
          <Link className="rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800" to="/register">
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
