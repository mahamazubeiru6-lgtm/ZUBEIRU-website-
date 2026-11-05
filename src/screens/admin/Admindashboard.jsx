


                    
                    


                    
                    


import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { useNavigate } from "react-router-dom";
import { Users, ShoppingBag, TrendingUp, DollarSign, Wallet, BarChart3, Clock, CheckCircle, AlertCircle, ChevronRight, RefreshCw, ArrowUp, ArrowDown, ShoppingCart, Activity, Award, Edit2, Save, X, Coins } from "lucide-react";


const STATUS_COLORS = {
  COMPLETED: "#10B981",
  PROCESSING: "#3B82F6",
  PENDING: "#F59E0B",
  FAILED: "#EF4444",
  CANCELLED: "#6B7280",
};

const ROLE_COLORS = {
  ADMIN: "#EF4444",
  AGENT: "#3B82F6",
  SUB_AGENT: "#8B5CF6",
  CUSTOMER: "#10B981",
};

const ROLE_LABELS = {
  ADMIN: "Admin",
  AGENT: "Agent",
  SUB_AGENT: "Sub Agent",
  CUSTOMER: "Customer",
};

const CHART_TABS = ["revenue", "profit", "orders", "users"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getStatusColor = (s) => STATUS_COLORS[s] || "#6B7280";
const getStatusLabel = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "N/A";
const getRoleColor = (r) => ROLE_COLORS[r] || "#6B7280";
const getRoleLabel = (r) => ROLE_LABELS[r] || r || "—";

const StatusIcon = memo(({ status, size = 14 }) => {
  const map = {
    COMPLETED: CheckCircle,
    PROCESSING: RefreshCw,
    PENDING: Clock,
    FAILED: AlertCircle,
    CANCELLED: AlertCircle,
  };
  const Icon = map[status];
  return Icon ? <Icon size={size} /> : null;
});

const formatDate = (iso) => {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
};


const STATIC_CSS = `
  @keyframes ad-spin { to { transform: rotate(360deg); } }
  @keyframes ad-fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ad-barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
`;

const useStaticStyles = () => {
  useEffect(() => {
    const id = "admin-dashboard-static";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.innerHTML = STATIC_CSS;
    document.head.appendChild(tag);
  }, []);
};


const AdminDashboard = () => {
  const { colors } = useTheme();
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  useStaticStyles();

  
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [topPackages, setTopPackages] = useState([]);
  const [registrationFees, setRegistrationFees] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState("revenue");

  
  const [isEditingFees, setIsEditingFees] = useState(false);
  const [editFeesData, setEditFeesData] = useState({
    agent_registration_fee: "",
    sub_agent_registration_fee: "",
  });
  const [isSavingFees, setIsSavingFees] = useState(false);

  
  const abortRef = useRef(null);

  
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  
  const fetchDashboardData = useCallback(
    async ({ silent } = {}) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (silent) setRefreshing(true);
      else setLoading(true);

      const safeFetch = async (url, key) => {
        try {
          const res = await authFetch(url, { signal: controller.signal });
          const data = await res.json();
          return res.ok && data.status === "success"
            ? { key, ok: true, data: data.data }
            : { key, ok: false };
        } catch (err) {
          if (err.name === "AbortError") throw err;
          return { key, ok: false };
        }
      };

      try {
        const results = await Promise.all([
          safeFetch("/accounts/dashboard/stats/", "stats"),
          safeFetch(
            "/data/orders/?page_size=5&ordering=-created_at",
            "orders"
          ),
          safeFetch(
            "/accounts/users/?page_size=5&ordering=-date_joined",
            "users"
          ),
          safeFetch("/data/packages/?is_active=true", "packages"),
          safeFetch("/accounts/registration-fees/", "fees"),
        ]);

        if (controller.signal.aborted) return;

        for (const r of results) {
          if (!r.ok) continue;
          switch (r.key) {
            case "stats":
              setStats(r.data);
              setWalletBalance(parseFloat(r.data.wallet_balance || 0));
              break;
            case "orders":
              setRecentOrders(r.data || []);
              break;
            case "users":
              setRecentUsers(r.data || []);
              break;
            case "packages": {
              const sorted = (r.data || [])
                .filter((p) => p.is_active && p.sales_count > 0)
                .sort(
                  (a, b) => (b.sales_count || 0) - (a.sales_count || 0)
                )
                .slice(0, 4);
              setTopPackages(sorted);
              break;
            }
            case "fees":
              setRegistrationFees(r.data);
              setEditFeesData({
                agent_registration_fee: r.data.agent_registration_fee || "",
                sub_agent_registration_fee:
                  r.data.sub_agent_registration_fee || "",
              });
              break;
            default:
              break;
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        showToast("Failed to load dashboard data", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch, showToast]
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  
  const adminStats = useMemo(() => stats?.admin || {}, [stats]);

  const parsedStats = useMemo(
    () => ({
      totalRevenue: parseFloat(adminStats.total_revenue || 0),
      totalOrders: adminStats.total_transactions || 0,
      totalUsers: adminStats.total_users || 0,
      totalProfit: parseFloat(adminStats.total_profit || 0),
      pendingOrders: adminStats.pending_orders || 0,
      todayOrders: adminStats.today_orders || 0,
      totalAgents: adminStats.total_agents || 0,
      totalSubAgents: adminStats.total_sub_agents || 0,
      totalCustomers: adminStats.total_customers || 0,
    }),
    [adminStats]
  );

  
  const chartData = useMemo(() => {
    const weekly = adminStats.weekly;
    if (!weekly) return null;

    const pick = (arr, day) => {
      const found = arr?.find((r) => r.day === day);
      return found ? found.value : 0;
    };
    const revenue = DAY_LABELS.map((d) => pick(weekly.revenue, d));
    const profit = DAY_LABELS.map((d) => pick(weekly.profit, d));
    const orders = DAY_LABELS.map((d) => pick(weekly.orders, d));
    const users = DAY_LABELS.map((d) => pick(weekly.new_users, d));

    return {
      labels: DAY_LABELS,
      revenue,
      profit,
      orders,
      users,
      summary: weekly.summary || {},
    };
  }, [adminStats]);

  
  const handleEditFees = useCallback(() => {
    setIsEditingFees(true);
    setEditFeesData({
      agent_registration_fee: registrationFees?.agent_registration_fee || "",
      sub_agent_registration_fee:
        registrationFees?.sub_agent_registration_fee || "",
    });
  }, [registrationFees]);

  const handleCancelEditFees = useCallback(() => {
    setIsEditingFees(false);
    setEditFeesData({
      agent_registration_fee: registrationFees?.agent_registration_fee || "",
      sub_agent_registration_fee:
        registrationFees?.sub_agent_registration_fee || "",
    });
  }, [registrationFees]);

  const handleSaveFees = useCallback(async () => {
    const agentFee = parseFloat(editFeesData.agent_registration_fee);
    const subAgentFee = parseFloat(editFeesData.sub_agent_registration_fee);
    if (isNaN(agentFee) || agentFee < 0) {
      showToast("Agent fee must be a valid positive number", "error");
      return;
    }
    if (isNaN(subAgentFee) || subAgentFee < 0) {
      showToast("Sub-agent fee must be a valid positive number", "error");
      return;
    }
    setIsSavingFees(true);
    try {
      const res = await authFetch("/accounts/registration-fees/", {
        method: "PUT",
        body: JSON.stringify({
          agent_registration_fee: agentFee.toFixed(2),
          sub_agent_registration_fee: subAgentFee.toFixed(2),
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        showToast("Registration fees updated", "success");
        setRegistrationFees(data.data);
        setIsEditingFees(false);
      } else {
        showToast(data.message || "Failed to update fees", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsSavingFees(false);
    }
  }, [authFetch, editFeesData, showToast]);

  const handleFeeInputChange = useCallback((e) => {
    const { name, value } = e.target;
    const cleaned = value.replace(/[^0-9.]/g, "");
    setEditFeesData((prev) => ({ ...prev, [name]: cleaned }));
  }, []);

  
  if (loading) {
    return (
      <div style={styles.pageWrap}>
        <div style={styles.loadingBox(colors)}>
          <div style={styles.spinner(colors)} />
          <span style={{ color: colors.secondaryText, fontSize: 13 }}>
            Loading dashboard…
          </span>
        </div>
      </div>
    );
  }

  
  return (
    <div style={styles.pageWrap}>
      
      <header style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.h1(colors, isMobile)}>
            <Activity size={isMobile ? 20 : 24} color={colors.btnBg} />
            Dashboard
          </h1>
          <p style={styles.subtitle(colors, isMobile)}>
            Welcome back, {user?.first_name || user?.username || "Admin"}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => fetchDashboardData({ silent: true })}
            disabled={refreshing}
            style={styles.ghostBtn(colors, refreshing)}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? "ad-spin 0.8s linear infinite" : "none",
              }}
            />
            {!isMobile && (refreshing ? "Refreshing…" : "Refresh")}
          </button>
        </div>
      </header>

      
      <div style={styles.statsGrid(isMobile)}>
        <StatCard
          icon={<DollarSign size={isMobile ? 16 : 18} />}
          label="Revenue"
          value={`₵${parsedStats.totalRevenue.toLocaleString()}`}
          change="+12.5%"
          positive
          color={colors.btnBg}
          colors={colors}
          isMobile={isMobile}
        />
        <StatCard
          icon={<ShoppingBag size={isMobile ? 16 : 18} />}
          label="Orders"
          value={parsedStats.totalOrders}
          change={`${parsedStats.pendingOrders} pending`}
          positive
          color="#3B82F6"
          colors={colors}
          isMobile={isMobile}
        />
        <StatCard
          icon={<Users size={isMobile ? 16 : 18} />}
          label="Users"
          value={parsedStats.totalUsers}
          change={`${parsedStats.totalAgents} agents`}
          positive
          color="#8B5CF6"
          colors={colors}
          isMobile={isMobile}
        />
        <StatCard
          icon={<TrendingUp size={isMobile ? 16 : 18} />}
          label="Profit"
          value={`₵${parsedStats.totalProfit.toLocaleString()}`}
          change="+8.2%"
          positive
          color="#10B981"
          colors={colors}
          isMobile={isMobile}
        />
      </div>

      
      <div style={styles.quickGrid(isMobile)}>
        <QuickStat
          label="Today's Orders"
          value={parsedStats.todayOrders}
          icon={<ShoppingCart size={isMobile ? 14 : 16} />}
          color={colors.btnBg}
          colors={colors}
          isMobile={isMobile}
        />
        <QuickStat
          label="Wallet"
          value={`₵${walletBalance.toFixed(2)}`}
          icon={<Wallet size={isMobile ? 14 : 16} />}
          color="#8B5CF6"
          colors={colors}
          isMobile={isMobile}
        />
        <QuickStat
          label="Pending"
          value={parsedStats.pendingOrders}
          icon={<Clock size={isMobile ? 14 : 16} />}
          color="#F59E0B"
          colors={colors}
          isMobile={isMobile}
        />
        <QuickStat
          label="Sub Agents"
          value={parsedStats.totalSubAgents}
          icon={<Users size={isMobile ? 14 : 16} />}
          color="#3B82F6"
          colors={colors}
          isMobile={isMobile}
        />
      </div>

      
      <RegistrationFeesCard
        colors={colors}
        isMobile={isMobile}
        fees={registrationFees}
        isEditing={isEditingFees}
        isSaving={isSavingFees}
        editData={editFeesData}
        onChange={handleFeeInputChange}
        onEdit={handleEditFees}
        onCancel={handleCancelEditFees}
        onSave={handleSaveFees}
      />

      
      {chartData && (
        <ChartCard
          colors={colors}
          isMobile={isMobile}
          chartData={chartData}
          activeTab={activeChartTab}
          setActiveTab={setActiveChartTab}
        />
      )}

      
      <div style={styles.twoCol(isMobile)}>
        <RecentOrdersCard
          colors={colors}
          isMobile={isMobile}
          orders={recentOrders}
          onViewAll={() => navigate("/orders")}
        />
        <RecentUsersCard
          colors={colors}
          isMobile={isMobile}
          users={recentUsers}
          onViewAll={() => navigate("/admin/users")}
        />
      </div>

      
      <TopPackagesCard
        colors={colors}
        isMobile={isMobile}
        packages={topPackages}
      />
    </div>
  );
};


const StatCard = memo(function StatCard({
  icon,
  label,
  value,
  change,
  positive,
  color,
  colors,
  isMobile,
}) {
  return (
    <div
      style={styles.statCard(colors, isMobile)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 6px 20px ${colors.shadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={styles.statTop}>
        <span style={styles.statLabel(colors, isMobile)}>{label}</span>
        <span style={{ color, opacity: 0.7, display: "inline-flex" }}>
          {icon}
        </span>
      </div>
      <div style={styles.statValue(colors, isMobile)}>{value}</div>
      {change && (
        <div
          style={{
            ...styles.statChange(isMobile),
            color: positive ? "#10B981" : "#EF4444",
          }}
        >
          {positive ? (
            <ArrowUp size={isMobile ? 10 : 12} />
          ) : (
            <ArrowDown size={isMobile ? 10 : 12} />
          )}
          {change}
        </div>
      )}
    </div>
  );
});


const QuickStat = memo(function QuickStat({
  label,
  value,
  icon,
  color,
  colors,
  isMobile,
}) {
  return (
    <div style={styles.quickCard(colors, isMobile)}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={styles.quickLabel(colors, isMobile)}>{label}</div>
        <div style={styles.quickValue(colors, isMobile)}>{value}</div>
      </div>
      <span
        style={{
          color,
          opacity: 0.6,
          display: "inline-flex",
          flexShrink: 0,
          marginLeft: 8,
        }}
      >
        {icon}
      </span>
    </div>
  );
});


const RegistrationFeesCard = memo(function RegistrationFeesCard({
  colors,
  isMobile,
  fees,
  isEditing,
  isSaving,
  editData,
  onChange,
  onEdit,
  onCancel,
  onSave,
}) {
  return (
    <div style={styles.feesCard(colors, isMobile)}>
      <div style={styles.feesHeader}>
        <div style={styles.feesTitleWrap}>
          <Coins size={isMobile ? 16 : 18} color={colors.btnBg} />
          <span style={styles.feesTitle(colors, isMobile)}>
            Registration Fees
          </span>
          {fees?.updated_by_username && (
            <span style={styles.feesBy(colors, isMobile)}>
              by {fees.updated_by_username}
            </span>
          )}
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={onEdit}
            style={styles.feesEditBtn(colors, isMobile)}
          >
            <Edit2 size={isMobile ? 13 : 14} />
            Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={onCancel}
              style={styles.feesCancelBtn(colors, isMobile)}
            >
              <X size={isMobile ? 13 : 14} />
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              style={styles.feesSaveBtn(colors, isSaving, isMobile)}
            >
              {isSaving ? (
                <>
                  <span style={styles.spinnerSmall(colors)} />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={isMobile ? 13 : 14} />
                  Save
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div style={styles.feesGrid(isMobile)}>
        <FeeField
          colors={colors}
          isMobile={isMobile}
          label="Agent Registration Fee"
          value={fees?.agent_registration_fee || "0.00"}
          editing={isEditing}
          name="agent_registration_fee"
          editValue={editData.agent_registration_fee}
          onChange={onChange}
          tone={colors.btnBg}
        />
        <FeeField
          colors={colors}
          isMobile={isMobile}
          label="Sub-Agent Registration Fee"
          value={fees?.sub_agent_registration_fee || "0.00"}
          editing={isEditing}
          name="sub_agent_registration_fee"
          editValue={editData.sub_agent_registration_fee}
          onChange={onChange}
          tone="#8B5CF6"
        />
      </div>

      {fees?.updated_at && !isEditing && (
        <div style={styles.feesUpdatedAt(colors, isMobile)}>
          Last updated: {formatDate(fees.updated_at)}
        </div>
      )}
    </div>
  );
});

const FeeField = memo(function FeeField({
  colors,
  isMobile,
  label,
  value,
  editing,
  name,
  editValue,
  onChange,
  tone,
}) {
  return (
    <div>
      <div style={styles.feeLabel(colors, isMobile)}>{label}</div>
      {editing ? (
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span
            style={{
              position: "absolute",
              left: 12,
              color: colors.secondaryText,
              fontWeight: 700,
              fontSize: isMobile ? 14 : 15,
              pointerEvents: "none",
            }}
          >
            ₵
          </span>
          <input
            type="text"
            name={name}
            value={editValue}
            onChange={onChange}
            style={styles.feeInput(colors, isMobile)}
          />
        </div>
      ) : (
        <div
          style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 800,
            color: tone,
            letterSpacing: "-0.01em",
          }}
        >
          ₵{value}
        </div>
      )}
    </div>
  );
});


const ChartCard = memo(function ChartCard({
  colors,
  isMobile,
  chartData,
  activeTab,
  setActiveTab,
}) {
  const dataMap = useMemo(
    () => ({
      revenue: { data: chartData.revenue, color: colors.btnBg, label: "Revenue" },
      profit: { data: chartData.profit, color: "#10B981", label: "Profit" },
      orders: { data: chartData.orders, color: "#F59E0B", label: "Orders" },
      users: { data: chartData.users, color: "#8B5CF6", label: "New Users" },
    }),
    [chartData, colors.btnBg]
  );

  const current = dataMap[activeTab];
  const maxValue = useMemo(
    () => Math.max(...current.data, 1),
    [current.data]
  );

  return (
    <div style={styles.chartCard(colors, isMobile)}>
      <div style={styles.chartHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <BarChart3 size={isMobile ? 15 : 17} color={colors.btnBg} />
          <span style={styles.chartTitle(colors, isMobile)}>Analytics</span>
        </div>
        <div style={styles.chartSummary(colors, isMobile)}>
          <span>
            Orders{" "}
            <strong style={{ color: colors.text }}>
              {chartData.summary.total_orders || 0}
            </strong>
          </span>
          <span>
            Revenue{" "}
            <strong style={{ color: colors.text }}>
              ₵{parseFloat(chartData.summary.total_revenue || 0).toFixed(2)}
            </strong>
          </span>
        </div>
      </div>

      <div style={styles.chartTabsWrap}>
        <span style={styles.chartTabLabel(colors, isMobile)}>
          {current.label}
        </span>
        <div style={styles.chartTabRow}>
          {CHART_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={styles.chartTab(colors, activeTab === tab, isMobile)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.chartBody(isMobile)}>
        {current.data.map((value, i) => {
          const pct = (value / maxValue) * 100;
          const height = Math.max(pct, 3);
          return (
            <div key={i} style={styles.chartBarCol}>
              <div style={styles.chartBarWrap}>
                <div
                  style={{
                    ...styles.chartBar(current.color, height),
                    transformOrigin: "bottom",
                    animation: "ad-barGrow 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  {value > 0 && (
                    <span
                      style={{
                        ...styles.chartBarValue(current.color, isMobile),
                      }}
                    >
                      {value}
                    </span>
                  )}
                </div>
              </div>
              <span style={styles.chartBarLabel(colors, isMobile)}>
                {chartData.labels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});


const RecentOrdersCard = memo(function RecentOrdersCard({
  colors,
  isMobile,
  orders,
  onViewAll,
}) {
  return (
    <div style={styles.listCard(colors)}>
      <div style={styles.listHeader(colors, isMobile)}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShoppingBag size={isMobile ? 13 : 15} color={colors.btnBg} />
          <span style={styles.listTitle(colors, isMobile)}>Recent Orders</span>
        </div>
        <button type="button" onClick={onViewAll} style={styles.viewAllBtn(colors, isMobile)}>
          View all <ChevronRight size={12} />
        </button>
      </div>

      {orders.length === 0 ? (
        <div style={styles.listEmpty(colors, isMobile)}>No recent orders</div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            style={styles.orderRow(isMobile)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = colors.hoverBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span style={styles.orderIdCell(colors, isMobile)}>
              {order.id?.slice(0, 8) || "N/A"}
            </span>
            <span style={styles.orderCustomerCell(colors, isMobile)}>
              {order.customer?.username || order.customer_username || "N/A"}
            </span>
            <span style={styles.orderAmountCell(colors, isMobile)}>
              ₵{order.customer_price || "0.00"}
            </span>
            <span
              style={{
                ...styles.orderStatusCell(isMobile),
                color: getStatusColor(order.status),
              }}
            >
              <StatusIcon status={order.status} size={11} />
              {isMobile
                ? getStatusLabel(order.status).slice(0, 3)
                : getStatusLabel(order.status)}
            </span>
          </div>
        ))
      )}
    </div>
  );
});


const RecentUsersCard = memo(function RecentUsersCard({
  colors,
  isMobile,
  users,
  onViewAll,
}) {
  return (
    <div style={styles.listCard(colors)}>
      <div style={styles.listHeader(colors, isMobile)}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Users size={isMobile ? 13 : 15} color={colors.btnBg} />
          <span style={styles.listTitle(colors, isMobile)}>New Users</span>
        </div>
        <button type="button" onClick={onViewAll} style={styles.viewAllBtn(colors, isMobile)}>
          View all <ChevronRight size={12} />
        </button>
      </div>

      {users.length === 0 ? (
        <div style={styles.listEmpty(colors, isMobile)}>No recent users</div>
      ) : (
        users.map((u) => {
          const roleColor = getRoleColor(u.role);
          return (
            <div
              key={u.id}
              style={styles.userRow(isMobile)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = colors.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div style={styles.userAvatarWrap}>
                <div
                  style={{
                    ...styles.userAvatar(roleColor, isMobile),
                  }}
                >
                  {(u.first_name?.[0] || u.username?.[0] || "U").toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={styles.userName(colors, isMobile)}>
                    {u.first_name || u.username}
                    {u.last_name && ` ${u.last_name}`}
                  </div>
                  <div style={styles.userEmail(colors, isMobile)}>
                    {u.email}
                  </div>
                </div>
              </div>
              <span style={styles.userRolePill(roleColor, isMobile)}>
                {isMobile ? getRoleLabel(u.role).slice(0, 4) : getRoleLabel(u.role)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
});


const TopPackagesCard = memo(function TopPackagesCard({
  colors,
  isMobile,
  packages,
}) {
  return (
    <div style={styles.listCard(colors)}>
      <div style={styles.listHeader(colors, isMobile)}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Award size={isMobile ? 13 : 15} color={colors.btnBg} />
          <span style={styles.listTitle(colors, isMobile)}>Top Packages</span>
        </div>
        <span style={styles.packagesSubtitle(colors, isMobile)}>
          By sales volume
        </span>
      </div>

      <div style={styles.packagesGrid(isMobile)}>
        {packages.length === 0 ? (
          <div style={styles.packagesEmpty(colors, isMobile)}>
            No package data available
          </div>
        ) : (
          packages.map((pkg, i) => (
            <div
              key={pkg.id || i}
              style={styles.packageCard(colors, isMobile)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={styles.packageNetwork(colors, isMobile)}>
                  {pkg.network}
                </div>
                <div style={styles.packageMeta(colors, isMobile)}>
                  {pkg.size_gb}GB • {pkg.sales_count || 0} sales
                </div>
              </div>
              <div style={styles.packageRevenue(colors, isMobile)}>
                ₵{parseFloat(pkg.total_revenue || 0).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});


const styles = {
  pageWrap: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "20px 16px 60px",
    fontFamily: "inherit",
  },

  
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  h1: (c, m) => ({
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: m ? 20 : 24,
    fontWeight: 800,
    color: c.heading,
    letterSpacing: "-0.02em",
  }),
  subtitle: (c, m) => ({
    margin: "4px 0 0",
    fontSize: m ? 12 : 13,
    color: c.secondaryText,
  }),
  headerActions: { display: "flex", gap: 8, alignItems: "center" },
  ghostBtn: (c, busy) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    background: c.raisedBg,
    color: c.text,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.7 : 1,
    fontFamily: "inherit",
  }),

  
  statsGrid: (m) => ({
    display: "grid",
    gridTemplateColumns: m
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
    gap: m ? 8 : 10,
    marginBottom: m ? 12 : 16,
  }),
  quickGrid: (m) => ({
    display: "grid",
    gridTemplateColumns: m
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(4, minmax(0, 1fr))",
    gap: m ? 6 : 8,
    marginBottom: m ? 12 : 16,
  }),
  twoCol: (m) => ({
    display: "grid",
    gridTemplateColumns: m ? "1fr" : "1fr 1fr",
    gap: m ? 12 : 16,
    marginBottom: m ? 12 : 16,
  }),

  
  statCard: (c, m) => ({
    padding: m ? "10px 12px" : "14px 16px",
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  }),
  statTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statLabel: (c, m) => ({
    fontSize: m ? 9.5 : 11,
    fontWeight: 600,
    color: c.secondaryText,
  }),
  statValue: (c, m) => ({
    fontSize: m ? 18 : 22,
    fontWeight: 800,
    color: c.heading,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  statChange: (m) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    fontSize: m ? 9 : 10.5,
    fontWeight: 600,
    marginTop: 4,
  }),

  
  quickCard: (c, m) => ({
    padding: m ? "8px 10px" : "10px 14px",
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  }),
  quickLabel: (c, m) => ({
    fontSize: m ? 8.5 : 10,
    fontWeight: 600,
    color: c.secondaryText,
  }),
  quickValue: (c, m) => ({
    fontSize: m ? 15 : 17,
    fontWeight: 800,
    color: c.heading,
    letterSpacing: "-0.01em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),

  
  feesCard: (c, m) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: m ? "14px 16px" : "16px 20px",
    marginBottom: m ? 12 : 16,
  }),
  feesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  feesTitleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  feesTitle: (c, m) => ({
    fontSize: m ? 14 : 15,
    fontWeight: 800,
    color: c.heading,
  }),
  feesBy: (c, m) => ({
    fontSize: m ? 9.5 : 10.5,
    color: c.secondaryText,
  }),
  feesEditBtn: (c, m) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: m ? "5px 10px" : "6px 12px",
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: "transparent",
    color: c.text,
    fontSize: m ? 11.5 : 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  feesCancelBtn: (c, m) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: m ? "5px 10px" : "6px 12px",
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: "transparent",
    color: c.text,
    fontSize: m ? 11.5 : 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  feesSaveBtn: (c, busy, m) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: m ? "5px 10px" : "6px 12px",
    borderRadius: 8,
    border: "none",
    background: c.btnBg,
    color: c.btnText,
    fontSize: m ? 11.5 : 12,
    fontWeight: 700,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.7 : 1,
    fontFamily: "inherit",
  }),
  spinnerSmall: (c) => ({
    width: 12,
    height: 12,
    border: `2px solid ${c.btnText}55`,
    borderTopColor: c.btnText,
    borderRadius: "50%",
    animation: "ad-spin 0.8s linear infinite",
    display: "inline-block",
  }),
  feesGrid: (m) => ({
    display: "grid",
    gridTemplateColumns: m ? "1fr" : "1fr 1fr",
    gap: m ? 12 : 16,
  }),
  feeLabel: (c, m) => ({
    fontSize: m ? 11 : 12,
    fontWeight: 600,
    color: c.secondaryText,
    marginBottom: 6,
  }),
  feeInput: (c, m) => ({
    width: "100%",
    padding: m ? "8px 12px 8px 28px" : "10px 14px 10px 32px",
    borderRadius: 8,
    border: `1.5px solid ${c.btnBg}`,
    background: c.raisedBg,
    color: c.text,
    fontSize: m ? 13.5 : 15,
    fontWeight: 700,
    outline: "none",
    fontFamily: "inherit",
    boxShadow: `0 0 0 3px ${c.btnBg}20`,
  }),
  feesUpdatedAt: (c, m) => ({
    fontSize: m ? 9.5 : 10.5,
    color: c.secondaryText,
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${c.border}`,
  }),

  
  chartCard: (c, m) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: m ? "12px 14px" : "16px 18px",
    marginBottom: m ? 12 : 16,
    boxShadow: `0 2px 8px ${c.shadow}`,
  }),
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  chartTitle: (c, m) => ({
    fontSize: m ? 13 : 14.5,
    fontWeight: 800,
    color: c.heading,
  }),
  chartSummary: (c, m) => ({
    display: "flex",
    gap: m ? 8 : 12,
    fontSize: m ? 10 : 11,
    color: c.secondaryText,
    flexWrap: "wrap",
  }),
  chartTabsWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  chartTabLabel: (c, m) => ({
    fontSize: m ? 11 : 12,
    fontWeight: 600,
    color: c.secondaryText,
  }),
  chartTabRow: { display: "flex", gap: 3, flexWrap: "wrap" },
  chartTab: (c, active, m) => ({
    padding: m ? "4px 9px" : "5px 11px",
    borderRadius: 6,
    border: "none",
    background: active ? c.btnBg : "transparent",
    color: active ? c.btnText : c.secondaryText,
    fontSize: m ? 9.5 : 10.5,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
    textTransform: "capitalize",
  }),
  chartBody: (m) => ({
    display: "flex",
    alignItems: "flex-end",
    gap: m ? 4 : 6,
    height: m ? 120 : 160,
    padding: "0 2px",
  }),
  chartBarCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    gap: 4,
  },
  chartBarWrap: {
    width: "100%",
    maxWidth: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-end",
    height: "100%",
  },
  chartBar: (color, height) => ({
    width: "100%",
    height: `${height}%`,
    minHeight: 3,
    background: `linear-gradient(180deg, ${color}, ${color}88)`,
    borderRadius: "3px 3px 0 0",
    position: "relative",
    boxShadow: `0 2px 8px ${color}33`,
  }),
  chartBarValue: (color, m) => ({
    position: "absolute",
    top: m ? -12 : -15,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: m ? 7.5 : 9,
    fontWeight: 700,
    color,
    opacity: 0.85,
    whiteSpace: "nowrap",
  }),
  chartBarLabel: (c, m) => ({
    fontSize: m ? 8 : 9,
    fontWeight: 500,
    color: c.secondaryText,
  }),

  
  listCard: (c) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    overflow: "hidden",
  }),
  listHeader: (c, m) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: m ? "10px 12px" : "12px 16px",
    borderBottom: `1px solid ${c.border}`,
    gap: 8,
    flexWrap: "wrap",
  }),
  listTitle: (c, m) => ({
    fontSize: m ? 12.5 : 13.5,
    fontWeight: 800,
    color: c.heading,
  }),
  viewAllBtn: (c, m) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    background: "transparent",
    border: "none",
    color: c.btnBg,
    fontSize: m ? 11 : 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  listEmpty: (c, m) => ({
    padding: m ? "20px 12px" : "28px 16px",
    textAlign: "center",
    fontSize: m ? 12 : 13,
    color: c.secondaryText,
  }),

  
  orderRow: (m) => ({
    display: "grid",
    gridTemplateColumns: m
      ? "minmax(60px, 0.7fr) 1fr minmax(60px, 0.7fr) minmax(60px, 0.7fr)"
      : "minmax(70px, 0.8fr) 1fr minmax(80px, 0.8fr) minmax(80px, 0.8fr)",
    gap: m ? 4 : 6,
    padding: m ? "8px 12px" : "10px 16px",
    borderBottom: "1px solid transparent",
    alignItems: "center",
    fontSize: m ? 11 : 12,
    transition: "background 0.12s ease",
  }),
  orderIdCell: (c, m) => ({
    fontSize: m ? 10 : 11,
    fontWeight: 700,
    color: c.heading,
  }),
  orderCustomerCell: (c, m) => ({
    fontSize: m ? 10.5 : 12,
    color: c.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  orderAmountCell: (c, m) => ({
    fontSize: m ? 11 : 12,
    fontWeight: 700,
    color: c.btnBg,
  }),
  orderStatusCell: (m) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: m ? 9 : 10,
    fontWeight: 700,
    textTransform: "capitalize",
  }),

  
  userRow: (m) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: m ? "8px 12px" : "10px 16px",
    borderBottom: "1px solid transparent",
    transition: "background 0.12s ease",
  }),
  userAvatarWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  userAvatar: (color, m) => ({
    width: m ? 26 : 30,
    height: m ? 26 : 30,
    borderRadius: "50%",
    background: `${color}1F`,
    color,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: m ? 10 : 12,
    flexShrink: 0,
  }),
  userName: (c, m) => ({
    fontSize: m ? 11 : 12.5,
    fontWeight: 700,
    color: c.heading,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  userEmail: (c, m) => ({
    fontSize: m ? 9.5 : 10.5,
    color: c.secondaryText,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  userRolePill: (color, m) => ({
    padding: m ? "1px 6px" : "2px 8px",
    borderRadius: 999,
    background: `${color}1F`,
    color,
    fontSize: m ? 8.5 : 9.5,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    flexShrink: 0,
  }),

  
  packagesSubtitle: (c, m) => ({
    fontSize: m ? 10 : 11,
    color: c.secondaryText,
  }),
  packagesGrid: (m) => ({
    display: "grid",
    gridTemplateColumns: m
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(auto-fill, minmax(220px, 1fr))",
    gap: m ? 6 : 10,
    padding: m ? "10px 12px" : "12px 16px",
  }),
  packagesEmpty: (c, m) => ({
    gridColumn: "1 / -1",
    padding: m ? "20px 12px" : "28px 16px",
    textAlign: "center",
    fontSize: m ? 12 : 13,
    color: c.secondaryText,
  }),
  packageCard: (c, m) => ({
    padding: m ? "8px 10px" : "12px 14px",
    background: c.mainBg,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
  }),
  packageNetwork: (c, m) => ({
    fontSize: m ? 10.5 : 12,
    fontWeight: 800,
    color: c.heading,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  }),
  packageMeta: (c, m) => ({
    fontSize: m ? 9.5 : 10.5,
    color: c.secondaryText,
    marginTop: 2,
  }),
  packageRevenue: (c, m) => ({
    fontSize: m ? 12 : 14,
    fontWeight: 800,
    color: c.btnBg,
    letterSpacing: "-0.01em",
  }),

  
  loadingBox: (c) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
    gap: 12,
  }),
  spinner: (c) => ({
    width: 32,
    height: 32,
    border: `3px solid ${c.border}`,
    borderTopColor: c.btnBg,
    borderRadius: "50%",
    animation: "ad-spin 0.8s linear infinite",
  }),
};

export default AdminDashboard;

