import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STOREFRONT_DOMAIN } from "../config";
import {
  API_BASE_URL,
  getCurrentSubdomain,
  useAuth,
} from "../providers/AuthProvider";

const AgentContext = createContext(null);
const STORE_CACHE_PREFIX = "datasite_store_context:";
const VALID_STORE_TTL = 5 * 60 * 1000;
const INVALID_STORE_TTL = 30 * 1000;
const memoryCache = new Map();
const pendingRequests = new Map();

export function normalizeStoreSlug(value) {
  if (!value) return null;

  let normalized = String(value).trim().toLowerCase();
  try {
    if (/^https?:\/\//.test(normalized)) {
      normalized = new URL(normalized).hostname;
    }
  } catch {
    // Fall through to the string cleanup below.
  }

  normalized = normalized
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];

  const domain = STOREFRONT_DOMAIN.toLowerCase();
  if (normalized.endsWith(`.${domain}`)) {
    normalized = normalized.slice(0, -(domain.length + 1));
  }

  return normalized.replace(/\.$/, "") || null;
}

export function buildStoreContext(agentData) {
  if (!agentData) return null;

  const owner = agentData.agent || {};
  const profile = agentData.profile || {};
  const role = owner.role || profile.role || null;

  return {
    type: role === "AGENT" ? "agent" : role === "SUB_AGENT" ? "subagent" : null,
    role,
    ownerUserId: owner.id || profile.user_id || null,
    profileId: profile.id || null,
    parentProfileId: profile.parent_agent || null,
    storeUrl: profile.store_url || owner.store_url || null,
    shopName: profile.shop_name || owner.shop_name || null,
  };
}

export function getOwnStoreSlug(user) {
  return normalizeStoreSlug(
    user?.sub_agent_profile?.store_url ||
      user?.agent_profile?.sub_agent_store_url ||
      user?.agent_profile?.store_url ||
      user?.store_url ||
      null
  );
}

export function deriveStoreAccess({ user, isAuthenticated, storeContext }) {
  const onMainSite = !storeContext;
  const ownStoreSlug = getOwnStoreSlug(user);
  const currentStoreSlug = normalizeStoreSlug(storeContext?.storeUrl);
  const ownProfileId = user?.agent_profile?.id || null;
  const parentProfileId = user?.agent_profile?.parent_agent || null;

  const ownsCurrentStore = Boolean(
    isAuthenticated &&
      storeContext &&
      (user?.role === "AGENT" || user?.role === "SUB_AGENT") &&
      ((user?.id && storeContext.ownerUserId === user.id) ||
        (ownProfileId && storeContext.profileId === ownProfileId) ||
        (ownStoreSlug && currentStoreSlug === ownStoreSlug))
  );

  const isSubAgentOfCurrentAgent = Boolean(
    isAuthenticated &&
      user?.role === "SUB_AGENT" &&
      storeContext?.type === "agent" &&
      parentProfileId &&
      storeContext.profileId === parentProfileId
  );

  const canUseRoleTools = Boolean(
    user?.role === "ADMIN" ||
      ownsCurrentStore ||
      isSubAgentOfCurrentAgent ||
      (user?.role === "CUSTOMER" && onMainSite)
  );

  return {
    onMainSite,
    ownsCurrentStore,
    isSubAgentOfCurrentAgent,
    canUseRoleTools,
    canBecomeSubAgent:
      storeContext?.type === "agent" &&
      (!isAuthenticated || user?.role === "CUSTOMER"),
    ownStoreSlug,
    currentStoreSlug,
  };
}

function readCachedStore(subdomain) {
  const memoryValue = memoryCache.get(subdomain);
  if (memoryValue?.expiresAt > Date.now()) return memoryValue.value;
  if (memoryValue) memoryCache.delete(subdomain);

  try {
    const raw = sessionStorage.getItem(`${STORE_CACHE_PREFIX}${subdomain}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(`${STORE_CACHE_PREFIX}${subdomain}`);
      return null;
    }
    memoryCache.set(subdomain, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCachedStore(subdomain, value) {
  const ttl = value.valid ? VALID_STORE_TTL : INVALID_STORE_TTL;
  const entry = { value, expiresAt: Date.now() + ttl };
  memoryCache.set(subdomain, entry);
  try {
    sessionStorage.setItem(
      `${STORE_CACHE_PREFIX}${subdomain}`,
      JSON.stringify(entry)
    );
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

async function loadStore(subdomain, force = false) {
  if (!force) {
    const cached = readCachedStore(subdomain);
    if (cached) return cached;
  }

  if (pendingRequests.has(subdomain)) return pendingRequests.get(subdomain);

  const request = fetch(
    `${API_BASE_URL}/accounts/agent-by-store/?store_url=${encodeURIComponent(
      subdomain
    )}`
  )
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      const value = {
        valid: response.ok && Boolean(payload.exists),
        agent: response.ok && payload.exists ? payload.data : null,
      };
      writeCachedStore(subdomain, value);
      return value;
    })
    .catch(() => {
      const value = { valid: false, agent: null };
      writeCachedStore(subdomain, value);
      return value;
    })
    .finally(() => pendingRequests.delete(subdomain));

  pendingRequests.set(subdomain, request);
  return request;
}

function buildStoreUrl(slug) {
  if (!slug) return null;
  const local =
    STOREFRONT_DOMAIN === "lvh.me" || STOREFRONT_DOMAIN === "localhost";
  const protocol = local ? window.location.protocol : "https:";
  const port = local && window.location.port ? `:${window.location.port}` : "";
  return `${protocol}//${slug}.${STOREFRONT_DOMAIN}${port}`;
}

export function AgentContextProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const subdomain = getCurrentSubdomain();
  const [agent, setAgent] = useState(null);
  const [isValidSubdomain, setIsValidSubdomain] = useState(true);
  const [loading, setLoading] = useState(Boolean(subdomain));

  const refreshStoreContext = useCallback(async () => {
    if (!subdomain) {
      setAgent(null);
      setIsValidSubdomain(true);
      setLoading(false);
      return null;
    }

    setLoading(true);
    const result = await loadStore(subdomain, true);
    setAgent(result.agent);
    setIsValidSubdomain(result.valid);
    setLoading(false);
    return result.agent;
  }, [subdomain]);

  useEffect(() => {
    let active = true;
    if (!subdomain) {
      setAgent(null);
      setIsValidSubdomain(true);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    loadStore(subdomain).then((result) => {
      if (!active) return;
      setAgent(result.agent);
      setIsValidSubdomain(result.valid);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [subdomain]);

  const storeContext = useMemo(() => buildStoreContext(agent), [agent]);
  const access = useMemo(
    () => deriveStoreAccess({ user, isAuthenticated, storeContext }),
    [user, isAuthenticated, storeContext]
  );
  const fullOwnStoreUrl = useMemo(
    () => buildStoreUrl(access.ownStoreSlug),
    [access.ownStoreSlug]
  );

  const value = useMemo(
    () => ({
      agent,
      storeContext,
      subdomain,
      isValidSubdomain,
      loading,
      accessLoading: loading,
      fullOwnStoreUrl,
      refreshStoreContext,
      ...access,
    }),
    [
      agent,
      storeContext,
      subdomain,
      isValidSubdomain,
      loading,
      fullOwnStoreUrl,
      refreshStoreContext,
      access,
    ]
  );

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

export function useAgentContext() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used within AgentContextProvider");
  }
  return context;
}
