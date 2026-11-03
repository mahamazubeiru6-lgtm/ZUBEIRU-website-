import { AlertCircle, ArrowRight, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";

export default function CompletePaymentModal() {
  const {
    unpaidGate,
    clearUnpaidGate,
    initiateRegistrationPayment,
    pollRegistrationStatus,
    refreshUser,
    user,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!unpaidGate?.active) return null;

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
      navigate("/agent/dashboard");
      return;
    }

    if (payment.already_paid) {
      const confirmation = await pollRegistrationStatus(user?.id);
      if (confirmation.ok) {
        clearUnpaidGate();
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
    <div className="payment-modal-backdrop" role="presentation">
      <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
        <button
          type="button"
          className="payment-modal-close"
          onClick={clearUnpaidGate}
          disabled={busy}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <span className="payment-modal-icon"><AlertCircle size={28} /></span>
        <h2 id="payment-modal-title">Registration payment required</h2>
        <p>{unpaidGate.message || "Complete your registration payment to continue."}</p>
        <button className="button primary" type="button" onClick={completePayment} disabled={busy}>
          {busy ? <Loader2 className="spin-icon" size={18} /> : <ArrowRight size={18} />}
          {busy ? "Preparing payment" : "Complete payment"}
        </button>
      </section>
    </div>
  );
}

