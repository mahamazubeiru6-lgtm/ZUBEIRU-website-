import {
  ArrowRight,
  Building2,
  CheckCircle,
  Globe,
  Loader2,
  Phone,
  ShieldCheck,
  Store,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

export default function BecomeAgent({ mode = "upgrade" }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    user,
    isAuthenticated,
    becomeAgent,
    initiateRegistrationPayment,
    pollRegistrationStatus,
    refreshUser,
    clearUnpaidGate,
  } = useAuth();

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    shop_url: "",
    shop_name: "",
    shop_description: "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone_number: user?.phone_number || "",
  });

  const paymentMode = mode === "payment";

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const validateShopUrl = (value) => {
    const url = value.trim();
    if (!url) return "Store URL is required";
    if (url.length < 3) return "Use at least 3 characters";
    if (url.length > 30) return "Use no more than 30 characters";
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(url)) {
      return "Use lowercase letters, numbers, and single hyphens";
    }
    if (url.includes("--")) return "Consecutive hyphens are not allowed";
    return "";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === "shop_url"
        ? value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")
        : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const submitUpgrade = async (event) => {
    event.preventDefault();
    const shopUrlError = validateShopUrl(form.shop_url);
    if (shopUrlError) {
      setErrors({ shop_url: shopUrlError });
      return;
    }

    setBusy(true);
    const payload = Object.fromEntries(
      Object.entries(form)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value)
    );
    const result = await becomeAgent(payload);

    if (!result.ok) {
      setErrors(result.errors || {});
      showToast(result.error || "Could not upgrade account.", "error");
      setBusy(false);
      return;
    }

    const registration = result.data?.registration || {};
    if (!registration.requires_fee) {
      await refreshUser();
      showToast("You are now an agent.", "success");
      navigate("/agent/dashboard", { replace: true });
      return;
    }

    localStorage.setItem("registration_user_id", result.data.user_id);
    localStorage.setItem("registration_dashboard_url", "/agent/dashboard");

    if (registration.authorization_url) {
      window.location.href = registration.authorization_url;
      return;
    }

    navigate("/activate-registration", {
      state: { userId: result.data.user_id },
    });
  };

  const completeExistingPayment = async () => {
    setBusy(true);
    const result = await initiateRegistrationPayment();

    if (!result.ok) {
      showToast(result.error || "Could not start payment.", "error");
      setBusy(false);
      return;
    }

    const payment = result.data || {};
    if (payment.zero_fee) {
      await refreshUser();
      clearUnpaidGate();
      navigate("/agent/dashboard", { replace: true });
      return;
    }

    if (payment.already_paid) {
      const confirmation = await pollRegistrationStatus(user?.id);
      if (confirmation.ok) {
        clearUnpaidGate();
        navigate("/agent/dashboard", { replace: true });
      } else {
        showToast(confirmation.error, "warning");
        setBusy(false);
      }
      return;
    }

    if (payment.authorization_url) {
      localStorage.setItem("registration_user_id", user?.id || "");
      localStorage.setItem("registration_dashboard_url", "/agent/dashboard");
      window.location.href = payment.authorization_url;
      return;
    }

    showToast("Unexpected payment response.", "error");
    setBusy(false);
  };

  return (
    <main className="auth-flow-page">
      <section className="auth-flow-card become-agent-card">
        <div className="auth-flow-visual">
          <span><TrendingUp size={34} /></span>
          <p className="eyebrow">{paymentMode ? "Complete registration" : "Grow with DataHub"}</p>
          <h1>{paymentMode ? "Unlock your agent account" : "Turn your account into a storefront"}</h1>
          <p>
            {paymentMode
              ? "Complete the pending registration payment to access your dashboard."
              : "Create your branded data storefront, manage pricing, and grow a sub-agent network."}
          </p>
          <ul>
            <li><Store size={17} /> Branded storefront URL</li>
            <li><Users size={17} /> Sub-agent management</li>
            <li><ShieldCheck size={17} /> Secure earnings and withdrawals</li>
          </ul>
        </div>

        <div className="auth-flow-content">
          <span className="auth-flow-icon">{paymentMode ? <ShieldCheck size={27} /> : <Store size={27} />}</span>
          <p className="eyebrow">{paymentMode ? "Payment pending" : "Agent application"}</p>
          <h2>{paymentMode ? "Complete your payment" : "Set up your store"}</h2>

          {paymentMode ? (
            <>
              <p>Your account is ready. Complete payment to activate all agent tools.</p>
              <button className="button primary auth-flow-action" type="button" onClick={completeExistingPayment} disabled={busy}>
                {busy ? <Loader2 className="spin-icon" size={18} /> : <ArrowRight size={18} />}
                {busy ? "Preparing checkout" : "Continue to payment"}
              </button>
            </>
          ) : (
            <form className="agent-upgrade-form" onSubmit={submitUpgrade}>
              <div className="form-grid two">
                <label>
                  <span><User size={15} /> First name</span>
                  <input name="first_name" value={form.first_name} onChange={handleChange} />
                </label>
                <label>
                  <span><User size={15} /> Last name</span>
                  <input name="last_name" value={form.last_name} onChange={handleChange} />
                </label>
              </div>
              <label>
                <span><Phone size={15} /> Phone number</span>
                <input name="phone_number" value={form.phone_number} onChange={handleChange} />
              </label>
              <label>
                <span><Building2 size={15} /> Store name</span>
                <input name="shop_name" value={form.shop_name} onChange={handleChange} placeholder="My Data Store" />
              </label>
              <label>
                <span><Globe size={15} /> Store URL</span>
                <div className="store-url-input">
                  <input name="shop_url" value={form.shop_url} onChange={handleChange} placeholder="my-store" />
                  <small>.{process.env.REACT_APP_STOREFRONT_DOMAIN || "lvh.me"}</small>
                </div>
                {errors.shop_url && <em>{Array.isArray(errors.shop_url) ? errors.shop_url[0] : errors.shop_url}</em>}
              </label>
              <label>
                <span><Store size={15} /> Description</span>
                <textarea name="shop_description" value={form.shop_description} onChange={handleChange} rows={3} />
              </label>
              <button className="button primary auth-flow-action" type="submit" disabled={busy}>
                {busy ? <Loader2 className="spin-icon" size={18} /> : <CheckCircle size={18} />}
                {busy ? "Creating storefront" : "Become an agent"}
              </button>
            </form>
          )}

          <Link className="auth-flow-link" to="/">Return to DataHub</Link>
        </div>
      </section>
    </main>
  );
}

