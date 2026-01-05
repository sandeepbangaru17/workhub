export const API_URL = "http://localhost:5000";

export async function getBusinesses() {
  const res = await fetch(`${API_URL}/api/businesses`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load businesses");
  return data;
}
