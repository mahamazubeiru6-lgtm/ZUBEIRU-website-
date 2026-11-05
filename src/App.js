import {
  lazy,
  Suspense,
  useEffect,
  useRef,
} from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";
import CompletePaymentModal from "./components/CompletePaymentModal";
import RegistrationPaymentBanner from "./components/RegistrationPaymentBanner";
import Layout from "./components/layout/Layout";
import { MAIN_SITE_URL } from "./config";
import { ThemeProvider } from "./contexts/themeContext";
import {
  AgentContextProvider,
  useAgentContext,
} from "./hooks/useAgentContext";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { ToastProvider } from "./providers/ToastProvider";

const Home = lazy(() => import("./screens/Home"));
const Login = lazy(() => import("./screens/Login"));
const Register = lazy(() => import("./screens/Register"));
const ActivateRegistration = lazy(() => import("./screens/ActivateRegistration"));
const BecomeAgent = lazy(() => import("./screens/BecomeAgent"));
const Notices = lazy(() => import("./screens/Notices"));
const OrdersList = lazy(() => import("./screens/OrderList"));
const TransactionsList = lazy(() => import("./screens/TransactionsList"));
const DataScreen = lazy(() => import("./screens/data/DataScreen"));
const DataPurchase = lazy(() => import("./screens/data/DataPurchase"));
const AdminDashboard = lazy(() => import("./screens/admin/Admindashboard"));
const AdminUsers = lazy(() => import("./screens/admin/AdminUsers"));
const AdminUserDetails = lazy(() => import("./screens/admin/AdminUserDetails"));
const AdminPackages = lazy(() => import("./screens/admin/AdminPackages"));
const AdminNotices = lazy(() => import("./screens/admin/AdminNotices"));
const AdminWithdrawals = lazy(() => import("./screens/admin/AdminWithdrawals"));
const AgentDashboard = lazy(() => import("./screens/agent/AgentDashboard"));
const SubAgentDisplay = lazy(() => import("./screens/agent/SubAgentDisplay"));
const SubAgentDetails = lazy(() => import("./screens/agent/SubAgentDetails"));
const Withdrawals = lazy(() => import("./screens/agent/Withdrawals"));
const SubAgentDashboard = lazy(() => import("./screens/subagent/SubAgentDashboard"));
const SubAgentRegister = lazy(() => import("./screens/subagent/SubAgentRegister"));

function Loader({ label = "Loading" }) {
  return (
    <div className="full-loader">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}

function Protected({ children, roles, storeScoped = false }) {
  const { loading, isAuthenticated, user } = useAuth();
  const { accessLoading, canUseRoleTools } = useAgentContext();

  if (loading) return <Loader label="Checking your session" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  if (storeScoped && accessLoading) {
    return <Loader label="Checking storefront access" />;
  }
  if (storeScoped && !canUseRoleTools) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function PageLayout({ children }) {
  const location = useLocation();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const lastUnpaidRefreshAt = useRef(0);

  useEffect(() => {
    if (!isAuthenticated || !user?.is_unpaid_agent) return;
    const now = Date.now();
    if (now - lastUnpaidRefreshAt.current < 60_000) return;
    lastUnpaidRefreshAt.current = now;
    refreshUser();
  }, [location.pathname, isAuthenticated, user?.is_unpaid_agent, refreshUser]);

  const noLayoutPaths = [
    "/login",
    "/register",
    "/subagent/register",
    "/activate-registration",
    "/registration/complete",
    "/become-agent",
    "/register/payment",
  ];

  return noLayoutPaths.includes(location.pathname) ? (
    children
  ) : (
    <Layout>
      <RegistrationPaymentBanner />
      {children}
    </Layout>
  );
}

function RoutedApp() {
  const { loading, isValidSubdomain } = useAgentContext();
  const location = useLocation();
  const bypassStoreValidation = [
    "/login",
    "/register",
    "/activate-registration",
    "/registration/complete",
  ].includes(location.pathname);

  if (loading && !bypassStoreValidation) {
    return <Loader label="Loading storefront" />;
  }
  if (!isValidSubdomain && !bypassStoreValidation) {
    return (
      <div className="invalid-store">
        <h1>Storefront not found</h1>
        <p>This agent or sub-agent storefront is unavailable.</p>
        <a className="button primary" href={MAIN_SITE_URL}>
          Go to the main site
        </a>
      </div>
    );
  }

  return (
    <PageLayout>
      <Suspense fallback={<Loader label="Loading page" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/data" element={<DataScreen />} />
          <Route
            path="/data/purchase/:id"
            element={
              <Protected>
                <DataPurchase />
              </Protected>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/activate-registration" element={<ActivateRegistration />} />
          <Route path="/registration/complete" element={<ActivateRegistration />} />
          <Route
            path="/become-agent"
            element={
              <Protected roles={["CUSTOMER"]} storeScoped>
                <BecomeAgent />
              </Protected>
            }
          />
          <Route
            path="/register/payment"
            element={
              <Protected roles={["AGENT", "SUB_AGENT"]}>
                <BecomeAgent mode="payment" />
              </Protected>
            }
          />
          <Route path="/subagent/register" element={<SubAgentRegister />} />
          <Route path="/notices" element={<Notices />} />
          <Route
            path="/orders"
            element={
              <Protected>
                <OrdersList />
              </Protected>
            }
          />
          <Route
            path="/transactions"
            element={
              <Protected>
                <TransactionsList />
              </Protected>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <Protected roles={["ADMIN"]} storeScoped>
                <AdminDashboard />
              </Protected>
            }
          />
          <Route
            path="/admin/users"
            element={
              <Protected roles={["ADMIN"]} storeScoped>
                <AdminUsers />
              </Protected>
            }
          />
          <Route
            path="/admin/users/:userId"
            element={
              <Protected roles={["ADMIN"]} storeScoped>
                <AdminUserDetails />
              </Protected>
            }
          />
          <Route
            path="/admin/data-packages"
            element={
              <Protected roles={["ADMIN"]} storeScoped>
                <AdminPackages />
              </Protected>
            }
          />
          <Route
            path="/admin/notices"
            element={
              <Protected roles={["ADMIN"]} storeScoped>
                <AdminNotices />
              </Protected>
            }
          />
          <Route
            path="/admin/withdrawals"
            element={
              <Protected roles={["ADMIN"]} storeScoped>
                <AdminWithdrawals />
              </Protected>
            }
          />
          <Route
            path="/agent/dashboard"
            element={
              <Protected roles={["AGENT"]} storeScoped>
                <AgentDashboard />
              </Protected>
            }
          />
          <Route
            path="/agent/subagents"
            element={
              <Protected roles={["AGENT"]} storeScoped>
                <SubAgentDisplay />
              </Protected>
            }
          />
          <Route
            path="/agent/subagents/:subAgentId"
            element={
              <Protected roles={["AGENT"]} storeScoped>
                <SubAgentDetails />
              </Protected>
            }
          />
          <Route
            path="/agent/withdrawals"
            element={
              <Protected roles={["AGENT"]} storeScoped>
                <Withdrawals />
              </Protected>
            }
          />
          <Route
            path="/subagent/dashboard"
            element={
              <Protected roles={["SUB_AGENT"]} storeScoped>
                <SubAgentDashboard />
              </Protected>
            }
          />
          <Route
            path="/subagent/withdrawals"
            element={
              <Protected roles={["SUB_AGENT"]} storeScoped>
                <Withdrawals />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PageLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AgentContextProvider>
            <ToastProvider>
              <CompletePaymentModal />
              <RoutedApp />
            </ToastProvider>
          </AgentContextProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
