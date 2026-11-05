import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  Database,
  ExternalLink,
  Gauge,
  LogOut,
  Menu,
  Moon,
  PackageOpen,
  ReceiptText,
  Share2,
  Store,
  Sun,
  UserRoundPlus,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useAgentContext } from "../../hooks/useAgentContext";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";

const siteName = process.env.REACT_APP_SITE_NAME || "DataHub";

function linksFor(user, { canUseRoleTools, canBecomeSubAgent }) {
  const common = [
    { to: "/data", label: "Buy data", icon: Database },
    { to: "/orders", label: "Data orders", icon: ReceiptText },
    { to: "/transactions", label: "Transactions", icon: CreditCard },
    { to: "/notices", label: "Notices", icon: Bell },
  ];

  if (!user) {
    return [
      { to: "/data", label: "Buy data", icon: Database },
      ...(canBecomeSubAgent
        ? [
            {
              to: "/subagent/register",
              label: "Become a sub-agent",
              icon: UserRoundPlus,
            },
          ]
        : []),
      { to: "/notices", label: "Notices", icon: Bell },
    ];
  }

  if (user.role === "ADMIN" && canUseRoleTools) {
    return [
      { to: "/admin/dashboard", label: "Dashboard", icon: Gauge },
      { to: "/admin/users", label: "Users", icon: UsersRound },
      {
        to: "/admin/data-packages",
        label: "Packages & pricing",
        icon: PackageOpen,
      },
      { to: "/admin/withdrawals", label: "Withdrawals", icon: WalletCards },
      { to: "/admin/notices", label: "Manage notices", icon: Bell },
      ...common,
    ];
  }

  if (user.role === "AGENT") {
    const roleLinks = [];
    if (user.is_unpaid_agent) {
      roleLinks.push({
        to: "/register/payment",
        label: "Complete registration",
        icon: CircleDollarSign,
      });
    }
    if (canUseRoleTools) {
      roleLinks.push({
        to: "/agent/dashboard",
        label: "Agent dashboard",
        icon: Gauge,
      });
      if (!user.is_unpaid_agent) {
        roleLinks.push(
          {
            to: "/agent/subagents",
            label: "Sub-agents",
            icon: UserRoundPlus,
          },
          {
            to: "/agent/withdrawals",
            label: "Withdrawals",
            icon: CircleDollarSign,
          }
        );
      }
    }
    return [...roleLinks, ...common];
  }

  if (user.role === "SUB_AGENT") {
    const roleLinks = [];
    if (user.is_unpaid_agent) {
      roleLinks.push({
        to: "/register/payment",
        label: "Complete registration",
        icon: CircleDollarSign,
      });
    }
    if (canUseRoleTools) {
      roleLinks.push({
        to: "/subagent/dashboard",
        label: "Sub-agent dashboard",
        icon: Gauge,
      });
      if (!user.is_unpaid_agent) {
        roleLinks.push({
          to: "/subagent/withdrawals",
          label: "Withdrawals",
          icon: CircleDollarSign,
        });
      }
    }
    return [...roleLinks, ...common];
  }

  return [
    ...(canBecomeSubAgent
      ? [
          {
            to: "/subagent/register",
            label: "Become a sub-agent",
            icon: UserRoundPlus,
          },
        ]
      : canUseRoleTools
        ? [
            {
              to: "/become-agent",
              label: "Become an agent",
              icon: UserRoundPlus,
            },
          ]
        : []),
    ...common,
  ];
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const {
    canUseRoleTools,
    canBecomeSubAgent,
    fullOwnStoreUrl,
    onMainSite,
    sidebarStore,
  } = useAgentContext();
  const { theme, updateTheme } = useTheme();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [copiedStoreUrl, setCopiedStoreUrl] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const links = useMemo(
    () => linksFor(user, { canUseRoleTools, canBecomeSubAgent }),
    [user, canUseRoleTools, canBecomeSubAgent]
  );
  const showGoToStoreHint = Boolean(
    user &&
      (user.role === "AGENT" || user.role === "SUB_AGENT") &&
      fullOwnStoreUrl &&
      !canUseRoleTools
  );
  const storeRoleLabel =
    sidebarStore?.role === "SUB_AGENT"
      ? "Sub-agent"
      : sidebarStore?.role === "AGENT"
        ? "Agent"
        : null;
  const storeUrlLabel = sidebarStore?.url
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!copiedStoreUrl) return undefined;
    const timer = window.setTimeout(() => setCopiedStoreUrl(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedStoreUrl]);

  const handleCopyStoreUrl = useCallback(async () => {
    if (!sidebarStore?.url) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(sidebarStore.url);
      setCopiedStoreUrl(true);
      showToast("Store URL copied", "success");
    } catch {
      window.prompt("Copy this store URL:", sidebarStore.url);
    }
  }, [sidebarStore, showToast]);

  const handleOpenStoreUrl = useCallback(() => {
    if (sidebarStore?.url) {
      window.open(sidebarStore.url, "_blank", "noopener,noreferrer");
    }
  }, [sidebarStore]);

  const handleShareStoreUrl = useCallback(async () => {
    if (!sidebarStore?.url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${sidebarStore.shopName} - ${siteName}`,
          text: `Visit ${sidebarStore.shopName} on ${siteName}.`,
          url: sidebarStore.url,
        });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    await handleCopyStoreUrl();
  }, [sidebarStore, handleCopyStoreUrl]);

  const handleGoToOwnStore = useCallback(() => {
    if (fullOwnStoreUrl) {
      window.open(fullOwnStoreUrl, "_blank", "noopener,noreferrer");
    }
  }, [fullOwnStoreUrl]);

  const signOut = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <header className="topbar">
        <button
          className="icon-button mobile-only"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <NavLink to="/" className="brand">
          <span className="brand-mark">D</span>
          <span>{siteName}</span>
        </NavLink>
        <div className="topbar-actions">
          <button
            className="icon-button"
            onClick={() => updateTheme()}
            aria-label="Toggle theme"
          >
            {theme.mode === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          {user ? (
            <>
              <div className="user-chip">
                <strong>{user.first_name || user.username}</strong>
                <small>{user.role.replace("_", " ")}</small>
              </div>
              <button
                className="icon-button"
                onClick={signOut}
                aria-label="Sign out"
              >
                <LogOut size={19} />
              </button>
            </>
          ) : (
            <NavLink className="primary-link" to="/login">
              Sign in
            </NavLink>
          )}
        </div>
      </header>

      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-mobile-head">
          <span>Navigation</span>
          <button className="icon-button" onClick={() => setOpen(false)}>
            <X size={19} />
          </button>
        </div>

        {sidebarStore && !collapsed && (
          <section className="store-link-card" aria-label="Store link">
              <div className="store-link-heading">
                <span className="store-link-icon">
                  <Store size={16} />
                </span>
                <span className="store-link-name">
                  <small>
                    {sidebarStore.isOwnStore ? "Your store" : "Browsing store"}
                  </small>
                  <strong>{sidebarStore.shopName}</strong>
                </span>
                {storeRoleLabel && (
                  <span className="store-role-badge">{storeRoleLabel}</span>
                )}
              </div>

              <div className="store-link-url-row">
                <span className="store-link-url" title={sidebarStore.url}>
                  {storeUrlLabel}
                </span>
                <div className="store-link-actions">
                  <button
                    type="button"
                    onClick={handleCopyStoreUrl}
                    title="Copy store URL"
                    aria-label="Copy store URL"
                  >
                    {copiedStoreUrl ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenStoreUrl}
                    title="Open store in a new tab"
                    aria-label="Open store in a new tab"
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleShareStoreUrl}
                    title="Share store"
                    aria-label="Share store"
                  >
                    <Share2 size={13} />
                  </button>
                </div>
              </div>
          </section>
        )}

        <nav>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}

          {showGoToStoreHint &&
            (collapsed ? (
              <button
                type="button"
                className="store-access-hint-collapsed"
                onClick={handleGoToOwnStore}
                title="Go to my store"
                aria-label="Go to my store"
              >
                <Store size={17} />
              </button>
            ) : (
              <div className="store-access-hint">
                <strong>
                  <Store size={13} />
                  {onMainSite
                    ? "Not on your store"
                    : "You're on someone else's store"}
                </strong>
                <span>
                  {user?.role === "SUB_AGENT"
                    ? "Visit your own store to manage your sub-agent tools."
                    : "Visit your own store to manage tools and prices."}
                </span>
                <button type="button" onClick={handleGoToOwnStore}>
                  Go to my store
                  <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
        </nav>
        <button
          className="collapse-button desktop-only"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="app-content">{children}</main>
    </div>
  );
}
