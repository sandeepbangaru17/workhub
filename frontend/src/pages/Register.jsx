import { useState } from "react";
import { Link } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");

  const onSubmit = (e) => {
    e.preventDefault();
    alert("UI only ✅ (Next step we connect backend)");
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register to apply for work or manage your business.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Test User"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="9999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Role</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="worker">Worker</option>
              <option value="owner">Owner</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Worker applies for jobs. Owner manages business and approves workers.
            </p>
          </div>

          <button className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            Register
          </button>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link className="font-semibold text-slate-900 hover:underline" to="/login">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
