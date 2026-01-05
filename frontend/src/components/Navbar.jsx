import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold tracking-tight">
          WorkHub
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link
            to="/businesses"
            className="rounded-md px-3 py-2 hover:bg-slate-100"
          >
            Businesses
          </Link>

          <Link
            to="/login"
            className="rounded-md px-3 py-2 hover:bg-slate-100"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="rounded-md bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
