


import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "../hooks/useTheme";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";
import {
  Search,
  Filter as FilterIcon,
  X,
  Eye,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Truck,
  Download,
  Printer,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  DollarSign,
  Package,
  Activity,
  RotateCw,
  Loader2,
  Repeat,
  Sparkles,
} from "lucide-react";


const STATUS_COLORS = {
  PENDING: "#F59E0B",
  PROCESSING: "#3B82F6",
  DELIVERED: "#8B5CF6",
  COMPLETED: "#10B981",
  FAILED: "#EF4444",
};

const NETWORK_COLORS = {
  MTN: "#FFD700",
  MTN_EXPRESS: "#FFD700",
  TELECEL: "#FF0000",
  AIRTELTIGO: "#1A73E8",
  AT_BIGTIME: "#1A73E8",
};

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "DELIVERED",
  "COMPLETED",
  "FAILED",
];

const NETWORK_OPTIONS = ["ALL", "MTN", "Telecel", "AirtelTigo"];

const SEARCH_DEBOUNCE_MS = 400;
const EAGER_FETCH_PAGE_SIZE = 200;
const EAGER_FETCH_PAGE_CAP = 5; // scan at most 1,000 filtered records

const STATUS_WORDS = {
  pending: "PENDING",
  processing: "PROCESSING",
  delivered: "DELIVERED",
  completed: "COMPLETED",
  failed: "FAILED",
};

const NETWORK_WORDS = {
  mtn: "MTN",
  "mtn express": "MTN",
  telecel: "Telecel",
  airteltigo: "AirtelTigo",
  "airtel tigo": "AirtelTigo",
};

const getStatusColor = (s) => STATUS_COLORS[s] || "#6B7280";
const getNetworkColor = (n) => {
  if (!n) return "#6B7280";
  return NETWORK_COLORS[String(n).toUpperCase()] || "#6B7280";
};
const getStatusLabel = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "N/A";

const canRetryOrder = (order) =>
  order.status === "FAILED" && order.payment_status === "COMPLETED" && !order.refunded_at;

const StatusIcon = ({ status, size = 14 }) => {
  const map = {
    PENDING: Clock,
    PROCESSING: RefreshCw,
    DELIVERED: Truck,
    COMPLETED: CheckCircle,
    FAILED: AlertCircle,
  };
  const Icon = map[status];
  return Icon ? <Icon size={size} /> : null;
};

const formatDate = (iso) => {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
};


const buildHaystack = (o) => {
  if (!o) return "";
  const parts = [];
  const push = (v) => {
    if (v === null || v === undefined || typeof v === "object") return;
    const s = String(v).trim();
    if (s) parts.push(s.toLowerCase());
  };
  push(o.id);
  push(o.status);
  push(o.status_display);
  push(o.customer_username);
  push(o.agent_username);
  push(o.sub_agent_username);
  push(o.package_name);
  push(o.package_size);
  push(o.customer_price);
  push(o.agent_profit);
  push(o.sub_agent_profit);
  push(o.provider_status);
  push(o.provider_reference);
  push(o.failure_reason);
  push(o.notes);
  push(o.created_at);
  if (o.customer) {
    push(o.customer.username);
    push(o.customer.first_name);
    push(o.customer.last_name);
    push(o.customer.email);
    push(o.customer.phone_number);
  }
  if (o.agent) {
    push(o.agent.username);
    push(o.agent.shop_name);
  }
  if (o.sub_agent) {
    push(o.sub_agent.username);
    push(o.sub_agent.shop_name);
  }
  if (o.package) {
    push(o.package.network);
    push(o.package.name);
    push(o.package.size_gb);
  }
  if (o.recipient) {
    push(o.recipient.name);
    push(o.recipient.phone_number);
    push(o.recipient.region);
  }
  return parts.join(" ");
};


const parseOrderSearch = (query) => {
  const raw = query.trim().toLowerCase();
  const tokens = raw.split(/\s+/).filter(Boolean);
  let status = null;
  let network = null;
  let dateFrom = null;
  let dateTo = null;
  const free = [];

  const joined = raw.replace(/\s+/g, " ");
  for (const [word, net] of Object.entries(NETWORK_WORDS)) {
    if (word.includes(" ") && joined.includes(word)) {
      network = net;
    }
  }

  for (const tok of tokens) {
    if (STATUS_WORDS[tok]) {
      status = STATUS_WORDS[tok];
      continue;
    }
    if (!network && NETWORK_WORDS[tok]) {
      network = NETWORK_WORDS[tok];
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(tok)) {
      if (!dateFrom) dateFrom = tok;
      else dateTo = tok;
      continue;
    }
    free.push(tok);
  }

  return {
    status,
    network,
    dateFrom,
    dateTo,
    freeText: free.join(" "),
  };
};

const useDebounced = (value, delay = SEARCH_DEBOUNCE_MS) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};


const OrdersList = () => {
  const { colors } = useTheme();
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const callbackOrder = searchParams.get("order");
  const verifiedOrder = useRef(null);

  
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedNetwork, setSelectedNetwork] = useState("ALL");

  
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalPages: 1,
    count: 0,
  });

  
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, SEARCH_DEBOUNCE_MS);
  const parsedSearch = useMemo(
    () => parseOrderSearch(debouncedSearch),
    [debouncedSearch]
  );

  
  const effectiveStatus = parsedSearch.status || selectedStatus;
  const effectiveNetwork = parsedSearch.network || selectedNetwork;
  const effectiveDateFrom = parsedSearch.dateFrom;
  const effectiveDateTo = parsedSearch.dateTo;
  const effectiveFreeText = parsedSearch.freeText;

  
  const [fullSet, setFullSet] = useState(null); // null | { data: [...], truncated: bool }
  const [fullFetching, setFullFetching] = useState(false);
  const fullSetKeyRef = useRef("");

  const fullSetKey = useMemo(
    () =>
      [
        effectiveStatus,
        effectiveNetwork,
        effectiveDateFrom || "",
        effectiveDateTo || "",
      ].join("|"),
    [effectiveStatus, effectiveNetwork, effectiveDateFrom, effectiveDateTo]
  );

  
  const [weeklyData, setWeeklyData] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState(null);

  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [trackedStatuses, setTrackedStatuses] = useState({});
  const [retryingOrderId, setRetryingOrderId] = useState(null);

  
  const abortRef = useRef(null);
  const fullAbortRef = useRef(null);
  const fullRequestIdRef = useRef(0);

  
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    fullAbortRef.current?.abort();
  }, []);

  
  const userRole = user?.role || "CUSTOMER";
  const isAdmin = userRole === "ADMIN";
  const isAgent = userRole === "AGENT";
  const isSubAgent = userRole === "SUB_AGENT";
  const showProfitCol = isAdmin || isAgent || isSubAgent;

  
  const fetchOrders = useCallback(
    async ({ silent } = {}) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(pagination.page));
        params.set("page_size", String(pagination.pageSize));
        if (effectiveStatus !== "ALL") params.set("status", effectiveStatus);
        if (effectiveNetwork !== "ALL")
          params.set("network", effectiveNetwork);
        if (effectiveDateFrom) params.set("start_date", effectiveDateFrom);
        if (effectiveDateTo) params.set("end_date", effectiveDateTo);

        const res = await authFetch(`/data/orders/?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok || data.status !== "success") {
          throw new Error(data.message || "Failed to fetch orders");
        }

        setOrders(data.data || []);
        setPagination((prev) => ({
          ...prev,
          count: data.count || 0,
          totalPages: data.total_pages || 1,
        }));
        setWeeklyData(data.weekly || null);
        setStatusBreakdown(data.status_breakdown || null);
      } catch (err) {
        if (err.name === "AbortError") return;
        showToast(err.message || "Network error", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      authFetch,
      showToast,
      pagination.page,
      pagination.pageSize,
      effectiveStatus,
      effectiveNetwork,
      effectiveDateFrom,
      effectiveDateTo,
    ]
  );

  
  const fetchAllPages = useCallback(async () => {
    if (fullSetKeyRef.current === fullSetKey && fullSet) return;

    if (fullSetKeyRef.current !== fullSetKey) {
      fullSetKeyRef.current = "";
      setFullSet(null);
    }

    if (fullAbortRef.current) fullAbortRef.current.abort();
    const controller = new AbortController();
    fullAbortRef.current = controller;
    const requestId = ++fullRequestIdRef.current;

    setFullFetching(true);

    try {
      const baseParams = new URLSearchParams();
      baseParams.set("page_size", String(EAGER_FETCH_PAGE_SIZE));
      if (effectiveStatus !== "ALL")
        baseParams.set("status", effectiveStatus);
      if (effectiveNetwork !== "ALL")
        baseParams.set("network", effectiveNetwork);
      if (effectiveDateFrom) baseParams.set("start_date", effectiveDateFrom);
      if (effectiveDateTo) baseParams.set("end_date", effectiveDateTo);

      baseParams.set("page", "1");
      const firstRes = await authFetch(
        `/data/orders/?${baseParams.toString()}`,
        { signal: controller.signal }
      );
      const firstData = await firstRes.json();
      if (!firstRes.ok || firstData.status !== "success") {
        throw new Error(firstData.message || "Failed to fetch orders");
      }

      const totalPages = firstData.total_pages || 1;
      const truncated = totalPages > EAGER_FETCH_PAGE_CAP;
      const pagesToFetch = Math.min(totalPages, EAGER_FETCH_PAGE_CAP);

      const remainingPages = [];
      for (let p = 2; p <= pagesToFetch; p++) remainingPages.push(p);

      const results = await Promise.all(
        remainingPages.map(async (p) => {
          const params = new URLSearchParams(baseParams);
          params.set("page", String(p));
          const res = await authFetch(
            `/data/orders/?${params.toString()}`,
            { signal: controller.signal }
          );
          const d = await res.json();
          if (!res.ok || d.status !== "success") {
            throw new Error(d.message || `Failed to load order page ${p}`);
          }
          return d.data || [];
        })
      );

      const all = [firstData.data || [], ...results].flat();
      if (fullRequestIdRef.current !== requestId) return;
      setFullSet({ data: all, truncated });
      fullSetKeyRef.current = fullSetKey;
    } catch (err) {
      if (err.name === "AbortError") return;
      showToast(err.message || "Failed to load all pages", "error");
    } finally {
      if (fullRequestIdRef.current === requestId) setFullFetching(false);
    }
  }, [
    authFetch,
    showToast,
    fullSet,
    fullSetKey,
    effectiveStatus,
    effectiveNetwork,
    effectiveDateFrom,
    effectiveDateTo,
  ]);

  
  useEffect(() => {
    if (!effectiveFreeText) fetchOrders();
  }, [fetchOrders, effectiveFreeText]);

  useEffect(() => {
    if (!callbackOrder || verifiedOrder.current === callbackOrder) return;
    verifiedOrder.current = callbackOrder;
    setSearchParams({}, { replace: true });
    (async () => {
      try {
        const response = await authFetch(`/data/orders/${callbackOrder}/verify-payment/`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || "Could not verify this payment.");
        if (payload.data?.verified) {
          showToast("Payment confirmed. Check your order for delivery status.", "success");
          await fetchOrders({ silent: true });
        } else {
          showToast("Payment is not confirmed yet. Refresh your orders in a moment.", "info");
        }
      } catch (error) {
        showToast(error.message, "error");
      }
    })();
  }, [authFetch, callbackOrder, fetchOrders, setSearchParams, showToast]);

  
  useEffect(() => {
    if (effectiveFreeText) fetchAllPages();
  }, [effectiveFreeText, fullSetKey]);

  
  useEffect(() => {
    if (!effectiveFreeText) {
      setFullSet(null);
      fullSetKeyRef.current = "";
    }
  }, [effectiveStatus, effectiveNetwork, effectiveDateFrom, effectiveDateTo]);

  
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setPagination((p) => (p.page === 1 ? p : { ...p, page: 1 }));
  }, [effectiveStatus, effectiveNetwork, effectiveDateFrom, effectiveDateTo]);

  
  const sourceList = effectiveFreeText ? fullSet?.data || [] : orders;

  
  const filteredOrders = useMemo(() => {
    let list = sourceList;

    if (effectiveNetwork !== "ALL") {
      const n = String(effectiveNetwork).toLowerCase();
      list = list.filter((o) => {
        const net = (
          o.package?.network ||
          o.package_name ||
          ""
        ).toLowerCase();
        return net.includes(n);
      });
    }

    if (!effectiveFreeText) return list;

    const tokens = effectiveFreeText.split(/\s+/).filter(Boolean);
    return list.filter((o) => {
      const hay = buildHaystack(o);
      return tokens.every((t) => hay.includes(t));
    });
  }, [sourceList, effectiveFreeText, effectiveNetwork]);

  
  const { completedCount, pendingCount, processingCount, profitDisplay } =
    useMemo(() => {
      let completed = 0,
        pending = 0,
        processing = 0,
        profit = 0;
      for (const o of filteredOrders) {
        if (o.status === "COMPLETED") completed += 1;
        else if (o.status === "PENDING") pending += 1;
        else if (o.status === "PROCESSING") processing += 1;
        if (isAdmin || isAgent) profit += parseFloat(o.agent_profit) || 0;
        else if (isSubAgent) profit += parseFloat(o.sub_agent_profit) || 0;
      }
      return {
        completedCount: completed,
        pendingCount: pending,
        processingCount: processing,
        profitDisplay: profit.toFixed(2),
      };
    }, [filteredOrders, isAdmin, isAgent, isSubAgent]);

  
  const handleCheckStatus = useCallback(
    async (orderId) => {
      setTrackingOrderId(orderId);
      try {
        const res = await authFetch(`/data/orders/${orderId}/track/`);
        const data = await res.json();
        if (res.ok && data.status === "success") {
          const existing = orders.find((o) => o.id === orderId);
          const newStatus =
            data.tracking?.updated_status ||
            data.data?.status ||
            existing?.status ||
            "UNKNOWN";
          setTrackedStatuses((prev) => ({ ...prev, [orderId]: newStatus }));
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    status: newStatus,
                    provider_status: data.data?.provider_status,
                    provider_reference: data.data?.provider_reference,
                    delivery_details: data.data?.delivery_details,
                    delivered_at: data.data?.delivered_at,
                    failure_reason: data.data?.failure_reason,
                  }
                : o
            )
          );
          setFullSet((prev) =>
            prev
              ? {
                  ...prev,
                  data: prev.data.map((o) =>
                    o.id === orderId ? { ...o, status: newStatus } : o
                  ),
                }
              : prev
          );
          showToast(`Order status: ${getStatusLabel(newStatus)}`, "success");
          setTimeout(() => {
            setTrackedStatuses((prev) => {
              const next = { ...prev };
              delete next[orderId];
              return next;
            });
          }, 5000);
          if (data.tracking?.status_changed) fetchOrders({ silent: true });
        } else if (data.message === "Order already completed.") {
          showToast("This order is already completed.", "info");
        } else {
          showToast(data.message || "Failed to check status", "error");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        showToast("Network error. Please try again.", "error");
      } finally {
        setTrackingOrderId(null);
      }
    },
    [authFetch, orders, showToast, fetchOrders]
  );

  const handleRetryOrder = useCallback(
    async (orderId) => {
      setRetryingOrderId(orderId);
      try {
        const res = await authFetch(`/data/orders/${orderId}/retry/`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (res.ok && data.status === "success") {
          showToast(data.message || "Order retried", "success");
          if (data.data) {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderId
                  ? {
                      ...o,
                      status: data.data.status || o.status,
                      retry_count:
                        data.data.retry_count || (o.retry_count || 0) + 1,
                      last_retry_at: data.data.last_retry_at,
                      delivered_at: data.data.delivered_at,
                      delivery_details: data.data.delivery_details,
                      failure_reason: data.data.failure_reason || "",
                    }
                  : o
              )
            );
            setFullSet((prev) =>
              prev
                ? {
                    ...prev,
                    data: prev.data.map((o) =>
                      o.id === orderId
                        ? { ...o, status: data.data.status || o.status }
                        : o
                    ),
                  }
                : prev
            );
            setTrackedStatuses((prev) => {
              const next = { ...prev };
              delete next[orderId];
              return next;
            });
            fetchOrders({ silent: true });
          }
        } else {
          showToast(
            data.detail || data.message || "Failed to retry",
            "error"
          );
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        showToast("Network error. Please try again.", "error");
      } finally {
        setRetryingOrderId(null);
      }
    },
    [authFetch, showToast, fetchOrders]
  );

  
  const handleClearFilters = () => {
    setSearchInput("");
    setSelectedStatus("ALL");
    setSelectedNetwork("ALL");
    setPagination((p) => ({ ...p, page: 1 }));
    setFullSet(null);
  };

  const hasActiveFilters =
    effectiveStatus !== "ALL" ||
    effectiveNetwork !== "ALL" ||
    effectiveDateFrom ||
    effectiveDateTo ||
    searchInput.trim().length > 0;

  
  const pageNumbers = useMemo(() => {
    const total = pagination.totalPages;
    const cur = pagination.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1];
    const left = Math.max(2, cur - 1);
    const right = Math.min(total - 1, cur + 1);
    if (left > 2) out.push("…");
    for (let i = left; i <= right; i++) out.push(i);
    if (right < total - 1) out.push("…");
    out.push(total);
    return out;
  }, [pagination.page, pagination.totalPages]);

  
  if (loading) {
    return (
      <div style={styles.pageWrap}>
        <div style={styles.loadingBox(colors)}>
          <div style={styles.spinner(colors)} />
          <span style={{ color: colors.secondaryText, fontSize: 14 }}>
            Loading orders...
          </span>
        </div>
      </div>
    );
  }

  const searchActive = !!effectiveFreeText;
  const showSearchLoading = searchActive && fullFetching && !fullSet;

  return (
    <div style={styles.pageWrap}>
      
      <header style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.h1(colors, isMobile)}>
            <Activity size={isMobile ? 20 : 24} color={colors.btnBg} />
            Orders
          </h1>
          <p style={styles.subtitle(colors, isMobile)}>
            {isAdmin
              ? "Manage all orders across the platform"
              : isAgent
              ? "Manage your orders and sub-agent orders"
              : isSubAgent
              ? "View and manage your orders"
              : "Your order history"}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => fetchOrders({ silent: true })}
            disabled={refreshing}
            style={styles.ghostBtn(colors, refreshing)}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? "ol-spin 0.8s linear infinite" : "none",
              }}
            />
            {!isMobile && (refreshing ? "Refreshing…" : "Refresh")}
          </button>
          <button type="button" style={styles.ghostBtn(colors)}>
            <Download size={14} />
            {!isMobile && "Export"}
          </button>
        </div>
      </header>

      
      {(weeklyData || statusBreakdown) && (
        <div style={styles.analyticsGrid(isMobile)}>
          {weeklyData && (
            <div style={styles.card(colors)}>
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <BarChart3 size={15} color={colors.btnBg} />
                  <span style={styles.cardTitle(colors)}>Weekly Revenue</span>
                </div>
                <div style={styles.cardMeta(colors)}>
                  <span>
                    Orders{" "}
                    <strong style={{ color: colors.text }}>
                      {weeklyData.total_orders || 0}
                    </strong>
                  </span>
                  <span>
                    Revenue{" "}
                    <strong style={{ color: colors.text }}>
                      ₵{parseFloat(weeklyData.total_revenue || 0).toFixed(2)}
                    </strong>
                  </span>
                </div>
              </div>
              <WeeklyChart colors={colors} weeklyData={weeklyData} />
              <div style={styles.chartFooter(colors)}>
                <span>
                  {weeklyData.week_start} – {weeklyData.week_end}
                </span>
                <span>
                  Total ₵{parseFloat(weeklyData.total_revenue || 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          {statusBreakdown && (
            <div style={styles.card(colors)}>
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Activity size={15} color={colors.btnBg} />
                  <span style={styles.cardTitle(colors)}>Order Status</span>
                </div>
                <span style={styles.cardMeta(colors)}>
                  Total{" "}
                  <strong style={{ color: colors.text }}>
                    {pagination.count}
                  </strong>
                </span>
              </div>
              <StatusBreakdown
                colors={colors}
                statusBreakdown={statusBreakdown}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>
      )}

      
      <div style={styles.statGrid(isMobile)}>
        <StatCard
          label="Total"
          value={pagination.count}
          icon={<Package size={16} />}
          color={colors.btnBg}
          colors={colors}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={<CheckCircle size={16} />}
          color="#10B981"
          colors={colors}
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          icon={<Clock size={16} />}
          color="#F59E0B"
          colors={colors}
        />
        <StatCard
          label="Processing"
          value={processingCount}
          icon={<RefreshCw size={16} />}
          color="#3B82F6"
          colors={colors}
        />
        {showProfitCol && (
          <StatCard
            label="Total Profit"
            value={`₵${profitDisplay}`}
            icon={<DollarSign size={16} />}
            color="#8B5CF6"
            colors={colors}
          />
        )}
      </div>

      
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search
            size={15}
            color={colors.secondaryText}
            style={styles.searchIcon}
          />
          <input
            type="text"
            placeholder={
              isMobile
                ? "Search orders…"
                : "Try 'pending', 'mtn', '2024-01-15', 'jane'…"
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput(colors, !!searchInput)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              style={styles.searchClear(colors)}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilterModal(true)}
          style={styles.filterBtn(colors, hasActiveFilters)}
        >
          <FilterIcon size={14} />
          {!isMobile && "Filters"}
          {hasActiveFilters && (
            <span style={styles.filterCount}>
              {
                [
                  effectiveStatus !== "ALL",
                  effectiveNetwork !== "ALL",
                  !!effectiveDateFrom,
                  !!effectiveDateTo,
                  searchInput.trim().length > 0,
                ].filter(Boolean).length
              }
            </span>
          )}
        </button>

        {hasActiveFilters && !isMobile && (
          <button
            type="button"
            onClick={handleClearFilters}
            style={styles.clearBtn(colors)}
          >
            Clear
          </button>
        )}
      </div>

      
      <div style={styles.resultBar(colors)}>
        <span>
          {searchActive ? (
            <>
              Showing{" "}
              <strong style={{ color: colors.heading }}>
                {filteredOrders.length}
              </strong>{" "}
              matching order
              {filteredOrders.length === 1 ? "" : "s"}
              {fullSet?.truncated && (
                <span style={{ color: colors.warning }}>
                  {" "}
                  · limited to first {EAGER_FETCH_PAGE_CAP * EAGER_FETCH_PAGE_SIZE}
                </span>
              )}
            </>
          ) : (
            <>
              Showing{" "}
              <strong style={{ color: colors.heading }}>
                {filteredOrders.length}
              </strong>{" "}
              of{" "}
              <strong style={{ color: colors.heading }}>
                {pagination.count}
              </strong>{" "}
              order{pagination.count === 1 ? "" : "s"}
            </>
          )}
          {(effectiveStatus !== "ALL" ||
            effectiveNetwork !== "ALL" ||
            effectiveDateFrom ||
            effectiveDateTo) && (
            <span style={{ color: colors.secondaryText }}>
              {" "}
              · filtered by server
            </span>
          )}
        </span>
      </div>

      
      {searchActive && fullSet?.truncated && (
        <div style={styles.hintBanner(colors)}>
          <Sparkles size={14} color={colors.warning} />
          <span style={{ flex: 1, fontSize: 12, color: colors.text }}>
            Search scanned the first {EAGER_FETCH_PAGE_CAP * EAGER_FETCH_PAGE_SIZE}{" "}
            orders. Narrow with a filter (status, date) to search more.
          </span>
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            style={styles.hintBtn(colors)}
          >
            Add filter
          </button>
        </div>
      )}

      
      {showSearchLoading ? (
        <div style={styles.loadingBox(colors)}>
          <div style={styles.spinner(colors)} />
          <span style={{ color: colors.secondaryText, fontSize: 13 }}>
            Searching all pages…
          </span>
        </div>
      ) : !isMobile ? (
        <DesktopTable
          orders={filteredOrders}
          colors={colors}
          isAdmin={isAdmin}
          isAgent={isAgent}
          isSubAgent={isSubAgent}
          showProfitCol={showProfitCol}
          trackedStatuses={trackedStatuses}
          trackingOrderId={trackingOrderId}
          retryingOrderId={retryingOrderId}
          onView={(o) => {
            setSelectedOrder(o);
            setShowDetailsModal(true);
          }}
          onCheckStatus={handleCheckStatus}
          onRetry={handleRetryOrder}
        />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredOrders.length === 0 ? (
            <EmptyState colors={colors} hasSearch={searchActive} />
          ) : (
            filteredOrders.map((order) => (
              <MobileCard
                key={order.id}
                order={order}
                colors={colors}
                isAdmin={isAdmin}
                isAgent={isAgent}
                isSubAgent={isSubAgent}
                displayStatus={trackedStatuses[order.id] || order.status}
                isTracking={trackingOrderId === order.id}
                isRetrying={retryingOrderId === order.id}
                onView={() => {
                  setSelectedOrder(order);
                  setShowDetailsModal(true);
                }}
                onCheckStatus={() => handleCheckStatus(order.id)}
                onRetry={() => handleRetryOrder(order.id)}
              />
            ))
          )}
        </div>
      )}

      
      {!searchActive && pagination.totalPages > 1 && (
        <Pagination
          colors={colors}
          page={pagination.page}
          totalPages={pagination.totalPages}
          pages={pageNumbers}
          onChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          isMobile={isMobile}
        />
      )}

      
      {showDetailsModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          colors={colors}
          isMobile={isMobile}
          isAdmin={isAdmin}
          isAgent={isAgent}
          isSubAgent={isSubAgent}
          isTracking={trackingOrderId === selectedOrder.id}
          isRetrying={retryingOrderId === selectedOrder.id}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          onCheckStatus={() => handleCheckStatus(selectedOrder.id)}
          onRetry={() => {
            handleRetryOrder(selectedOrder.id);
            setShowDetailsModal(false);
            setSelectedOrder(null);
          }}
          onPrint={() => showToast("Printing order…", "info")}
        />
      )}

      
      {showFilterModal && (
        <FilterModal
          colors={colors}
          isMobile={isMobile}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={setSelectedNetwork}
          onClear={() => {
            setSelectedStatus("ALL");
            setSelectedNetwork("ALL");
            setSearchInput("");
            setFullSet(null);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          onApply={() => {
            setShowFilterModal(false);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          onClose={() => setShowFilterModal(false)}
        />
      )}

      <style>{`@keyframes ol-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};


const DesktopTable = ({
  orders,
  colors,
  isAdmin,
  isAgent,
  isSubAgent,
  showProfitCol,
  trackedStatuses,
  trackingOrderId,
  retryingOrderId,
  onView,
  onCheckStatus,
  onRetry,
}) => {
  const cols = [
    "Order ID",
    "Customer",
    "Package",
    ...(isAdmin ? ["Agent"] : []),
    ...(isAdmin || isAgent ? ["Sub Agent"] : []),
    "Amount",
    ...(showProfitCol ? ["Profit"] : []),
    "Status",
    "Actions",
  ];

  
  const gridTemplate = isAdmin
    ? "100px 120px 120px 100px 100px 90px 90px 120px 100px"
    : isAgent
    ? "100px 120px 120px 100px 90px 90px 120px 100px"
    : isSubAgent
    ? "100px 120px 120px 90px 90px 120px 100px"
    : "100px 120px 120px 90px 90px 120px 100px";

  return (
    <div style={styles.tableWrap(colors)}>
      <div
        style={{
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate,
            padding: "10px 14px",
            backgroundColor: colors.mainBg,
            borderBottom: `1px solid ${colors.border}`,
            fontSize: 10,
            fontWeight: 600,
            color: colors.secondaryText,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            minWidth: 820,
          }}
        >
          {cols.map((c) => (
            <span
              key={c}
              style={{
                textAlign:
                  c === "Status" || c === "Actions" ? "center" : "left",
              }}
            >
              {c}
            </span>
          ))}
        </div>

        {orders.length === 0 ? (
          <div style={styles.tableEmpty(colors)}>
            <Package size={36} color={colors.secondaryText} />
            <p style={{ margin: "10px 0 0", fontSize: 13 }}>
              No orders found
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const displayStatus = trackedStatuses[order.id] || order.status;
            const statusColor = getStatusColor(displayStatus);
            const tracking = trackingOrderId === order.id;
            const retrying = retryingOrderId === order.id;
            return (
              <div
                key={order.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: gridTemplate,
                  padding: "10px 14px",
                  borderBottom: `1px solid ${colors.border}`,
                  alignItems: "center",
                  fontSize: 12,
                  transition: "background 0.2s",
                  minWidth: 820,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = colors.hoverBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span style={styles.orderId(colors)}>
                  {order.id?.slice(0, 8) || "N/A"}
                </span>
                <span style={styles.cell(colors)}>
                  <div style={{ fontWeight: 500 }}>
                    {order.customer?.username ||
                      order.customer_username ||
                      "N/A"}
                  </div>
                  {(order.customer?.phone_number ||
                    order.customer_phone) && (
                    <div style={styles.cellSub(colors)}>
                      {order.customer?.phone_number || order.customer_phone}
                    </div>
                  )}
                </span>
                <span style={styles.cell(colors)}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: getNetworkColor(
                        order.package?.network || order.package_name
                      ),
                    }}
                  >
                    {order.package?.network || order.package_name || "N/A"}
                  </div>
                  <div style={styles.cellSub(colors)}>
                    {order.package?.size_gb || order.package_size || ""} GB
                  </div>
                </span>
                {isAdmin && (
                  <span style={{ fontSize: 11, color: colors.text }}>
                    {order.agent?.username ||
                      order.agent_username ||
                      "N/A"}
                  </span>
                )}
                {(isAdmin || isAgent) && (
                  <span style={{ fontSize: 11, color: colors.text }}>
                    {order.sub_agent?.username ||
                      order.sub_agent_username ||
                      "N/A"}
                  </span>
                )}
                <span style={styles.amount(colors)}>
                  ₵{order.customer_price || "0.00"}
                </span>
                {showProfitCol && (
                  <span style={styles.profit}>
                    ₵
                    {isAdmin || isAgent
                      ? order.agent_profit || "0.00"
                      : order.sub_agent_profit || "0.00"}
                  </span>
                )}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {trackedStatuses[order.id] ? (
                    <span
                      style={{
                        ...styles.statusPill,
                        background: `${statusColor}20`,
                        color: statusColor,
                      }}
                    >
                      <StatusIcon status={displayStatus} size={12} />
                      {getStatusLabel(displayStatus)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCheckStatus(order.id)}
                      disabled={tracking}
                      style={styles.checkBtn(colors, tracking)}
                    >
                      {tracking ? (
                        <>
                          <Loader2
                            size={12}
                            style={{
                              animation: "ol-spin 1s linear infinite",
                            }}
                          />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RotateCw size={12} />
                          Check Status
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <IconBtn
                    colors={colors}
                    onClick={() => onView(order)}
                    ariaLabel="View order"
                  >
                    <Eye size={14} />
                  </IconBtn>
                  {isAdmin && canRetryOrder(order) && (
                    <button
                      type="button"
                      onClick={() => onRetry(order.id)}
                      disabled={retrying}
                      style={styles.retryBtn(retrying)}
                    >
                      {retrying ? (
                        <Loader2
                          size={12}
                          style={{
                            animation: "ol-spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <Repeat size={12} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};


const MobileCard = ({
  order,
  colors,
  isAdmin,
  isAgent,
  isSubAgent,
  displayStatus,
  isTracking,
  isRetrying,
  onView,
  onCheckStatus,
  onRetry,
}) => {
  const statusColor = getStatusColor(displayStatus);
  return (
    <div style={styles.mobileCard(colors)}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={styles.mobileOrderId(colors)}>
            #{order.id?.slice(0, 8) || "N/A"}
          </div>
          <div style={styles.mobileCustomer(colors)}>
            {order.customer?.username || order.customer_username || "N/A"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {isAdmin && canRetryOrder(order) && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              style={styles.mobileRetry(isRetrying)}
              aria-label="Retry"
            >
              {isRetrying ? (
                <Loader2
                  size={11}
                  style={{ animation: "ol-spin 1s linear infinite" }}
                />
              ) : (
                <Repeat size={11} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onCheckStatus}
            disabled={isTracking}
            style={{
              ...styles.mobileCheckBtn(statusColor),
              opacity: isTracking ? 0.6 : 1,
            }}
            aria-label="Check status"
          >
            {isTracking ? (
              <Loader2
                size={11}
                style={{ animation: "ol-spin 1s linear infinite" }}
              />
            ) : (
              <RotateCw size={11} />
            )}
            <span style={{ fontSize: 10 }}>
              {getStatusLabel(displayStatus)}
            </span>
          </button>
        </div>
      </div>
      <div style={styles.mobileGrid}>
        <div>
          <div style={styles.mobileLabel(colors)}>Package</div>
          <div
            style={{
              ...styles.mobileValue(colors),
              color: getNetworkColor(
                order.package?.network || order.package_name
              ),
              fontWeight: 700,
            }}
          >
            {order.package?.network || order.package_name || "N/A"}{" "}
            {order.package?.size_gb || order.package_size || ""}GB
          </div>
        </div>
        <div>
          <div style={styles.mobileLabel(colors)}>Amount</div>
          <div
            style={{
              ...styles.mobileValue(colors),
              color: colors.btnBg,
              fontWeight: 700,
            }}
          >
            ₵{order.customer_price || "0.00"}
          </div>
        </div>
        {(isAdmin || isAgent || isSubAgent) && (
          <div>
            <div style={styles.mobileLabel(colors)}>Profit</div>
            <div
              style={{
                ...styles.mobileValue(colors),
                color: "#10B981",
                fontWeight: 700,
              }}
            >
              ₵
              {isAdmin || isAgent
                ? order.agent_profit || "0.00"
                : order.sub_agent_profit || "0.00"}
            </div>
          </div>
        )}
        {isAdmin && (
          <div>
            <div style={styles.mobileLabel(colors)}>Agent</div>
            <div style={styles.mobileValue(colors)}>
              {order.agent?.username || order.agent_username || "—"}
            </div>
          </div>
        )}
        <div>
          <div style={styles.mobileLabel(colors)}>Date</div>
          <div style={styles.mobileValue(colors)}>
            {formatDate(order.created_at)}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onView}
        style={styles.mobileViewBtn(colors)}
      >
        <Eye size={14} /> View Details
      </button>
    </div>
  );
};


const Pagination = ({ colors, page, totalPages, pages, onChange, isMobile }) => (
  <div style={styles.paginationWrap(colors)}>
    <button
      type="button"
      onClick={() => onChange(1)}
      disabled={page === 1}
      style={styles.pgIconBtn(colors, page === 1)}
      aria-label="First"
    >
      <ChevronsLeft size={14} />
    </button>
    <button
      type="button"
      onClick={() => onChange(Math.max(1, page - 1))}
      disabled={page === 1}
      style={styles.pgIconBtn(colors, page === 1)}
      aria-label="Previous"
    >
      <ChevronLeft size={14} />
    </button>
    {!isMobile ? (
      pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} style={styles.pgEllipsis(colors)}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            style={styles.pgNumBtn(colors, p === page)}
          >
            {p}
          </button>
        )
      )
    ) : (
      <span style={styles.pgMobileLabel(colors)}>
        Page <strong style={{ color: colors.heading }}>{page}</strong> of{" "}
        {totalPages}
      </span>
    )}
    <button
      type="button"
      onClick={() => onChange(Math.min(totalPages, page + 1))}
      disabled={page === totalPages}
      style={styles.pgIconBtn(colors, page === totalPages)}
      aria-label="Next"
    >
      <ChevronRight size={14} />
    </button>
    <button
      type="button"
      onClick={() => onChange(totalPages)}
      disabled={page === totalPages}
      style={styles.pgIconBtn(colors, page === totalPages)}
      aria-label="Last"
    >
      <ChevronsRight size={14} />
    </button>
  </div>
);


const WeeklyChart = ({ colors, weeklyData }) => {
  const data = weeklyData?.data || [];
  const maxValue = Math.max(...data.map((d) => parseFloat(d.revenue || 0)), 1);
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", height: 100, gap: 4 }}
    >
      {data.map((item, i) => {
        const value = parseFloat(item.revenue || 0);
        const pct = (value / maxValue) * 100;
        const height = Math.max(pct, 3);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              height: "100%",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 26,
                height: `${height}%`,
                minHeight: 3,
                background: `linear-gradient(180deg, ${colors.btnBg}, ${colors.btnBg}88)`,
                borderRadius: "3px 3px 0 0",
                position: "relative",
              }}
            >
              {value > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 8,
                    fontWeight: 700,
                    color: colors.btnBg,
                    opacity: 0.85,
                    whiteSpace: "nowrap",
                  }}
                >
                  ₵{value.toFixed(0)}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 8,
                color: colors.secondaryText,
                fontWeight: 500,
              }}
            >
              {item.day}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const StatusBreakdown = ({ colors, statusBreakdown, isMobile }) => {
  const entries = Object.entries(statusBreakdown);
  const total = entries.reduce((s, [, d]) => s + (d.count || 0), 0);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr 1fr"
          : "repeat(auto-fit, minmax(80px, 1fr))",
        gap: 6,
      }}
    >
      {entries.map(([status, d]) => {
        const count = d.count || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const color = getStatusColor(status);
        return (
          <div key={status} style={styles.breakdownCell(colors)}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color,
                textTransform: "capitalize",
              }}
            >
              {getStatusLabel(status)}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: colors.heading,
              }}
            >
              {count}
            </div>
            <div style={{ fontSize: 8, color: colors.secondaryText }}>
              {pct.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};


const OrderDetailModal = ({
  order,
  colors,
  isMobile,
  isAdmin,
  isAgent,
  isSubAgent,
  isTracking,
  isRetrying,
  onClose,
  onCheckStatus,
  onRetry,
  onPrint,
}) => {
  const statusColor = getStatusColor(order.status);
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={styles.modalOverlay(colors)}
    >
      <div style={styles.modalCard(colors)}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle(colors)}>Order Details</h3>
          <button
            type="button"
            onClick={onClose}
            style={styles.modalClose(colors)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div style={styles.modalTop(colors)}>
          <div>
            <div style={styles.modalLabel(colors)}>Order ID</div>
            <div style={styles.modalId(colors)}>{order.id}</div>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: statusColor,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <StatusIcon status={order.status} size={13} />
            {getStatusLabel(order.status)}
          </span>
        </div>
        <div style={styles.modalGrid}>
          <ModalField
            colors={colors}
            label="Customer"
            value={
              [order.customer?.first_name, order.customer?.last_name]
                .filter(Boolean)
                .join(" ") ||
              order.customer?.username ||
              "N/A"
            }
            sub={order.customer?.phone_number}
          />
          <ModalField
            colors={colors}
            label="Package"
            value={`${order.package?.network || order.package_name || "N/A"} ${
              order.package?.size_gb || order.package_size || ""
            }GB`}
            tone={getNetworkColor(
              order.package?.network || order.package_name
            )}
          />
          <ModalField
            colors={colors}
            label="Recipient"
            value={order.recipient?.name || "N/A"}
            sub={order.recipient?.phone_number}
          />
          <ModalField
            colors={colors}
            label="Amount"
            value={`₵${order.customer_price || "0.00"}`}
            tone={colors.btnBg}
            large
          />
        </div>
        {(isAdmin || isAgent) && (
          <div style={styles.modalSection(colors)}>
            <ModalField
              colors={colors}
              label="Agent"
              value={order.agent?.shop_name || order.agent?.username || "—"}
            />
            <ModalField
              colors={colors}
              label="Sub-agent"
              value={
                order.sub_agent?.shop_name ||
                order.sub_agent?.username ||
                "—"
              }
            />
            <ModalField
              colors={colors}
              label="Agent Profit"
              value={`₵${order.agent_profit || "0.00"}`}
              tone="#10B981"
            />
            <ModalField
              colors={colors}
              label="Sub Agent Profit"
              value={`₵${order.sub_agent_profit || "0.00"}`}
              tone="#10B981"
            />
          </div>
        )}
        {isSubAgent && (
          <div style={styles.modalSection(colors)}>
            <ModalField
              colors={colors}
              label="Agent"
              value={order.agent?.shop_name || order.agent?.username || "—"}
            />
            <ModalField
              colors={colors}
              label="Your Profit"
              value={`₵${order.sub_agent_profit || "0.00"}`}
              tone="#10B981"
            />
          </div>
        )}
        <div style={styles.modalFooterInfo(colors)}>
          <span>Created: {formatDate(order.created_at)}</span>
          {order.delivered_at && (
            <span>Delivered: {formatDate(order.delivered_at)}</span>
          )}
        </div>
        {order.provider_status && (
          <div style={styles.providerRow(colors)}>
            <strong>Provider Status:</strong> {order.provider_status}
            {order.provider_reference && (
              <span style={{ marginLeft: 10 }}>
                <strong>Ref:</strong> {order.provider_reference}
              </span>
            )}
          </div>
        )}
        {order.failure_reason && (
          <div style={styles.failureRow}>
            <AlertCircle size={15} />
            {order.failure_reason}
          </div>
        )}
        <div style={styles.modalActions}>
          <button
            type="button"
            onClick={onClose}
            style={styles.modalSecondary(colors)}
          >
            Close
          </button>
          {isAdmin && canRetryOrder(order) && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              style={styles.modalDanger(isRetrying)}
            >
              {isRetrying ? (
                <Loader2
                  size={14}
                  style={{ animation: "ol-spin 1s linear infinite" }}
                />
              ) : (
                <Repeat size={14} />
              )}
              {isRetrying ? "Retrying…" : "Retry"}
            </button>
          )}
          <button
            type="button"
            onClick={onCheckStatus}
            disabled={isTracking}
            style={styles.modalPrimary(colors, isTracking)}
          >
            {isTracking ? (
              <Loader2
                size={14}
                style={{ animation: "ol-spin 1s linear infinite" }}
              />
            ) : (
              <RotateCw size={14} />
            )}
            {isTracking ? "Checking…" : "Refresh Status"}
          </button>
          <button
            type="button"
            onClick={onPrint}
            style={styles.modalGhost(colors)}
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalField = ({ colors, label, value, sub, tone, large }) => (
  <div>
    <div style={styles.modalLabel(colors)}>{label}</div>
    <div
      style={{
        fontSize: large ? 18 : 14,
        fontWeight: 600,
        color: tone || colors.text,
        marginTop: 2,
      }}
    >
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 12, color: colors.secondaryText, marginTop: 2 }}>
        {sub}
      </div>
    )}
  </div>
);

const FilterModal = ({
  colors,
  isMobile,
  selectedStatus,
  setSelectedStatus,
  selectedNetwork,
  setSelectedNetwork,
  onClear,
  onApply,
  onClose,
}) => (
  <div
    onClick={(e) => e.target === e.currentTarget && onClose()}
    style={styles.modalOverlay(colors)}
  >
    <div style={{ ...styles.modalCard(colors), maxWidth: 420 }}>
      <div style={styles.modalHeader}>
        <h3 style={styles.modalTitle(colors)}>
          <SlidersHorizontal
            size={isMobile ? 18 : 20}
            style={{ marginRight: 6 }}
          />
          Filter Orders
        </h3>
        <button
          type="button"
          onClick={onClose}
          style={styles.modalClose(colors)}
        >
          <X size={20} />
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={styles.filterGroupLabel(colors)}>Status</div>
        <div style={styles.chipRow}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedStatus(s)}
              style={styles.filterChip(colors, selectedStatus === s)}
            >
              {s === "ALL" ? "All" : getStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={styles.filterGroupLabel(colors)}>Network</div>
        <div style={styles.chipRow}>
          {NETWORK_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSelectedNetwork(n)}
              style={styles.filterChip(colors, selectedNetwork === n)}
            >
              {n === "ALL" ? "All" : n}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.modalActions}>
        <button
          type="button"
          onClick={onClear}
          style={styles.modalSecondary(colors)}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApply}
          style={styles.modalPrimary(colors, false)}
        >
          Apply
        </button>
      </div>
    </div>
  </div>
);


const StatCard = ({ label, value, icon, color, colors }) => (
  <div
    style={styles.statCard(colors)}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    <div>
      <div style={styles.statLabel(colors)}>{label}</div>
      <div style={styles.statValue(colors)}>{value}</div>
    </div>
    <span style={{ color, opacity: 0.6 }}>{icon}</span>
  </div>
);

const IconBtn = ({ colors, children, onClick, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    style={styles.iconBtn(colors)}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = colors.btnBg;
      e.currentTarget.style.color = colors.btnText;
      e.currentTarget.style.borderColor = colors.btnBg;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
      e.currentTarget.style.color = colors.secondaryText;
      e.currentTarget.style.borderColor = colors.border;
    }}
  >
    {children}
  </button>
);

const EmptyState = ({ colors, hasSearch }) => (
  <div style={styles.emptyState(colors)}>
    <Package size={32} color={colors.secondaryText} />
    <p style={{ margin: "10px 0 0", fontSize: 13 }}>
      {hasSearch ? "No matches found" : "No orders found"}
    </p>
  </div>
);


const styles = {
  pageWrap: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 12px 24px",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  h1: (c, m) => ({
    fontSize: m ? "clamp(20px, 5vw, 24px)" : "clamp(22px, 3vw, 32px)",
    fontWeight: 700,
    color: c.heading,
    margin: "0 0 2px 0",
    display: "flex",
    alignItems: "center",
    gap: 10,
  }),
  subtitle: (c, m) => ({
    color: c.secondaryText,
    margin: 0,
    fontSize: m ? 13 : 14,
  }),
  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  ghostBtn: (c, busy) => ({
    padding: "10px 16px",
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    backgroundColor: c.raisedBg,
    color: c.text,
    cursor: busy ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    opacity: busy ? 0.7 : 1,
    fontFamily: "inherit",
  }),
  analyticsGrid: (m) => ({
    display: "grid",
    gridTemplateColumns: m ? "1fr" : "1.5fr 1fr",
    gap: 14,
    marginBottom: 16,
  }),
  card: (c) => ({
    backgroundColor: c.raisedBg,
    borderRadius: 12,
    padding: "14px 16px",
    border: `1px solid ${c.border}`,
  }),
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 4,
  },
  cardTitle: (c) => ({
    fontWeight: 600,
    fontSize: 13,
    color: c.heading,
  }),
  cardMeta: (c) => ({
    display: "flex",
    gap: 10,
    fontSize: 10,
    color: c.secondaryText,
  }),
  chartFooter: (c) => ({
    display: "flex",
    justifyContent: "space-between",
    marginTop: 6,
    fontSize: 9,
    color: c.secondaryText,
  }),
  breakdownCell: (c) => ({
    padding: "6px 8px",
    borderRadius: 8,
    backgroundColor: c.mainBg,
    border: `1px solid ${c.border}`,
    textAlign: "center",
  }),
  statGrid: (m) => ({
    display: "grid",
    gridTemplateColumns: m
      ? "1fr 1fr"
      : "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8,
    marginBottom: 16,
    width: "100%",
    boxSizing: "border-box",
  }),
  statCard: (c) => ({
    backgroundColor: c.raisedBg,
    borderRadius: 10,
    padding: "10px 12px",
    border: `1px solid ${c.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transition: "all 0.2s ease",
  }),
  statLabel: (c) => ({
    fontSize: 9,
    color: c.secondaryText,
    fontWeight: 500,
  }),
  statValue: (c) => ({
    fontSize: 16,
    fontWeight: 700,
    color: c.heading,
  }),
  toolbar: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    alignItems: "center",
    flexWrap: "wrap",
    width: "100%",
    boxSizing: "border-box",
  },
  searchWrap: { flex: 1, position: "relative", minWidth: 200 },
  searchIcon: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  searchInput: (c, active) => ({
    width: "100%",
    padding: "10px 40px 10px 40px",
    borderRadius: 10,
    border: `1.5px solid ${active ? c.btnBg : c.border}`,
    backgroundColor: c.raisedBg,
    color: c.text,
    fontSize: 14,
    outline: "none",
    transition: "all 0.2s",
    boxSizing: "border-box",
    minHeight: 44,
    fontFamily: "inherit",
    boxShadow: active ? `0 0 0 3px ${c.btnBg}20` : "none",
  }),
  searchClear: (c) => ({
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: c.secondaryText,
    cursor: "pointer",
    padding: 4,
    borderRadius: 6,
  }),
  filterBtn: (c, active) => ({
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "10px 16px",
    borderRadius: 10,
    border: `1.5px solid ${active ? c.btnBg : c.border}`,
    backgroundColor: active ? c.btnBg : c.raisedBg,
    color: active ? c.btnText : c.text,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s",
    minHeight: 44,
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  }),
  filterCount: {
    marginLeft: 2,
    padding: "0 6px",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    fontSize: 12,
  },
  clearBtn: (c) => ({
    fontSize: 13,
    color: c.btnBg,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: 500,
    padding: "4px 8px",
    borderRadius: 4,
    fontFamily: "inherit",
  }),
  resultBar: (c) => ({
    fontSize: 13,
    color: c.secondaryText,
    padding: "4px 0 10px",
  }),
  hintBanner: (c) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 10,
    background: c.warningBg,
    border: `1px solid ${c.warning}55`,
    marginBottom: 12,
  }),
  hintBtn: (c) => ({
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    background: c.warning,
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  }),
  tableWrap: (c) => ({
    backgroundColor: c.raisedBg,
    borderRadius: 12,
    border: `1px solid ${c.border}`,
    overflow: "hidden",
    width: "100%",
    boxSizing: "border-box",
  }),
  tableEmpty: (c) => ({
    padding: "40px 20px",
    textAlign: "center",
    color: c.secondaryText,
  }),
  orderId: (c) => ({
    fontWeight: 600,
    color: c.heading,
    fontSize: 11,
  }),
  cell: (c) => ({
    color: c.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  cellSub: (c) => ({
    fontSize: 10,
    color: c.secondaryText,
    marginTop: 2,
  }),
  amount: (c) => ({
    fontWeight: 600,
    color: c.btnBg,
    fontSize: 13,
  }),
  profit: {
    fontWeight: 600,
    color: "#10B981",
    fontSize: 13,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  checkBtn: (c, busy) => ({
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 12px",
    borderRadius: 6,
    border: `1px solid ${c.btnBg}`,
    backgroundColor: "transparent",
    color: c.btnBg,
    cursor: busy ? "not-allowed" : "pointer",
    fontSize: 11,
    fontWeight: 500,
    transition: "all 0.2s",
    opacity: busy ? 0.6 : 1,
    fontFamily: "inherit",
  }),
  iconBtn: (c) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 8px",
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    backgroundColor: "transparent",
    color: c.secondaryText,
    cursor: "pointer",
    transition: "all 0.2s",
  }),
  retryBtn: (busy) => ({
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #EF4444",
    backgroundColor: "transparent",
    color: "#EF4444",
    cursor: busy ? "not-allowed" : "pointer",
    fontSize: 10,
    fontWeight: 500,
    transition: "all 0.2s",
    opacity: busy ? 0.6 : 1,
    fontFamily: "inherit",
  }),
  mobileCard: (c) => ({
    backgroundColor: c.raisedBg,
    borderRadius: 12,
    padding: "14px 14px",
    border: `1px solid ${c.border}`,
    width: "100%",
    boxSizing: "border-box",
  }),
  mobileOrderId: (c) => ({
    fontSize: 13,
    fontWeight: 600,
    color: c.heading,
  }),
  mobileCustomer: (c) => ({
    fontSize: 12,
    color: c.secondaryText,
  }),
  mobileCheckBtn: (color) => ({
    display: "flex",
    alignItems: "center",
    gap: 3,
    padding: "3px 8px",
    borderRadius: 4,
    border: `1px solid ${color}`,
    backgroundColor: `${color}18`,
    color,
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "inherit",
  }),
  mobileRetry: (busy) => ({
    display: "flex",
    alignItems: "center",
    gap: 3,
    padding: "3px 8px",
    borderRadius: 4,
    border: "1px solid #EF4444",
    backgroundColor: "transparent",
    color: "#EF4444",
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1,
    fontFamily: "inherit",
  }),
  mobileGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px 12px",
    marginBottom: 8,
  },
  mobileLabel: (c) => ({
    fontSize: 9,
    color: c.secondaryText,
    textTransform: "uppercase",
  }),
  mobileValue: (c) => ({
    fontSize: 13,
    color: c.text,
  }),
  mobileViewBtn: (c) => ({
    width: "100%",
    padding: "8px",
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    backgroundColor: "transparent",
    color: c.secondaryText,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 13,
    transition: "all 0.2s",
    marginTop: 4,
    minHeight: 40,
    fontFamily: "inherit",
  }),
  paginationWrap: (c) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingTop: 16,
    borderTop: `1px solid ${c.border}`,
    flexWrap: "wrap",
  }),
  pgIconBtn: (c, disabled) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    backgroundColor: c.raisedBg,
    color: disabled ? c.border : c.text,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  }),
  pgNumBtn: (c, active) => ({
    minWidth: 32,
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${active ? c.btnBg : c.border}`,
    backgroundColor: active ? c.btnBg : c.raisedBg,
    color: active ? c.btnText : c.text,
    fontSize: 12.5,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  pgEllipsis: (c) => ({
    minWidth: 24,
    textAlign: "center",
    color: c.secondaryText,
    fontSize: 12,
  }),
  pgMobileLabel: (c) => ({
    fontSize: 12,
    color: c.secondaryText,
    padding: "0 10px",
  }),
  modalOverlay: (c) => ({
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
    boxSizing: "border-box",
  }),
  modalCard: (c) => ({
    backgroundColor: c.raisedBg,
    borderRadius: 16,
    maxWidth: 520,
    width: "100%",
    padding: 24,
    boxShadow: `0 20px 60px ${c.shadow}`,
    maxHeight: "90vh",
    overflow: "auto",
    boxSizing: "border-box",
  }),
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: (c) => ({
    fontSize: 18,
    fontWeight: 700,
    color: c.heading,
    margin: 0,
  }),
  modalClose: (c) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    color: c.secondaryText,
    padding: 4,
    borderRadius: 4,
  }),
  modalTop: (c) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: c.mainBg,
    borderRadius: 10,
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 6,
  }),
  modalLabel: (c) => ({
    fontSize: 10,
    color: c.secondaryText,
    textTransform: "uppercase",
  }),
  modalId: (c) => ({
    fontWeight: 600,
    color: c.heading,
    fontSize: 14,
  }),
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  modalSection: (c) => ({
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${c.border}`,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  }),
  modalFooterInfo: (c) => ({
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${c.border}`,
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: c.secondaryText,
    flexWrap: "wrap",
    gap: 4,
  }),
  providerRow: (c) => ({
    marginTop: 8,
    padding: "8px 12px",
    borderRadius: 6,
    backgroundColor: c.mainBg,
    border: `1px solid ${c.border}`,
    fontSize: 12,
    color: c.secondaryText,
  }),
  failureRow: {
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 8,
    backgroundColor: "#EF444420",
    color: "#EF4444",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    marginTop: 18,
    borderTop: "1px solid transparent",
    paddingTop: 18,
    flexWrap: "wrap",
  },
  modalSecondary: (c) => ({
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    border: `1.5px solid ${c.border}`,
    backgroundColor: "transparent",
    color: c.text,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
    minWidth: 100,
    fontFamily: "inherit",
  }),
  modalDanger: (busy) => ({
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#EF4444",
    color: "#fff",
    cursor: busy ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: busy ? 0.7 : 1,
    minWidth: 100,
    fontFamily: "inherit",
  }),
  modalPrimary: (c, busy) => ({
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    border: "none",
    backgroundColor: c.btnBg,
    color: c.btnText,
    cursor: busy ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: busy ? 0.7 : 1,
    minWidth: 100,
    fontFamily: "inherit",
  }),
  modalGhost: (c) => ({
    flex: 1,
    padding: "10px",
    borderRadius: 10,
    border: "none",
    backgroundColor: c.secondaryText,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 100,
    fontFamily: "inherit",
  }),
  filterGroupLabel: (c) => ({
    fontSize: 13,
    fontWeight: 600,
    color: c.text,
    marginBottom: 6,
  }),
  chipRow: { display: "flex", gap: 4, flexWrap: "wrap" },
  filterChip: (c, active) => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: `2px solid ${active ? c.btnBg : c.border}`,
    backgroundColor: active ? c.btnBg : "transparent",
    color: active ? c.btnText : c.text,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    transition: "all 0.2s",
    fontFamily: "inherit",
  }),
  loadingBox: (c) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 400,
    flexDirection: "column",
    gap: 16,
  }),
  spinner: (c) => ({
    width: 40,
    height: 40,
    border: `3px solid ${c.border}`,
    borderTop: `3px solid ${c.btnBg}`,
    borderRadius: "50%",
    animation: "ol-spin 1s linear infinite",
  }),
  emptyState: (c) => ({
    padding: 40,
    textAlign: "center",
    color: c.secondaryText,
    borderRadius: 12,
    border: `1px solid ${c.border}`,
    background: c.raisedBg,
  }),
};

export default OrdersList;

