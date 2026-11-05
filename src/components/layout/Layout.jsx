import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Database,
  ExternalLink,
  Gauge,
  LogOut,
  Menu,
  Moon,
  PackageOpen,
  ReceiptText,
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
    storeContext,
  } = useAgentContext();
  const { theme, updateTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const links = useMemo(
    () => linksFor(user, { canUseRoleTools, canBecomeSubAgent }),
    [user, canUseRoleTools, canBecomeSubAgent]
  );
  const showOwnStoreLink = Boolean(
    user &&
      (user.role === "AGENT" || user.role === "SUB_AGENT") &&
      fullOwnStoreUrl &&
      !canUseRoleTools
  );

  useEffect(() => setOpen(false), [location.pathname]);

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

        {storeContext && (
          <div className="store-context-card" title={storeContext.shopName || "Storefront"}>
            <Store size={17} />
            <span>
              <small>Browsing store</small>
              <strong>{storeContext.shopName || storeContext.storeUrl}</strong>
            </span>
          </div>
        )}

        <nav>
          {showOwnStoreLink && (
            <a
              className="nav-item own-store-link"
              href={fullOwnStoreUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={19} />
              <span>Open my store tools</span>
            </a>
          )}
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
