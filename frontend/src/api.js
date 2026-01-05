export const API_URL = "http://localhost:5000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export const api = {
  login: (phone, password) => request("/api/auth/login", { method: "POST", body: { phone, password } }),
  register: (name, phone, password, role) =>
    request("/api/auth/register", { method: "POST", body: { name, phone, password, role } }),
};
