import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, ChevronRight, CircleDollarSign, CreditCard, Database,
  Gauge, LogOut, Menu, Moon, PackageOpen, ReceiptText, Sun, UserRoundPlus,
  UsersRound, WalletCards, X
} from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../hooks/useTheme";

const siteName = process.env.REACT_APP_SITE_NAME || "DataHub";

function linksFor(user) {
  const common = [
    { to: "/data", label: "Buy data", icon: Database },
    { to: "/orders", label: "Data orders", icon: ReceiptText },
    { to: "/transactions", label: "Transactions", icon: CreditCard },
    { to: "/notices", label: "Notices", icon: Bell }
  ];
  if (!user) return [{ to: "/data", label: "Buy data", icon: Database }, { to: "/notices", label: "Notices", icon: Bell }];
  if (user.role === "ADMIN") return [
    { to: "/admin/dashboard", label: "Dashboard", icon: Gauge },
    { to: "/admin/users", label: "Users", icon: UsersRound },
    { to: "/admin/data-packages", label: "Packages & pricing", icon: PackageOpen },
    { to: "/admin/withdrawals", label: "Withdrawals", icon: WalletCards },
    { to: "/admin/notices", label: "Manage notices", icon: Bell },
    ...common
  ];
  if (user.role === "AGENT") return user.is_unpaid_agent ? [
    { to: "/register/payment", label: "Complete registration", icon: CircleDollarSign },
    { to: "/agent/dashboard", label: "Agent dashboard", icon: Gauge },
    ...common
  ] : [
    { to: "/agent/dashboard", label: "Agent dashboard", icon: Gauge },
    { to: "/agent/subagents", label: "Sub-agents", icon: UserRoundPlus },
    { to: "/agent/withdrawals", label: "Withdrawals", icon: CircleDollarSign },
    ...common
  ];
  if (user.role === "SUB_AGENT") return user.is_unpaid_agent ? [
    { to: "/register/payment", label: "Complete registration", icon: CircleDollarSign },
    { to: "/subagent/dashboard", label: "Sub-agent dashboard", icon: Gauge },
    ...common
  ] : [
    { to: "/subagent/dashboard", label: "Sub-agent dashboard", icon: Gauge },
    { to: "/subagent/withdrawals", label: "Withdrawals", icon: CircleDollarSign },
    ...common
  ];
  return [
    { to: "/become-agent", label: "Become an agent", icon: UserRoundPlus },
    ...common
  ];
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, updateTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const links = useMemo(() => linksFor(user), [user]);

  useEffect(() => setOpen(false), [location.pathname]);

  const signOut = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <NavLink to="/" className="brand"><span className="brand-mark">D</span><span>{siteName}</span></NavLink>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => updateTheme()} aria-label="Toggle theme">{theme.mode === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
          {user ? (
            <>
              <div className="user-chip"><strong>{user.first_name || user.username}</strong><small>{user.role.replace("_", " ")}</small></div>
              <button className="icon-button" onClick={signOut} aria-label="Sign out"><LogOut size={19} /></button>
            </>
          ) : <NavLink className="primary-link" to="/login">Sign in</NavLink>}
        </div>
      </header>

      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-mobile-head"><span>Navigation</span><button className="icon-button" onClick={() => setOpen(false)}><X size={19} /></button></div>
        <nav>
          {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}><Icon size={19} /><span>{label}</span></NavLink>)}
        </nav>
        <button className="collapse-button desktop-only" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Collapse</span></>}</button>
      </aside>
      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <main className="app-content">{children}</main>
    </div>
  );
}
