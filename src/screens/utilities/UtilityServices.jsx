import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckCircle2,
  CreditCard,
  Droplets,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Tv,
  Zap,
} from "lucide-react";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { useTheme } from "../../hooks/useTheme";
import PaystackFeeConfirmationModal from "../../components/PaystackFeeConfirmationModal";
import {
  ensureUtilityGuestToken,
  getUtilityGuestToken,
  saveUtilityGuestToken,
  utilityGuestTokenHeaders,
} from "../../utils/utilityOrders";
import "./utilityServices.css";


const SERVICE_PRESENTATION = {
  ecg: { icon: Zap, shortLabel: "ECG", color: "#f59e0b" },
  gotv: { icon: Tv, shortLabel: "GOtv", color: "#ef4444" },
  dstv: { icon: Tv, shortLabel: "DSTV", color: "#2563eb" },
  startimes: { icon: Tv, shortLabel: "StarTimes", color: "#7c3aed" },
  water: { icon: Droplets, shortLabel: "Ghana Water", color: "#0891b2" },
};

const money = (value) => `GH₵${Number(value || 0).toFixed(2)}`;

const UtilityServices = () => {
  const { authFetch, isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const location = useLocation();
  const [services, setServices] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [form, setForm] = useState({ recipient: "", phone_number: "", amount: "", guest_name: "" });
  const [lookup, setLookup] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [paystackPayment, setPaystackPayment] = useState(null);
  const verifiedCallbackRef = useRef(null);

  const selectedService = useMemo(
    () => services.find((service) => service.service_type === selectedType),
    [selectedType, services]
  );

  const guestHeaders = useCallback(
    () => utilityGuestTokenHeaders(getUtilityGuestToken()),
    []
  );

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated && !getUtilityGuestToken()) return;
    try {
      const response = await authFetch("/data/utility-orders/", {
        auth: isAuthenticated,
        headers: guestHeaders(),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setOrders(payload.data || []);
    } catch {
      // Orders are secondary to checkout; keep the page usable if this fails.
    }
  }, [authFetch, guestHeaders, isAuthenticated]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await authFetch("/data/utilities/services/", { auth: false });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Could not load utility services.");
        if (!active) return;
        const rows = payload.data || [];
        setServices(rows);
        setSelectedType((current) => current || rows.find((row) => row.enabled)?.service_type || "");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    loadOrders();
    return () => { active = false; };
  }, [authFetch, loadOrders, showToast]);

  const verifyOrder = useCallback(async (orderId) => {
    if (!orderId) return;
    setVerifying(true);
    try {
      const response = await authFetch(`/data/utility-orders/${orderId}/verify-payment/`, {
        auth: isAuthenticated,
        headers: guestHeaders(),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Could not verify this payment.");
      showToast(payload.message || "Payment status updated.", payload.status === "error" ? "error" : "success");
      await loadOrders();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setVerifying(false);
    }
  }, [authFetch, guestHeaders, isAuthenticated, loadOrders, showToast]);

  useEffect(() => {
    if (authLoading) return;
    const callbackOrderId = new URLSearchParams(location.search).get("utility_order");
    if (callbackOrderId && verifiedCallbackRef.current !== callbackOrderId) {
      verifiedCallbackRef.current = callbackOrderId;
      verifyOrder(callbackOrderId);
    }
  }, [authLoading, location.search, verifyOrder]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setLookup(null);
  };

  const lookupAccount = async () => {
    if (!selectedService?.enabled || !form.recipient.trim()) {
      showToast(`Enter the ${selectedService?.recipient_label?.toLowerCase() || "account number"}.`, "error");
      return;
    }
    setLookingUp(true);
    try {
      const response = await authFetch("/data/utilities/lookup/", {
        method: "POST",
        auth: false,
        body: { service_type: selectedType, recipient: form.recipient },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Account lookup failed.");
      setLookup(payload.data);
      showToast("Account verified. Confirm the name before payment.", "success");
    } catch (error) {
      setLookup(null);
      showToast(error.message, "error");
    } finally {
      setLookingUp(false);
    }
  };

  const startPayment = async () => {
    if (!lookup) {
      showToast("Verify the account before continuing.", "error");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0 || Number(form.amount) > 5000) {
      showToast("Enter an amount between GH₵0.01 and GH₵5,000.", "error");
      return;
    }
    if (selectedService?.requires_phone_number && !form.phone_number.trim()) {
      showToast("Enter the mobile number registered to this ECG meter.", "error");
      return;
    }

    setSubmitting(true);
    let token = isAuthenticated ? getUtilityGuestToken() : ensureUtilityGuestToken();
    try {
      const createResponse = await authFetch("/data/utility-orders/", {
        method: "POST",
        auth: isAuthenticated,
        headers: utilityGuestTokenHeaders(token),
        body: {
          service_type: selectedType,
          recipient: form.recipient,
          phone_number: form.phone_number,
          amount: form.amount,
          guest_name: form.guest_name,
        },
      });
      const created = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) throw new Error(created.message || "Could not create the utility order.");
      token = created.data?.guest_token || token;
      if (token) saveUtilityGuestToken(token);
      const orderId = created.data?.order?.id;

      const paymentResponse = await authFetch(`/data/utility-orders/${orderId}/pay/`, {
        method: "POST",
        auth: isAuthenticated,
        headers: utilityGuestTokenHeaders(token),
      });
      const payment = await paymentResponse.json().catch(() => ({}));
      if (!paymentResponse.ok) throw new Error(payment.message || "Could not start payment.");
      setPaystackPayment({
        authorizationUrl: payment.data.authorization_url,
        breakdown: payment.data.payment_breakdown,
      });
      await loadOrders();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="utility-page" style={{ color: colors.text }}>
      <section className="utility-hero" style={{ background: colors.raisedBg, borderColor: colors.border }}>
        <div>
          <span className="utility-eyebrow" style={{ color: colors.btnBg }}><ShieldCheck size={15} /> Secure utility payments</span>
          <h1 style={{ color: colors.heading }}>Pay bills and TV subscriptions</h1>
          <p style={{ color: colors.secondaryText }}>Verify the account holder first, review the name, and pay securely through Paystack.</p>
        </div>
        <Gauge size={54} color={colors.btnBg} />
      </section>

      {loading ? (
        <div className="utility-loading" style={{ color: colors.secondaryText }}><Loader2 className="utility-spin" /> Loading services…</div>
      ) : (
        <div className="utility-layout">
          <section className="utility-checkout" style={{ background: colors.raisedBg, borderColor: colors.border }}>
            <h2 style={{ color: colors.heading }}>Choose a service</h2>
            <div className="utility-service-grid">
              {services.map((service) => {
                const presentation = SERVICE_PRESENTATION[service.service_type];
                const Icon = presentation.icon;
                const active = service.service_type === selectedType;
                return (
                  <button
                    type="button"
                    key={service.service_type}
                    disabled={!service.enabled}
                    className={`utility-service-card${active ? " active" : ""}`}
                    style={{
                      borderColor: active ? colors.btnBg : colors.border,
                      background: active ? `${colors.btnBg}10` : colors.mainBg,
                      color: colors.text,
                    }}
                    onClick={() => {
                      setSelectedType(service.service_type);
                      setLookup(null);
                    }}
                  >
                    <span style={{ background: `${presentation.color}18`, color: presentation.color }}><Icon size={20} /></span>
                    <strong>{presentation.shortLabel}</strong>
                    {!service.enabled && <small>Unavailable</small>}
                  </button>
                );
              })}
            </div>

            {selectedService ? (
              <div className="utility-form">
                <label>
                  <span style={{ color: colors.secondaryText }}>{selectedService.recipient_label}</span>
                  <input
                    value={form.recipient}
                    onChange={(event) => updateField("recipient", event.target.value)}
                    placeholder={`Enter ${selectedService.recipient_label.toLowerCase()}`}
                    style={{ background: colors.mainBg, borderColor: colors.border, color: colors.text }}
                  />
                </label>
                <button type="button" className="utility-lookup-button" onClick={lookupAccount} disabled={lookingUp} style={{ background: colors.btnBg, color: colors.btnText }}>
                  {lookingUp ? <Loader2 className="utility-spin" size={17} /> : <Search size={17} />}
                  {lookingUp ? "Verifying…" : "Verify account"}
                </button>

                {lookup && (
                  <div className="utility-verified" style={{ background: `${colors.success}12`, borderColor: `${colors.success}55` }}>
                    <CheckCircle2 color={colors.success} size={22} />
                    <div><small style={{ color: colors.secondaryText }}>Account name</small><strong style={{ color: colors.heading }}>{lookup.customer_name}</strong></div>
                  </div>
                )}

                {selectedService.requires_phone_number && (
                  <label>
                    <span style={{ color: colors.secondaryText }}>Phone registered to the meter</span>
                    <input value={form.phone_number} onChange={(event) => updateField("phone_number", event.target.value)} placeholder="0241234567" style={{ background: colors.mainBg, borderColor: colors.border, color: colors.text }} />
                  </label>
                )}
                {!isAuthenticated && (
                  <label>
                    <span style={{ color: colors.secondaryText }}>Your name (optional)</span>
                    <input value={form.guest_name} onChange={(event) => setForm((current) => ({ ...current, guest_name: event.target.value }))} placeholder="Name for this receipt" style={{ background: colors.mainBg, borderColor: colors.border, color: colors.text }} />
                  </label>
                )}
                <label>
                  <span style={{ color: colors.secondaryText }}>Amount (GHS)</span>
                  <input type="number" min="0.01" max="5000" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" style={{ background: colors.mainBg, borderColor: colors.border, color: colors.text }} />
                </label>
                <button type="button" className="utility-pay-button" onClick={startPayment} disabled={submitting || !lookup} style={{ background: colors.btnBg, color: colors.btnText }}>
                  {submitting ? <Loader2 className="utility-spin" size={18} /> : <CreditCard size={18} />}
                  {submitting ? "Preparing payment…" : "Review and pay"}
                </button>
              </div>
            ) : (
              <p style={{ color: colors.secondaryText }}>No utility provider is configured yet.</p>
            )}
          </section>

          <aside className="utility-orders" style={{ background: colors.raisedBg, borderColor: colors.border }}>
            <div className="utility-orders-header">
              <div><h2 style={{ color: colors.heading }}>Recent payments</h2><p style={{ color: colors.secondaryText }}>Receipts and current status</p></div>
              <button type="button" onClick={loadOrders} aria-label="Refresh utility orders" style={{ color: colors.btnBg, borderColor: colors.border }}><RefreshCw size={16} /></button>
            </div>
            {orders.length ? orders.map((order) => (
              <article key={order.id} className="utility-order-card" style={{ background: colors.mainBg, borderColor: colors.border }}>
                <div><strong style={{ color: colors.heading }}>{order.service_label}</strong><span className={`utility-status ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></div>
                <p style={{ color: colors.secondaryText }}>{order.customer_name} · {order.recipient}</p>
                <div><b style={{ color: colors.text }}>{money(order.amount)}</b>{order.receipt_reference && <code>{order.receipt_reference}</code>}</div>
                {order.status === "PROCESSING" && <button type="button" disabled={verifying} onClick={() => verifyOrder(order.id)}>{verifying ? "Checking…" : "Check status"}</button>}
              </article>
            )) : <div className="utility-empty" style={{ color: colors.secondaryText }}><CreditCard size={30} /><p>Your utility receipts will appear here.</p></div>}
          </aside>
        </div>
      )}

      <PaystackFeeConfirmationModal
        open={Boolean(paystackPayment)}
        authorizationUrl={paystackPayment?.authorizationUrl}
        breakdown={paystackPayment?.breakdown}
        title="Review your utility payment"
        description="The bill amount and Paystack checkout fee are shown separately."
        canPayLater={false}
      />
    </main>
  );
};

export default UtilityServices;
