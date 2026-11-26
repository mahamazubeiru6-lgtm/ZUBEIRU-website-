const UTILITY_GUEST_TOKEN_KEY = "datasite_utility_guest_token";

const storageAvailable = () =>
  typeof window !== "undefined" && window.localStorage;

const createSecureToken = () => {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  return null;
};

export const getUtilityGuestToken = () => {
  if (!storageAvailable()) return null;
  return localStorage.getItem(UTILITY_GUEST_TOKEN_KEY);
};

export const ensureUtilityGuestToken = () => {
  const existing = getUtilityGuestToken();
  if (existing && existing.length >= 32) return existing;
  const token = createSecureToken();
  if (storageAvailable() && token) localStorage.setItem(UTILITY_GUEST_TOKEN_KEY, token);
  return token;
};

export const saveUtilityGuestToken = (token) => {
  if (storageAvailable() && token) {
    localStorage.setItem(UTILITY_GUEST_TOKEN_KEY, token);
  }
};

export const utilityGuestTokenHeaders = (token = getUtilityGuestToken()) =>
  token ? { "X-Guest-Token": token } : {};
