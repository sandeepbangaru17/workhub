const DEFAULT_API_URL = "http://localhost:5001";
export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export const api = {
  login: (email, password) => request("/api/login", { method: "POST", body: { email, password } }),
  register: (name, email, password, role) =>
    request("/api/register", { method: "POST", body: { name, email, password, role } }),
  logout: () => request("/api/logout", { method: "POST" }),
  me: () => request("/api/me"),
  getBusinesses: () => request("/api/businesses"),
  getBusinessWorkers: (businessId) => request(`/api/businesses/${businessId}/workers`),
};

export const getBusinesses = api.getBusinesses;
export const getBusinessWorkers = api.getBusinessWorkers;
