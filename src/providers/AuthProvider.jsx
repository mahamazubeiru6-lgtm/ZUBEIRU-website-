import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext, transformUserData } from "../contexts/AuthContext";

export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

const storefrontDomain = process.env.REACT_APP_STOREFRONT_DOMAIN || "lvh.me";

export function getCurrentSubdomain() {
  const hostname = window.location.hostname.toLowerCase();
  const mainHosts = [
    "localhost",
    "127.0.0.1",
    "::1",
    storefrontDomain,
    `www.${storefrontDomain}`,
  ];

  if (mainHosts.includes(hostname)) return null;
  if (hostname.endsWith(`.${storefrontDomain}`)) {
    return hostname.slice(0, -(storefrontDomain.length + 1));
  }
  return null;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function prepareAuthRequestOptions(
  requestOptions = {},
  { accessToken = null, subdomain = null } = {}
) {
  const options = { ...requestOptions };
  const headers = { ...(requestOptions.headers || {}) };
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasContentType = Object.keys(headers).some(
    (name) => name.toLowerCase() === "content-type"
  );

  if (subdomain) headers["X-Subdomain"] = subdomain;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  // Django REST Framework needs an explicit media type for JSON request bodies.
  // FormData must remain unset so the browser can add its multipart boundary.
  if (!isFormData && !hasContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (options.body && typeof options.body === "object" && !isFormData) {
    options.body = JSON.stringify(options.body);
  }

  return { ...options, headers };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [loading, setLoading] = useState(true);
  const [unpaidGate, setUnpaidGate] = useState({
    active: false,
    paymentUrl: null,
    message: null,
  });

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setUnpaidGate({ active: false, paymentUrl: null, message: null });
    ["access_token", "refresh_token", "user"].forEach((key) =>
      localStorage.removeItem(key)
    );
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (token && storedUser) {
        setUser(transformUserData(JSON.parse(storedUser)));
      }
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [token, clearSession]);

  const login = useCallback((userData, accessToken, refreshToken) => {
    const normalized = transformUserData(userData);
    setUser(normalized);
    setToken(accessToken);
    setUnpaidGate({ active: false, paymentUrl: null, message: null });
    localStorage.setItem("user", JSON.stringify(normalized));
    localStorage.setItem("access_token", accessToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/accounts/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) return null;

      const payload = await readJson(response);
      const access = payload.data?.access || payload.access;
      if (!access) return null;

      setToken(access);
      localStorage.setItem("access_token", access);
      return access;
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh && token) {
        await fetch(`${API_BASE_URL}/accounts/auth/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ refresh }),
        });
      }
    } finally {
      clearSession();
    }
  }, [token, clearSession]);

  const authFetch = useCallback(
    async (path, requestOptions = {}) => {
      const execute = async (accessToken) => {
        const subdomain = getCurrentSubdomain();
        const options = prepareAuthRequestOptions(requestOptions, {
          accessToken,
          subdomain,
        });

        return fetch(`${API_BASE_URL}${path}`, options);
      };

      let response = await execute(token);
      if (response.status === 401 && localStorage.getItem("refresh_token")) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          response = await execute(refreshedToken);
        } else {
          clearSession();
        }
      }

      if (response.status === 403) {
        const payload = await readJson(response.clone());
        const registrationBlocked =
          payload.code === "REGISTRATION_PAYMENT_REQUIRED" ||
          payload.code === "REGISTRATION_FEE_REQUIRED" ||
          payload.requires_fee === true;

        if (registrationBlocked) {
          setUnpaidGate({
            active: true,
            paymentUrl:
              payload.payment_url ||
              "/accounts/registration/initiate-payment/",
            message:
              payload.message ||
              "Complete your registration payment to continue.",
          });
        }
      }

      return response;
    },
    [token, refreshAccessToken, clearSession]
  );

  const refreshUser = useCallback(
    async (accessTokenOverride = null) => {
      try {
        let response;
        if (accessTokenOverride) {
          const headers = { Authorization: `Bearer ${accessTokenOverride}` };
          const subdomain = getCurrentSubdomain();
          if (subdomain) headers["X-Subdomain"] = subdomain;
          response = await fetch(`${API_BASE_URL}/accounts/user/me/`, {
            headers,
          });
        } else {
          response = await authFetch("/accounts/user/me/");
        }

        const payload = await readJson(response);
        if (!response.ok || payload.status !== "success" || !payload.data) {
          return null;
        }

        const normalized = transformUserData(payload.data);
        setUser(normalized);
        localStorage.setItem("user", JSON.stringify(normalized));
        if (!normalized.is_unpaid_agent) {
          setUnpaidGate({ active: false, paymentUrl: null, message: null });
        }
        return normalized;
      } catch {
        return null;
      }
    },
    [authFetch]
  );

  const becomeAgent = useCallback(
    async (payload) => {
      try {
        const response = await authFetch("/accounts/become-agent/", {
          method: "POST",
          body: payload,
        });
        const data = await readJson(response);
        if (!response.ok || data.status !== "success") {
          return {
            ok: false,
            error: data.message || "Could not upgrade account.",
            errors: data.errors || null,
          };
        }
        return { ok: true, data: data.data };
      } catch {
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    [authFetch]
  );

  const initiateRegistrationPayment = useCallback(
    async ({ userId } = {}) => {
      try {
        const response = userId
          ? await fetch(
              `${API_BASE_URL}/accounts/registration/initiate-payment/`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
              }
            )
          : await authFetch("/accounts/registration/initiate-payment/", {
              method: "POST",
            });

        const data = await readJson(response);
        if (!response.ok || data.status !== "success") {
          return {
            ok: false,
            throttled: response.status === 429,
            error: data.message || "Could not initiate payment.",
            detail: data.detail || null,
          };
        }
        return { ok: true, data: data.data };
      } catch {
        return { ok: false, error: "Network error. Please try again." };
      }
    },
    [authFetch]
  );

  const pollRegistrationStatus = useCallback(
    async (
      userId,
      { intervalMs = 3500, maxAttempts = 34 } = {}
    ) => {
      const targetId = userId || user?.id;
      if (!targetId) return { ok: false, error: "No user id." };

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/accounts/registration/status/?user_id=${encodeURIComponent(
              targetId
            )}`
          );
          const data = await readJson(response);

          if (response.ok && data.status === "success" && data.is_complete) {
            const access = data.data?.tokens?.access;
            const refresh = data.data?.tokens?.refresh;

            if (access) {
              setToken(access);
              localStorage.setItem("access_token", access);
              if (refresh) localStorage.setItem("refresh_token", refresh);
              await refreshUser(access);
            }

            setUnpaidGate({
              active: false,
              paymentUrl: null,
              message: null,
            });
            return { ok: true, data: data.data };
          }
        } catch {
          // A temporary network failure should not stop status polling.
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      return {
        ok: false,
        error: "Timed out waiting for payment confirmation.",
      };
    },
    [user?.id, refreshUser]
  );

  const clearUnpaidGate = useCallback(() => {
    setUnpaidGate({ active: false, paymentUrl: null, message: null });
  }, []);

  const value = useMemo(
    () => ({
      API_BASE_URL,
      user,
      token,
      loading,
      login,
      logout,
      authFetch,
      refreshAccessToken,
      refreshUser,
      becomeAgent,
      initiateRegistrationPayment,
      pollRegistrationStatus,
      unpaidGate,
      clearUnpaidGate,
      getCurrentSubdomain,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === "ADMIN",
      isAgent: user?.role === "AGENT",
      isSubAgent: user?.role === "SUB_AGENT",
      isCustomer: user?.role === "CUSTOMER",
      isUnpaidAgent: Boolean(user?.is_unpaid_agent),
      isFullyRegisteredAgent: Boolean(user?.is_fully_registered_agent),
    }),
    [
      user,
      token,
      loading,
      login,
      logout,
      authFetch,
      refreshAccessToken,
      refreshUser,
      becomeAgent,
      initiateRegistrationPayment,
      pollRegistrationStatus,
      unpaidGate,
      clearUnpaidGate,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

