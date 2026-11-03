import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import "./App.css";
import CompletePaymentModal from "./components/CompletePaymentModal";
import RegistrationPaymentBanner from "./components/RegistrationPaymentBanner";
import Layout from "./components/layout/Layout";
import { ThemeProvider } from "./contexts/themeContext";
import { useAgentContext } from "./hooks/useAgentContext";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { ToastProvider } from "./providers/ToastProvider";
import Home from "./screens/Home";
import Login from "./screens/Login";
import Register from "./screens/Register";
import ActivateRegistration from "./screens/ActivateRegistration";
import BecomeAgent from "./screens/BecomeAgent";
import Notices from "./screens/Notices";
import OrdersList from "./screens/OrderList";
import TransactionsList from "./screens/TransactionsList";
import DataScreen from "./screens/data/DataScreen";
import DataPurchase from "./screens/data/DataPurchase";
import AdminDashboard from "./screens/admin/Admindashboard";
import AdminUsers from "./screens/admin/AdminUsers";
import AdminUserDetails from "./screens/admin/AdminUserDetails";
import AdminPackages from "./screens/admin/AdminPackages";
import AdminNotices from "./screens/admin/AdminNotices";
import AdminWithdrawals from "./screens/admin/AdminWithdrawals";
import AgentDashboard from "./screens/agent/AgentDashboard";
import SubAgentDisplay from "./screens/agent/SubAgentDisplay";
import SubAgentDetails from "./screens/agent/SubAgentDetails";
import Withdrawals from "./screens/agent/Withdrawals";
import SubAgentDashboard from "./screens/subagent/SubAgentDashboard";
import SubAgentRegister from "./screens/subagent/SubAgentRegister";

function Loader({ label = "Loading" }) { return <div className="full-loader"><span className="spinner" /><p>{label}</p></div>; }

function Protected({ children, roles }) {
  const { loading, isAuthenticated, user } = useAuth();
  if (loading) return <Loader label="Checking your session" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function PageLayout({ children }) {
  const location = useLocation();
  const { isAuthenticated, user, refreshUser } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.is_unpaid_agent) refreshUser();
  }, [location.pathname, isAuthenticated, user?.is_unpaid_agent, refreshUser]);

  const noLayoutPaths = [
    "/login",
    "/register",
    "/subagent/register",
    "/activate-registration",
    "/registration/complete",
    "/become-agent",
    "/register/payment"
  ];

  return noLayoutPaths.includes(location.pathname)
    ? children
    : <Layout><RegistrationPaymentBanner />{children}</Layout>;
}

function RoutedApp() {
  const { loading, isValidSubdomain } = useAgentContext();
  const location = useLocation();
  const bypassStoreValidation = [
    "/login",
    "/register",
    "/activate-registration",
    "/registration/complete"
  ].includes(location.pathname);

  if (loading && !bypassStoreValidation) return <Loader label="Loading storefront" />;
  if (!isValidSubdomain && !bypassStoreValidation) return <div className="invalid-store"><h1>Storefront not found</h1><p>This agent or sub-agent storefront is unavailable.</p><a className="button primary" href={process.env.REACT_APP_MAIN_SITE_URL || "/"}>Go to the main site</a></div>;
  return <PageLayout><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/data" element={<DataScreen />} />
    <Route path="/data/purchase/:id" element={<Protected><DataPurchase /></Protected>} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/activate-registration" element={<ActivateRegistration />} />
    <Route path="/registration/complete" element={<ActivateRegistration />} />
    <Route path="/become-agent" element={<Protected roles={["CUSTOMER"]}><BecomeAgent /></Protected>} />
    <Route path="/register/payment" element={<Protected roles={["AGENT", "SUB_AGENT"]}><BecomeAgent mode="payment" /></Protected>} />
    <Route path="/subagent/register" element={<SubAgentRegister />} />
    <Route path="/notices" element={<Notices />} />
    <Route path="/orders" element={<Protected><OrdersList /></Protected>} />
    <Route path="/transactions" element={<Protected><TransactionsList /></Protected>} />
    <Route path="/admin/dashboard" element={<Protected roles={["ADMIN"]}><AdminDashboard /></Protected>} />
    <Route path="/admin/users" element={<Protected roles={["ADMIN"]}><AdminUsers /></Protected>} />
    <Route path="/admin/users/:userId" element={<Protected roles={["ADMIN"]}><AdminUserDetails /></Protected>} />
    <Route path="/admin/data-packages" element={<Protected roles={["ADMIN"]}><AdminPackages /></Protected>} />
    <Route path="/admin/notices" element={<Protected roles={["ADMIN"]}><AdminNotices /></Protected>} />
    <Route path="/admin/withdrawals" element={<Protected roles={["ADMIN"]}><AdminWithdrawals /></Protected>} />
    <Route path="/agent/dashboard" element={<Protected roles={["AGENT"]}><AgentDashboard /></Protected>} />
    <Route path="/agent/subagents" element={<Protected roles={["AGENT"]}><SubAgentDisplay /></Protected>} />
    <Route path="/agent/subagents/:subAgentId" element={<Protected roles={["AGENT"]}><SubAgentDetails /></Protected>} />
    <Route path="/agent/withdrawals" element={<Protected roles={["AGENT"]}><Withdrawals /></Protected>} />
    <Route path="/subagent/dashboard" element={<Protected roles={["SUB_AGENT"]}><SubAgentDashboard /></Protected>} />
    <Route path="/subagent/withdrawals" element={<Protected roles={["SUB_AGENT"]}><Withdrawals /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></PageLayout>;
}

export default function App() {
  return <BrowserRouter><ThemeProvider><AuthProvider><ToastProvider><CompletePaymentModal /><RoutedApp /></ToastProvider></AuthProvider></ThemeProvider></BrowserRouter>;
}
