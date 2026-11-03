


import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { useNavigate } from "react-router-dom";
import { STOREFRONT_DOMAIN } from "../../config";
import { Wallet, TrendingUp, Users, Edit2, Save, X, Package, Clock, CheckCircle, RefreshCw, Search, AlertCircle, Info, ChevronDown, ChevronUp, BarChart3, Activity, Zap, ShoppingBag, UserPlus, ChevronRight, Coins, Trash2, BadgeDollarSign } from "lucide-react";


const PRICE_SOURCE_KEYS = {
  admin_custom: { label: "Admin Special", tone: "info" },
  agent_custom: { label: "Your Price", tone: "success" },
  agent_sub_custom: { label: "Sub-Agent Custom", tone: "warning" },
  sub_agent_custom: { label: "Sub-Agent Price", tone: "purple" },
  agent_base: { label: "Agent Base", tone: "warning" },
  base: { label: "Base Price", tone: "muted" },
};

const NETWORK_KEYS = {
  MTN: { label: "MTN", dot: "#F5B700" },
  Telecel: { label: "Telecel", dot: "#E11D48" },
  AirtelTigo: { label: "AirtelTigo", dot: "#2563EB" },
  AT_BIGTIME: { label: "AT BigTime", dot: "#2563EB" },
  MTN_EXPRESS: { label: "MTN Express", dot: "#F5B700" },
};

const getNetworkMeta = (network) =>
  NETWORK_KEYS[network] || { label: network || "Unknown", dot: "#6B7280" };

const getToneColors = (colors, tone) => {
  const map = {
    success: { fg: colors.success, bg: colors.successBg },
    warning: { fg: colors.warning, bg: colors.warningBg },
    error: { fg: colors.error, bg: colors.errorBg },
    info: { fg: colors.linkColor, bg: colors.hoverBg },
    purple: { fg: colors.linkColor, bg: colors.hoverBg },
    muted: { fg: colors.secondaryText, bg: colors.hoverBg },
  };
  return map[tone] || map.muted;
};

const readApiError = (data, fallback = "Request failed") => {
  if (!data) return fallback;
  if (data.message) return data.message;
  const errs = data.errors;
  if (errs) {
    const flat = Object.values(errs).flat().filter(Boolean);
    if (flat.length) return flat.join(" ");
  }
  return fallback;
};

const formatDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};


export default function AgentDashboard() {
  const { colors } = useTheme();
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [packages, setPackages] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("ALL");
  const [expandedPackages, setExpandedPackages] = useState({});
  const [activeChartTab, setActiveChartTab] = useState("revenue");
  const [animating, setAnimating] = useState(false);

  const [subAgentFee, setSubAgentFee] = useState(null);
  const [editingFee, setEditingFee] = useState(false);
  const [feeInput, setFeeInput] = useState("");
  const [savingFee, setSavingFee] = useState(false);
  const [resettingFee, setResettingFee] = useState(false);

  const [editingPackage, setEditingPackage] = useState(null);
  const [editingType, setEditingType] = useState("customer");
  const [priceInput, setPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const chartAnimTimer = useRef(null);

  const isMobile = width <= 768;

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchSubAgentFee = useCallback(async () => {
    try {
      const res = await authFetch("/accounts/agent/sub-agent-fee/");
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setSubAgentFee(data.data);
        setFeeInput(data.data?.current_fee || "");
      }
    } catch (err) {
      console.error("fetchSubAgentFee:", err);
    }
  }, [authFetch]);

  const fetchDashboardData = useCallback(
    async ({ silent } = {}) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setAnimating(false);
      if (chartAnimTimer.current) clearTimeout(chartAnimTimer.current);

      try {
        const [profileRes, statsRes, pkgRes] = await Promise.all([
          authFetch("/accounts/user/me/"),
          authFetch("/accounts/dashboard/stats/"),
          authFetch("/data/packages/"),
        ]);
        const [profile, stats, pkgData] = await Promise.all([
          profileRes.json(),
          statsRes.json(),
          pkgRes.json(),
        ]);

        if (profileRes.ok && profile.status === "success") {
          setWalletBalance(parseFloat(profile.data.wallet?.balance || 0));
        }
        if (statsRes.ok && stats.status === "success") {
          setDashboardData(stats.data);
        }
        if (pkgRes.ok && pkgData.status === "success") {
          setPackages(
            (pkgData.data || []).map((p) => ({
              id: p.id,
              network: p.network,
              size: `${p.size_gb}GB`,
              sizeGb: parseFloat(p.size_gb || 0),
              basePriceCustomer: parseFloat(p.base_price_customer || 0),
              basePriceAgent: parseFloat(p.base_price_agent || 0),
              effectivePrice: parseFloat(
                p.effective_price ||
                  p.base_price_agent ||
                  p.base_price_customer ||
                  0
              ),
              priceSource: p.price_source || "base",
              agentCustomerPrice: p.agent_customer_price
                ? parseFloat(p.agent_customer_price)
                : null,
              agentSubBasePrice: p.agent_sub_base_price
                ? parseFloat(p.agent_sub_base_price)
                : null,
              agentSubCustomPrices: p.agent_sub_custom_prices || {},
              isActive: p.is_active,
              salesCount: p.sales_count || 0,
            }))
          );
        }

        await fetchSubAgentFee();
      } catch (err) {
        console.error("fetchDashboardData:", err);
        showToast("Failed to load dashboard data", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch, fetchSubAgentFee, showToast]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (dashboardData) {
      chartAnimTimer.current = setTimeout(() => setAnimating(true), 250);
    }
    return () => {
      if (chartAnimTimer.current) clearTimeout(chartAnimTimer.current);
    };
  }, [dashboardData]);

  const handleSaveFee = async () => {
    const fee = parseFloat(feeInput);
    if (isNaN(fee) || fee <= 0) {
      showToast("Enter a valid positive number", "error");
      return;
    }
    if (subAgentFee?.base_fee && fee < parseFloat(subAgentFee.base_fee)) {
      showToast(
        `Fee cannot be below base (₵${subAgentFee.base_fee})`,
        "error"
      );
      return;
    }
    setSavingFee(true);
    try {
      const method = subAgentFee?.is_custom ? "PATCH" : "PUT";
      const res = await authFetch("/accounts/agent/sub-agent-fee/", {
        method,
        body: JSON.stringify({ fee: fee.toFixed(2) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(readApiError(data, "Failed to update fee"));
      showToast(data.message || "Fee updated", "success");
      setSubAgentFee(data.data);
      setEditingFee(false);
      fetchDashboardData({ silent: true });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSavingFee(false);
    }
  };

  const handleResetFee = async () => {
    if (!window.confirm("Reset to base fee?")) return;
    setResettingFee(true);
    try {
      const res = await authFetch(
        "/accounts/agent/sub-agent-fee/reset/",
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(readApiError(data, "Failed to reset"));
      showToast(data.message || "Custom fee removed", "success");
      await fetchSubAgentFee();
      fetchDashboardData({ silent: true });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setResettingFee(false);
    }
  };

  const openPriceModal = (pkg, type) => {
    setEditingPackage(pkg);
    setEditingType(type);
    setPriceInput(
      type === "customer"
        ? String(pkg.agentCustomerPrice || pkg.effectivePrice || pkg.basePriceAgent)
        : String(pkg.agentSubBasePrice || pkg.basePriceAgent)
    );
  };

  const closePriceModal = () => {
    setEditingPackage(null);
    setPriceInput("");
    setEditingType("customer");
  };

  const savePrice = async () => {
    if (!editingPackage) return;
    const value = Number(priceInput);
    if (!priceInput || isNaN(value) || value <= 0) {
      showToast("Enter a valid price", "error");
      return;
    }
    if (value < editingPackage.basePriceAgent) {
      showToast(
        `Price cannot be below base (₵${editingPackage.basePriceAgent.toFixed(2)})`,
        "error"
      );
      return;
    }

    setSubmitting(true);
    try {
      const priceType =
        editingType === "customer"
          ? "AGENT_CUSTOMER_PRICE"
          : "AGENT_SUB_BASE_PRICE";
      const isEditing =
        editingType === "customer"
          ? editingPackage.agentCustomerPrice !== null
          : editingPackage.agentSubBasePrice !== null;

      let res;
      if (isEditing) {
        const listRes = await authFetch(
          `/data/pricing/?package=${editingPackage.id}&user=${user.id}`
        );
        const listData = await listRes.json();
        const existing =
          listRes.ok && listData.status === "success"
            ? (listData.data || [])[0]
            : null;

        if (existing) {
          res = await authFetch(`/data/pricing/${existing.id}/`, {
            method: "PATCH",
            body: JSON.stringify({
              price: priceInput,
              notes: `Updated ${editingType} price for ${editingPackage.network} ${editingPackage.size}`,
            }),
          });
        }
      }
      if (!res) {
        res = await authFetch("/data/pricing/create/", {
          method: "POST",
          body: JSON.stringify({
            package: editingPackage.id,
            user: user.id,
            price_type: priceType,
            price: priceInput,
            notes: `${editingType === "customer" ? "Customer" : "Sub-Agent"} price for ${editingPackage.network} ${editingPackage.size}`,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(readApiError(data, "Failed to save price"));
      showToast("Price saved", "success");
      closePriceModal();
      fetchDashboardData({ silent: true });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const agentStats = dashboardData?.agent || {};
  const totalRevenue = parseFloat(agentStats.total_revenue || 0);
  const totalProfit = parseFloat(agentStats.total_profit || 0);
  const totalOrders = agentStats.total_orders || 0;
  const totalSubAgents = agentStats.total_sub_agents || 0;
  const pendingOrders = dashboardData?.pending_orders || 0;
  const completedOrders = agentStats.completed_orders || 0;
  const shopName = agentStats.shop_name || "My Store";
  const storeUrl = agentStats.store_url || "";

  const chartData = useMemo(() => {
    const weekly = dashboardData?.agent?.weekly;
    if (!weekly) return null;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const pick = (series) =>
      days.map((day) => {
        const hit = series?.find((r) => r.day === day);
        return hit ? hit.value : 0;
      });
    return {
      labels: days,
      revenue: pick(weekly.revenue),
      profit: pick(weekly.profit),
      orders: pick(weekly.orders),
      summary: weekly.summary || {},
    };
  }, [dashboardData]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((p) => {
      if (!p.isActive) return false;
      if (selectedNetwork !== "ALL" && p.network !== selectedNetwork)
        return false;
      if (q && !`${p.network} ${p.size}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [packages, selectedNetwork, searchQuery]);

  if (loading) {
    return (
      <div style={styles.loadingWrap(colors)}>
        <div style={styles.spinner(colors)} />
        <span style={{ fontSize: 13, color: colors.secondaryText }}>
          Loading dashboard…
        </span>
      </div>
    );
  }

  return (
    <div style={styles.pageWrap}>
      
      <header style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.h1(colors)}>
            <Activity size={isMobile ? 20 : 22} color={colors.btnBg} />
            Agent dashboard
          </h1>
          <p style={styles.subtitle(colors)}>
            Welcome back, {user?.first_name || user?.username || "Agent"}
            {shopName ? ` · ${shopName}` : ""}
            {storeUrl ? ` · ${storeUrl}.${STOREFRONT_DOMAIN}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchDashboardData({ silent: true })}
          disabled={refreshing}
          style={styles.ghostBtn(colors)}
        >
          <RefreshCw
            size={14}
            style={{
              animation: refreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          {!isMobile && (refreshing ? "Refreshing…" : "Refresh")}
        </button>
      </header>

      
      <section style={styles.statGrid}>
        <StatCard
          icon={TrendingUp}
          label="Revenue"
          value={`₵${totalRevenue.toFixed(2)}`}
          change="All time"
          color={colors.btnBg}
          colors={colors}
        />
        <StatCard
          icon={BadgeDollarSign}
          label="Profit"
          value={`₵${totalProfit.toFixed(2)}`}
          change="All time"
          color={colors.success}
          colors={colors}
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders"
          value={totalOrders}
          change={`${pendingOrders} pending`}
          color={colors.warning}
          colors={colors}
        />
        <StatCard
          icon={Users}
          label="Sub-agents"
          value={totalSubAgents}
          change="Active"
          color={colors.linkColor}
          colors={colors}
        />
      </section>

      
      {subAgentFee && (
        <FeeCard
          fee={subAgentFee}
          editing={editingFee}
          feeInput={feeInput}
          setFeeInput={setFeeInput}
          saving={savingFee}
          resetting={resettingFee}
          onEdit={() => {
            setEditingFee(true);
            setFeeInput(subAgentFee?.current_fee || "");
          }}
          onCancel={() => {
            setEditingFee(false);
            setFeeInput(subAgentFee?.current_fee || "");
          }}
          onSave={handleSaveFee}
          onReset={handleResetFee}
          colors={colors}
          isMobile={isMobile}
        />
      )}

      
      <section style={styles.miniStatGrid}>
        <MiniStat
          icon={Wallet}
          label="Wallet"
          value={`₵${walletBalance.toFixed(2)}`}
          color={colors.linkColor}
          colors={colors}
        />
        <MiniStat
          icon={CheckCircle}
          label="Completed"
          value={completedOrders}
          color={colors.success}
          colors={colors}
        />
        <MiniStat
          icon={UserPlus}
          label="Sub sales"
          value={agentStats.transactions_from_shop || 0}
          color={colors.linkColor}
          colors={colors}
        />
        <MiniStat
          icon={BarChart3}
          label="Revenue"
          value={`₵${totalRevenue.toFixed(2)}`}
          color={colors.btnBg}
          colors={colors}
        />
      </section>

      
      {chartData && (
        <Card colors={colors}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleRow}>
              <BarChart3 size={16} color={colors.btnBg} />
              <span style={styles.cardTitle(colors)}>Performance</span>
              <span style={styles.cardSubtitle(colors)}>Last 7 days</span>
            </div>
            <div style={styles.segmented(colors)}>
              {["revenue", "profit", "orders"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveChartTab(tab)}
                  style={styles.segmentBtn(colors, activeChartTab === tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <WeeklyChart
            data={chartData}
            activeTab={activeChartTab}
            animating={animating}
            colors={colors}
            isMobile={isMobile}
          />
        </Card>
      )}

      
      {dashboardData?.agent?.recent_orders?.length > 0 && (
        <Card colors={colors}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitleRow}>
              <Clock size={16} color={colors.btnBg} />
              <span style={styles.cardTitle(colors)}>Recent orders</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/orders")}
              style={styles.linkBtn(colors)}
            >
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {["Order", "Customer", "Amount", "Status"].map((h) => (
                    <th key={h} style={styles.th(colors)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboardData.agent.recent_orders.slice(0, 6).map((o) => (
                  <tr key={o.id} style={styles.tr(colors)}>
                    <td style={styles.td(colors)}>
                      <span style={styles.mono(colors)}>
                        #{o.id?.slice(0, 8) || "N/A"}
                      </span>
                    </td>
                    <td style={styles.td(colors)}>{o.customer || "—"}</td>
                    <td style={styles.td(colors)}>
                      <strong style={{ color: colors.heading }}>
                        ₵{Number(o.amount || 0).toFixed(2)}
                      </strong>
                    </td>
                    <td style={styles.td(colors)}>
                      <OrderStatusPill status={o.status} colors={colors} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      
      <Card colors={colors}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitleRow}>
            <Package size={16} color={colors.btnBg} />
            <span style={styles.cardTitle(colors)}>My packages</span>
            <span style={styles.chip(colors)}>{packages.length}</span>
          </div>
        </div>

        
        <div style={styles.filtersRow}>
          <div style={styles.searchWrap}>
            <Search size={14} color={colors.secondaryText} style={styles.searchIcon} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packages…"
              style={styles.searchInput(colors)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={styles.searchClear}
                aria-label="Clear"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div style={styles.networkChips}>
            {["ALL", "MTN", "Telecel", "AirtelTigo"].map((n) => {
              const meta = n === "ALL" ? null : getNetworkMeta(n);
              const active = selectedNetwork === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedNetwork(n)}
                  style={styles.networkChip(colors, active)}
                >
                  {meta && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: meta.dot,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {n === "ALL" ? "All" : meta?.label || n}
                </button>
              );
            })}
          </div>
        </div>

        {filteredPackages.length === 0 ? (
          <div style={styles.emptyState(colors)}>
            <Package size={28} color={colors.secondaryText} />
            <p style={{ margin: "10px 0 0", fontSize: 13 }}>
              No packages match your filters.
            </p>
          </div>
        ) : (
          <div style={styles.pkgGrid}>
            {filteredPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                colors={colors}
                isMobile={isMobile}
                expanded={!!expandedPackages[pkg.id]}
                onToggle={() =>
                  setExpandedPackages((prev) => ({
                    ...prev,
                    [pkg.id]: !prev[pkg.id],
                  }))
                }
                onEditCustomer={() => openPriceModal(pkg, "customer")}
                onEditSubAgent={() => openPriceModal(pkg, "subAgent")}
              />
            ))}
          </div>
        )}
      </Card>

      
      {editingPackage && (
        <PriceModal
          pkg={editingPackage}
          type={editingType}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          submitting={submitting}
          onClose={closePriceModal}
          onSave={savePrice}
          colors={colors}
          isMobile={isMobile}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}


const Card = ({ colors, children }) => (
  <div style={styles.card(colors)}>{children}</div>
);

const StatCard = ({ icon: Icon, label, value, change, color, colors }) => (
  <div style={styles.statCard(colors)}>
    <div style={styles.statTop}>
      <span style={styles.statLabel(colors)}>{label}</span>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: colors.hoverBg,
          color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} />
      </span>
    </div>
    <div style={styles.statValue(colors)}>{value}</div>
    {change && <div style={styles.statChange(colors)}>{change}</div>}
  </div>
);

const MiniStat = ({ icon: Icon, label, value, color, colors }) => (
  <div style={styles.miniStat(colors)}>
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: colors.hoverBg,
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={14} />
    </span>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={styles.miniStatLabel(colors)}>{label}</div>
      <div style={styles.miniStatValue(colors)}>{value}</div>
    </div>
  </div>
);

const FeeCard = ({
  fee,
  editing,
  feeInput,
  setFeeInput,
  saving,
  resetting,
  onEdit,
  onCancel,
  onSave,
  onReset,
  colors,
  isMobile,
}) => {
  const hasCustom = fee.is_custom;
  return (
    <Card colors={colors}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitleRow}>
          <Coins size={16} color={colors.btnBg} />
          <span style={styles.cardTitle(colors)}>Sub-agent registration fee</span>
          {hasCustom && (
            <span
              style={{
                ...styles.tonePill,
                background: colors.warningBg,
                color: colors.warning,
              }}
            >
              Custom
            </span>
          )}
          <span style={styles.chip(colors)}>
            {fee.sub_agent_count || 0} sub-agents
          </span>
        </div>

        {!editing ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onEdit}
              style={styles.ghostBtn(colors)}
            >
              <Edit2 size={14} /> Edit
            </button>
            {hasCustom && (
              <button
                type="button"
                onClick={onReset}
                disabled={resetting}
                style={styles.dangerGhostBtn(colors)}
              >
                {resetting ? (
                  <>
                    <RefreshCw
                      size={13}
                      style={{ animation: "spin 0.9s linear infinite" }}
                    />
                    Resetting…
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Reset
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              style={styles.ghostBtn(colors)}
            >
              <X size={14} /> Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={styles.primaryBtn(colors, saving)}
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={13}
                    style={{ animation: "spin 0.9s linear infinite" }}
                  />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={14} /> Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div style={styles.feeGrid}>
        <div style={styles.feeBlock}>
          <div style={styles.feeBlockLabel(colors)}>
            {hasCustom ? "Your fee" : "Base fee"}
          </div>
          {editing ? (
            <div style={styles.inputPrefixWrap}>
              <span style={styles.inputPrefix(colors)}>₵</span>
              <input
                type="number"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                min={fee.base_fee}
                step="0.01"
                style={styles.inputWithPrefix(colors)}
                autoFocus
              />
            </div>
          ) : (
            <div
              style={{
                ...styles.feeValue,
                color: hasCustom ? colors.btnBg : colors.heading,
              }}
            >
              ₵{fee.current_fee || fee.base_fee || "0.00"}
            </div>
          )}
        </div>

        <div style={styles.feeBlock}>
          <div style={styles.feeBlockLabel(colors)}>Base fee</div>
          <div style={styles.feeValueMuted(colors)}>
            ₵{fee.base_fee || "0.00"}
          </div>
        </div>

        <div style={styles.feeBlock}>
          <div style={styles.feeBlockLabel(colors)}>Your profit</div>
          <div
            style={{
              ...styles.feeValue,
              color:
                fee.profit && parseFloat(fee.profit) > 0
                  ? colors.success
                  : colors.secondaryText,
            }}
          >
            {fee.profit && parseFloat(fee.profit) > 0
              ? `₵${fee.profit}`
              : "—"}
          </div>
        </div>
      </div>

      {fee.updated_at && !editing && (
        <div style={styles.feeFooter(colors)}>
          Last updated {formatDate(fee.updated_at)}
        </div>
      )}
    </Card>
  );
};

const PackageCard = ({
  pkg,
  colors,
  isMobile,
  expanded,
  onToggle,
  onEditCustomer,
  onEditSubAgent,
}) => {
  const meta = getNetworkMeta(pkg.network);
  const sourceMeta = PRICE_SOURCE_KEYS[pkg.priceSource] || PRICE_SOURCE_KEYS.base;
  const sourceTone = getToneColors(colors, sourceMeta.tone);

  const customerProfit =
    pkg.agentCustomerPrice != null
      ? pkg.agentCustomerPrice - pkg.basePriceAgent
      : null;
  const subProfit =
    pkg.agentSubBasePrice != null
      ? pkg.agentSubBasePrice - pkg.basePriceAgent
      : null;

  const customEntries = Object.entries(pkg.agentSubCustomPrices || {});
  const hasCustom = customEntries.length > 0;

  return (
    <div style={styles.pkgCard(colors)}>
      
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: meta.dot,
        }}
      />

      
      <div style={styles.pkgHeader}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: meta.dot,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: meta.dot,
              }}
            />
            {meta.label}
          </div>
          <div style={styles.pkgSize(colors)}>{pkg.size}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              ...styles.tonePill,
              background: sourceTone.bg,
              color: sourceTone.fg,
            }}
          >
            <Info size={10} />
            {sourceMeta.label}
          </span>
          {pkg.salesCount > 0 && (
            <span
              style={{
                ...styles.tonePill,
                background: colors.hoverBg,
                color: colors.secondaryText,
              }}
            >
              <Zap size={10} />
              {pkg.salesCount}
            </span>
          )}
        </div>
      </div>

      
      <div style={styles.priceRow(colors)}>
        <span style={styles.priceLabel(colors)}>Admin agent base</span>
        <span style={styles.priceValue(colors)}>
          ₵{pkg.basePriceAgent.toFixed(2)}
        </span>
      </div>

      
      <div style={styles.overlayGrid}>
        <PriceBlock
          label="Your customer price"
          value={pkg.agentCustomerPrice}
          base={pkg.basePriceAgent}
          profit={customerProfit}
          accentColor={colors.btnBg}
          colors={colors}
        />
        <PriceBlock
          label="Sub-agent base"
          value={pkg.agentSubBasePrice}
          base={pkg.basePriceAgent}
          profit={subProfit}
          accentColor={colors.linkColor}
          colors={colors}
        />
      </div>

      
      {hasCustom && (
        <>
          <button
            type="button"
            onClick={onToggle}
            style={styles.expanderBtn(colors)}
          >
            <span>
              Sub-agent custom prices ({customEntries.length})
            </span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {expanded && (
            <div style={styles.expanderBody(colors)}>
              {customEntries.map(([username, price]) => {
                const profit = price ? price - pkg.basePriceAgent : null;
                return (
                  <div key={username} style={styles.customRow(colors)}>
                    <span style={styles.customUser(colors)}>@{username}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12.5,
                          color: price ? colors.linkColor : colors.secondaryText,
                        }}
                      >
                        {price ? `₵${price.toFixed(2)}` : "Uses base"}
                      </span>
                      {profit != null && profit > 0 && (
                        <span
                          style={{
                            ...styles.tonePill,
                            background: colors.successBg,
                            color: colors.success,
                          }}
                        >
                          <BadgeDollarSign size={10} /> ₵{profit.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      
      <div style={styles.pkgActions}>
        <button
          type="button"
          onClick={onEditCustomer}
          style={styles.ghostBtn(colors)}
        >
          <Edit2 size={13} /> {isMobile ? "Customer" : "Edit customer"}
        </button>
        <button
          type="button"
          onClick={onEditSubAgent}
          style={styles.ghostBtnAccent(colors)}
        >
          <Edit2 size={13} /> {isMobile ? "Sub-agent" : "Edit sub-agent"}
        </button>
      </div>
    </div>
  );
};

const PriceBlock = ({ label, value, base, profit, accentColor, colors }) => (
  <div style={styles.priceBlock(colors)}>
    <div style={styles.priceBlockLabel(colors)}>{label}</div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 800,
        color: value ? accentColor : colors.secondaryText,
        letterSpacing: "-0.01em",
      }}
    >
      {value ? `₵${value.toFixed(2)}` : "Uses base"}
    </div>
    {value != null && (
      <span
        style={{
          ...styles.tonePill,
          background: profit > 0 ? colors.successBg : colors.errorBg,
          color: profit > 0 ? colors.success : colors.error,
          marginTop: 4,
        }}
      >
        <BadgeDollarSign size={10} />
        {profit > 0 ? `Profit ₵${profit.toFixed(2)}` : "No profit"}
      </span>
    )}
  </div>
);

const OrderStatusPill = ({ status, colors }) => {
  const map = {
    COMPLETED: { tone: "success", icon: CheckCircle },
    PENDING: { tone: "warning", icon: Clock },
    PROCESSING: { tone: "info", icon: RefreshCw },
    FAILED: { tone: "error", icon: AlertCircle },
  };
  const meta = map[status] || { tone: "muted", icon: AlertCircle };
  const t = getToneColors(colors, meta.tone);
  const Icon = meta.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        textTransform: "capitalize",
      }}
    >
      <Icon size={10} />
      {status?.toLowerCase() || "n/a"}
    </span>
  );
};

const WeeklyChart = ({ data, activeTab, animating, colors, isMobile }) => {
  const series = {
    revenue: { data: data.revenue, color: colors.btnBg, label: "Revenue" },
    profit: { data: data.profit, color: colors.success, label: "Profit" },
    orders: { data: data.orders, color: colors.warning, label: "Orders" },
  }[activeTab];
  const max = Math.max(...series.data, 1);

  return (
    <div style={{ marginTop: 4 }}>
      <div style={styles.chartMeta(colors)}>
        <span>{series.label} per day</span>
        {data.summary && (
          <span>
            Total:{" "}
            <strong style={{ color: colors.heading }}>
              ₵{Number(data.summary.total_revenue || 0).toFixed(2)}
            </strong>
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          height: isMobile ? 130 : 170,
          gap: isMobile ? 4 : 8,
          marginTop: 10,
        }}
      >
        {series.data.map((value, i) => {
          const pct = max > 0 ? (value / max) * 100 : 0;
          const h = Math.max(pct, 2);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: colors.secondaryText,
                  opacity: animating && value > 0 ? 1 : 0,
                  transition: "opacity 0.4s ease",
                }}
              >
                {value}
              </span>
              <div
                style={{
                  width: "100%",
                  maxWidth: 32,
                  height: `${animating ? h : 0}%`,
                  minHeight: animating ? 3 : 0,
                  background: `linear-gradient(180deg, ${series.color}, ${series.color}66)`,
                  borderRadius: "4px 4px 0 0",
                  transition:
                    "height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.secondaryText,
                }}
              >
                {data.labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PriceModal = ({
  pkg,
  type,
  priceInput,
  setPriceInput,
  submitting,
  onClose,
  onSave,
  colors,
  isMobile,
}) => {
  const isCustomer = type === "customer";
  const currentValue = isCustomer
    ? pkg.agentCustomerPrice
    : pkg.agentSubBasePrice;
  const currentProfit =
    currentValue != null ? currentValue - pkg.basePriceAgent : null;
  const newProfit = priceInput
    ? Number(priceInput) - pkg.basePriceAgent
    : 0;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={styles.modalOverlay(colors)}
    >
      <div style={styles.modalCard(colors, isMobile)}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle(colors)}>
              {isCustomer ? "Edit customer price" : "Edit sub-agent base price"}
            </div>
            <div style={styles.modalSubtitle(colors)}>
              {pkg.network} · {pkg.size}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn(colors)}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.modalFacts(colors)}>
            <div style={styles.factRow}>
              <span style={styles.factLabel(colors)}>Admin agent base</span>
              <span style={styles.factValue(colors)}>
                ₵{pkg.basePriceAgent.toFixed(2)}
              </span>
            </div>
            <div style={styles.factRow}>
              <span style={styles.factLabel(colors)}>
                {isCustomer ? "Customer price" : "Sub-agent base"}
              </span>
              <span style={styles.factValue(colors)}>
                {currentValue != null ? `₵${currentValue.toFixed(2)}` : "Not set"}
              </span>
            </div>
            <div style={styles.factRow}>
              <span style={styles.factLabel(colors)}>Current profit</span>
              <span
                style={{
                  ...styles.factValue,
                  color:
                    currentProfit != null && currentProfit > 0
                      ? colors.success
                      : colors.secondaryText,
                }}
              >
                {currentProfit != null && currentProfit > 0
                  ? `₵${currentProfit.toFixed(2)}`
                  : "—"}
              </span>
            </div>
          </div>

          <label style={styles.modalLabel(colors)}>
            New {isCustomer ? "customer" : "sub-agent base"} price
          </label>
          <div style={styles.inputPrefixWrap}>
            <span style={styles.inputPrefix(colors)}>₵</span>
            <input
              type="number"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              min={pkg.basePriceAgent}
              step="0.01"
              placeholder={`Min ₵${pkg.basePriceAgent.toFixed(2)}`}
              style={styles.inputWithPrefix(colors)}
              autoFocus
            />
          </div>
          <div style={styles.modalHint(colors)}>
            {newProfit > 0
              ? `New profit per sale: ₵${newProfit.toFixed(2)}`
              : "Set a price above the admin base to earn a profit"}
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button
            type="button"
            onClick={onClose}
            style={styles.secondaryBtn(colors)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={submitting}
            style={styles.primaryBtn(colors, submitting)}
          >
            {submitting ? (
              <>
                <RefreshCw
                  size={13}
                  style={{ animation: "spin 0.9s linear infinite" }}
                />
                Saving…
              </>
            ) : (
              <>
                <Save size={14} /> Save price
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


const styles = {
  pageWrap: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "20px 16px 60px",
  },
  loadingWrap: (c) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
    gap: 14,
  }),
  spinner: (c) => ({
    width: 34,
    height: 34,
    border: `3px solid ${c.border}`,
    borderTopColor: c.btnBg,
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  }),

  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 22,
  },
  h1: (c) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: 0,
    fontSize: "clamp(20px, 3vw, 26px)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: c.heading,
  }),
  subtitle: (c) => ({
    margin: "6px 0 0",
    fontSize: 13.5,
    color: c.secondaryText,
  }),

  card: (c) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
  }),
  cardHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: (c) => ({
    fontSize: 15,
    fontWeight: 700,
    color: c.heading,
    letterSpacing: "-0.01em",
  }),
  cardSubtitle: (c) => ({
    fontSize: 12.5,
    color: c.secondaryText,
  }),

  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 18,
  },
  statCard: (c) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  }),
  statTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statLabel: (c) => ({
    fontSize: 11.5,
    fontWeight: 600,
    color: c.secondaryText,
  }),
  statValue: (c) => ({
    fontSize: 20,
    fontWeight: 800,
    color: c.heading,
    letterSpacing: "-0.02em",
  }),
  statChange: (c) => ({
    fontSize: 11,
    color: c.secondaryText,
  }),

  miniStatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    marginBottom: 18,
  },
  miniStat: (c) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  }),
  miniStatLabel: (c) => ({
    fontSize: 11,
    fontWeight: 600,
    color: c.secondaryText,
  }),
  miniStatValue: (c) => ({
    fontSize: 14.5,
    fontWeight: 700,
    color: c.heading,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),

  segmented: (c) => ({
    display: "inline-flex",
    border: `1px solid ${c.border}`,
    borderRadius: 9,
    overflow: "hidden",
    background: c.surfaceBg || c.raisedBg,
  }),
  segmentBtn: (c, active) => ({
    padding: "6px 12px",
    border: "none",
    background: active ? c.btnBg : "transparent",
    color: active ? c.btnText : c.secondaryText,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
    transition: "background 0.15s ease, color 0.15s ease",
  }),
  chartMeta: (c) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    fontSize: 12,
    color: c.secondaryText,
    flexWrap: "wrap",
  }),

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 500,
  },
  th: (c) => ({
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: c.secondaryText,
    borderBottom: `1px solid ${c.border}`,
  }),
  tr: (c) => ({
    borderBottom: `1px solid ${c.separator}`,
  }),
  td: (c) => ({
    padding: "12px",
    fontSize: 13,
    color: c.text,
    verticalAlign: "middle",
  }),
  mono: (c) => ({
    fontFamily: "ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    color: c.heading,
  }),

  filtersRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  searchWrap: {
    position: "relative",
    flex: "1 1 220px",
    minWidth: 0,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  searchInput: (c) => ({
    width: "100%",
    padding: "9px 34px 9px 36px",
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    background: c.raisedBg,
    color: c.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  }),
  searchClear: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
  },
  networkChips: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  networkChip: (c, active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? c.btnBg : c.border}`,
    background: active ? c.btnBg : c.raisedBg,
    color: active ? c.btnText : c.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  }),

  pkgGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
  },
  pkgCard: (c) => ({
    position: "relative",
    background: c.surfaceBg || c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 14,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflow: "hidden",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  }),
  pkgHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  pkgSize: (c) => ({
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: c.heading,
  }),
  priceRow: (c) => ({
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottom: `1px solid ${c.separator || c.border}`,
  }),
  priceLabel: (c) => ({
    fontSize: 12,
    fontWeight: 600,
    color: c.secondaryText,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  }),
  priceValue: (c) => ({
    fontSize: 15,
    fontWeight: 800,
    color: c.heading,
  }),

  overlayGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  priceBlock: (c) => ({
    padding: 10,
    borderRadius: 10,
    background: c.mainBg,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  }),
  priceBlockLabel: (c) => ({
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: c.secondaryText,
  }),

  expanderBtn: (c) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 0 0",
    borderTop: `1px solid ${c.separator || c.border}`,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: c.secondaryText,
    textAlign: "left",
  }),
  expanderBody: (c) => ({
    background: c.mainBg,
    borderRadius: 10,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  }),
  customRow: (c) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 6,
    borderBottom: `1px solid ${c.separator || c.border}`,
  }),
  customUser: (c) => ({
    fontSize: 12.5,
    color: c.text,
    fontWeight: 600,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  pkgActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginTop: "auto",
  },

  chip: (c) => ({
    padding: "3px 9px",
    borderRadius: 999,
    background: c.hoverBg,
    color: c.secondaryText,
    fontSize: 11,
    fontWeight: 700,
  }),
  tonePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },

  ghostBtn: (c) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 9,
    border: `1px solid ${c.border}`,
    background: "transparent",
    color: c.text,
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 600,
    transition: "all 0.15s ease",
  }),
  ghostBtnAccent: (c) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 9,
    border: `1px solid ${c.linkColor}`,
    background: "transparent",
    color: c.linkColor,
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 600,
  }),
  dangerGhostBtn: (c) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 9,
    border: `1px solid ${c.error}55`,
    background: "transparent",
    color: c.error,
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 600,
  }),
  primaryBtn: (c, disabled) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 9,
    border: "none",
    background: disabled ? c.hoverBg : c.btnBg,
    color: disabled ? c.secondaryText : c.btnText,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    transition: "background 0.15s ease",
  }),
  secondaryBtn: (c) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 16px",
    borderRadius: 9,
    border: `1px solid ${c.border}`,
    background: "transparent",
    color: c.text,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  }),
  linkBtn: (c) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: c.btnBg,
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 600,
  }),
  closeBtn: (c) => ({
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "none",
    background: c.hoverBg,
    color: c.text,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }),

  feeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 14,
  },
  feeBlock: { minWidth: 0 },
  feeBlockLabel: (c) => ({
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: c.secondaryText,
    marginBottom: 4,
  }),
  feeValue: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  feeValueMuted: (c) => ({
    fontSize: 20,
    fontWeight: 700,
    color: c.secondaryText,
  }),
  feeFooter: (c) => ({
    marginTop: 14,
    paddingTop: 10,
    borderTop: `1px solid ${c.separator || c.border}`,
    fontSize: 11.5,
    color: c.secondaryText,
  }),

  inputPrefixWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputPrefix: (c) => ({
    position: "absolute",
    left: 12,
    color: c.secondaryText,
    fontWeight: 700,
    fontSize: 14,
    pointerEvents: "none",
  }),
  inputWithPrefix: (c) => ({
    width: "100%",
    padding: "11px 12px 11px 30px",
    borderRadius: 10,
    border: `1.5px solid ${c.btnBg}`,
    background: c.raisedBg,
    color: c.text,
    fontSize: 15,
    fontWeight: 700,
    outline: "none",
    boxSizing: "border-box",
    transition: "box-shadow 0.15s ease",
  }),

  emptyState: (c) => ({
    padding: "40px 20px",
    textAlign: "center",
    color: c.secondaryText,
    border: `1px dashed ${c.border}`,
    borderRadius: 12,
    background: c.mainBg,
  }),

  modalOverlay: (c) => ({
    position: "fixed",
    inset: 0,
    background: c.scrim || "rgba(0,0,0,0.5)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
    animation: "fadeIn 0.15s ease",
  }),
  modalCard: (c, isMobile) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    width: "100%",
    maxWidth: 440,
    padding: isMobile ? 20 : 24,
    boxShadow: `0 24px 64px ${c.shadowStrong || c.shadow}`,
    animation: "slideUp 0.2s ease",
    boxSizing: "border-box",
  }),
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  modalTitle: (c) => ({
    fontSize: 16,
    fontWeight: 800,
    color: c.heading,
    letterSpacing: "-0.01em",
  }),
  modalSubtitle: (c) => ({
    fontSize: 12.5,
    color: c.secondaryText,
    marginTop: 3,
  }),
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  modalFacts: (c) => ({
    background: c.mainBg,
    borderRadius: 12,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  }),
  factRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  factLabel: (c) => ({
    fontSize: 12,
    color: c.secondaryText,
    fontWeight: 600,
  }),
  factValue: (c) => ({
    fontSize: 13,
    fontWeight: 700,
    color: c.heading,
  }),
  modalLabel: (c) => ({
    fontSize: 12,
    fontWeight: 700,
    color: c.text,
    display: "block",
    marginBottom: 6,
  }),
  modalHint: (c) => ({
    fontSize: 11.5,
    color: c.secondaryText,
  }),
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
};

