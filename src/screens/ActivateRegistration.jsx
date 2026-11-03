import { AlertCircle, CheckCircle, Coins, Loader2, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

export default function ActivateRegistration() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { initiateRegistrationPayment, pollRegistrationStatus } = useAuth();
  const autoStarted = useRef(false);

  const params = new URLSearchParams(location.search);
  const userId =
    location.state?.userId ||
    params.get("user_id") ||
    localStorage.getItem("registration_user_id");

  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (userId) localStorage.setItem("registration_user_id", userId);
  }, [userId]);

  const finishActivation = useCallback(async () => {
    setWaiting(true);
    setMessage("Confirming your payment and activating your account…");
    const confirmation = await pollRegistrationStatus(userId);

    if (!confirmation.ok) {
      setMessage("");
      setWaiting(false);
      setBusy(false);
      setError(confirmation.error || "Payment is still being confirmed.");
      return;
    }

    localStorage.removeItem("registration_user_id");
    const dashboard =
      localStorage.getItem("registration_dashboard_url") ||
      (confirmation.data?.role === "SUB_AGENT"
        ? "/subagent/dashboard"
        : "/agent/dashboard");
    localStorage.removeItem("registration_dashboard_url");
    showToast("Your account is active. Welcome!", "success");
    navigate(dashboard, { replace: true });
  }, [navigate, pollRegistrationStatus, showToast, userId]);

  const startPayment = useCallback(async () => {
    if (!userId) {
      setError("Missing registration reference. Sign in again to continue.");
      return;
    }

    setBusy(true);
    setError("");
    const result = await initiateRegistrationPayment({ userId });

    if (!result.ok) {
      setError(result.error || "Could not initiate payment.");
      setBusy(false);
      return;
    }

    const payment = result.data || {};
    if (payment.zero_fee || payment.already_paid) {
      await finishActivation();
      return;
    }

    if (payment.authorization_url) {
      localStorage.setItem("registration_dashboard_url", "/agent/dashboard");
      window.location.href = payment.authorization_url;
      return;
    }

    setError("Unexpected payment response. Please try again.");
    setBusy(false);
  }, [finishActivation, initiateRegistrationPayment, userId]);

  useEffect(() => {
    const returnedFromPaystack =
      location.pathname === "/registration/complete" ||
      params.has("reference") ||
      params.has("trxref");

    if (returnedFromPaystack && userId && !autoStarted.current) {
      autoStarted.current = true;
      setBusy(true);
      finishActivation();
    }
  }, [finishActivation, location.pathname, params, userId]);

  return (
    <main className="auth-flow-page">
      <section className="auth-flow-card">
        <div className="auth-flow-visual">
          <span><Coins size={34} /></span>
          <p className="eyebrow">Secure activation</p>
          <h1>Finish setting up your store</h1>
          <p>Your account has been created. Complete the registration payment to activate your dashboard and storefront.</p>
          <ul>
            <li><ShieldCheck size={17} /> Payment is verified by Paystack</li>
            <li><CheckCircle size={17} /> Access is activated automatically</li>
          </ul>
        </div>

        <div className="auth-flow-content">
          <span className="auth-flow-icon"><Coins size={27} /></span>
          <p className="eyebrow">Almost there</p>
          <h2>Activate registration</h2>
          <p>Use the button below to continue an existing payment or start a new secure checkout.</p>

          {!userId && (
            <div className="flow-alert error">
              <AlertCircle size={18} />
              No registration reference was found.
            </div>
          )}
          {error && (
            <div className="flow-alert error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {waiting && (
            <div className="flow-alert success">
              <Loader2 className="spin-icon" size={18} />
              {message}
            </div>
          )}

          <button
            className="button primary auth-flow-action"
            type="button"
            onClick={startPayment}
            disabled={busy || waiting || !userId}
          >
            {busy || waiting ? <Loader2 className="spin-icon" size={18} /> : <Coins size={18} />}
            {waiting ? "Confirming payment" : busy ? "Preparing checkout" : "Continue to payment"}
          </button>
          <Link className="auth-flow-link" to="/login">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}

