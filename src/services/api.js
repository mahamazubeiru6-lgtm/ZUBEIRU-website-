import { API_BASE_URL } from "../providers/AuthProvider";

export async function checkBackendHealth(signal) {
  const response = await fetch(`${API_BASE_URL}/health/`, { signal });
  if (!response.ok) throw new Error(`Backend health check failed with ${response.status}`);
  const payload = await response.json();
  if (payload.status !== "ok") throw new Error("Backend returned an invalid health response");
  return payload;
}
