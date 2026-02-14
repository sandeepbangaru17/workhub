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
  stats: () => request("/api/stats"),
  getBusinesses: () => request("/api/businesses"),
  getBusinessWorkers: (businessId) => request(`/api/businesses/${businessId}/workers`),
  getWorkers: () => request("/api/workers"),
  workerUpdateProfile: (payload) => request("/api/worker/profile", { method: "POST", body: payload }),
  workerJoinBusiness: (business_id) => request("/api/worker/join", { method: "POST", body: { business_id } }),
  workerRequests: () => request("/api/worker/requests"),
  ownerCreateBusiness: (payload) => request("/api/owner/businesses", { method: "POST", body: payload }),
  ownerBusinesses: () => request("/api/owner/businesses"),
  ownerRequests: () => request("/api/owner/requests"),
  ownerDecision: (requestId, approve) =>
    request(`/api/owner/requests/${requestId}/decision`, { method: "POST", body: { approve } }),
  ownerWorkers: () => request("/api/owner/workers"),
  ownerWorkerStatus: (workerId, status) =>
    request(`/api/owner/workers/${workerId}/status`, { method: "POST", body: { status } }),
  adminBusinesses: () => request("/api/admin/businesses"),
  adminPendingWorkers: () => request("/api/admin/workers/pending"),
  adminWorkerDecision: (workerId, approve) =>
    request(`/api/admin/workers/${workerId}/decision`, { method: "POST", body: { approve } }),
};

export const getBusinesses = api.getBusinesses;
export const getBusinessWorkers = api.getBusinessWorkers;

export function subscribeToLiveUpdates(onEvent, onError) {
  const source = new EventSource(`${API_URL}/api/stream`, { withCredentials: true });

  source.addEventListener("refresh", (evt) => {
    try {
      onEvent(JSON.parse(evt.data));
    } catch {
      onEvent({ scope: "unknown", ts: Date.now() });
    }
  });

  source.addEventListener("connected", (evt) => {
    try {
      onEvent(JSON.parse(evt.data));
    } catch {
      onEvent({ scope: "connected", ts: Date.now() });
    }
  });

  source.onerror = () => {
    if (onError) onError();
  };

  return () => source.close();
}
