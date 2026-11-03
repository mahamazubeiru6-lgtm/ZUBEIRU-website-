import { useEffect, useState } from "react";
import { API_BASE_URL, getCurrentSubdomain } from "../providers/AuthProvider";

export function useAgentContext() {
  const [agent, setAgent] = useState(null);
  const [isValidSubdomain, setIsValidSubdomain] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subdomain = getCurrentSubdomain();
    if (!subdomain) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/accounts/agent-by-store/?store_url=${encodeURIComponent(subdomain)}`, { signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        const valid = response.ok && Boolean(payload.exists);
        setIsValidSubdomain(valid);
        setAgent(valid ? payload.data : null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setIsValidSubdomain(false);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { agent, isValidSubdomain, loading };
}
