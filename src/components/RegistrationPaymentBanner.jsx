import { AlertCircle, ArrowRight, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

export default function RegistrationPaymentBanner() {
  const {
    isUnpaidAgent,
    initiateRegistrationPayment,
    pollRegistrationStatus,
    refreshUser,
    clearUnpaidGate,
    user,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isUnpaidAgent || dismissed) return null;

  const completePayment = async () => {
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
      showToast("Registration completed.", "success");
      navigate("/agent/dashboard");
      return;
    }

    if (payment.already_paid) {
      const confirmation = await pollRegistrationStatus(user?.id);
      if (confirmation.ok) {
        clearUnpaidGate();
        showToast("Registration complete.", "success");
        navigate("/agent/dashboard");
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
    <section className="registration-banner" aria-label="Registration payment reminder">
      <AlertCircle size={20} />
      <div>
        <strong>Complete your agent registration</strong>
        <span>Finish payment to unlock all agent tools.</span>
      </div>
      <button type="button" onClick={completePayment} disabled={busy}>
        {busy ? <Loader2 className="spin-icon" size={17} /> : <ArrowRight size={17} />}
        {busy ? "Preparing" : "Complete payment"}
      </button>
      <button
        type="button"
        className="registration-banner-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss reminder"
      >
        <X size={17} />
      </button>
    </section>
  );
}

