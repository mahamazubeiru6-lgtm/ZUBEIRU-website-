import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  RotateCw,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
} from "lucide-react";
import DeliverySpeed from "../../components/DeliverySpeed";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../providers/AuthProvider";

const normalizeGhanaPhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00233")) digits = digits.slice(2);
  if (digits.startsWith("233") && digits.length === 12) {
    digits = `0${digits.slice(3)}`;
  } else if (digits.length === 9) {
    digits = `0${digits}`;
  }
  return digits;
};

const statusMeta = (status) => {
  const values = {
    PENDING: { color: "#D97706", icon: Clock3 },
    PROCESSING: { color: "#2563EB", icon: RotateCw },
    DELIVERED: { color: "#7C3AED", icon: Truck },
    COMPLETED: { color: "#059669", icon: CheckCircle2 },
    FAILED: { color: "#DC2626", icon: AlertCircle },
  };
  return values[status] || { color: "#64748B", icon: PackageCheck };
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const TrackDataOrder = () => {
  const { colors } = useTheme();
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedPhone = normalizeGhanaPhone(recipientPhone);
    if (!/^0\d{9}$/.test(normalizedPhone)) {
      setError("Enter a valid 10-digit Ghana phone number.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await authFetch("/data/orders/track-recent/", {
        method: "POST",
        auth: false,
        body: { recipient_phone: normalizedPhone },
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        setError(
          data.message || "We could not find a recent order for this number."
        );
        return;
      }
      setRecipientPhone(normalizedPhone);
      setResult(data);
    } catch {
      setError("The tracker is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const order = result?.data;
  const tracking = result?.tracking;
  const currentStatus = statusMeta(order?.status);
  const StatusIcon = currentStatus.icon;

  return (
    <main style={styles.page(colors)}>
      <section style={styles.hero(colors)}>
        <span style={styles.heroIcon(colors)}>
          <Search size={24} />
        </span>
        <div>
          <span style={styles.eyebrow(colors)}>Recent data order</span>
          <h1 style={styles.title(colors)}>Track your order</h1>
          <p style={styles.subtitle(colors)}>
            Enter the recipient number used for a data order placed on this
            store within the last 5 hours.
          </p>
        </div>
      </section>

      <section style={styles.trackerCard(colors)}>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="tracking-recipient" style={styles.label(colors)}>
            Recipient phone number
          </label>
          <div style={styles.formRow}>
            <div style={styles.inputWrap(colors, Boolean(error))}>
              <Smartphone size={18} color={colors.secondaryText} />
              <input
                id="tracking-recipient"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={recipientPhone}
                onChange={(event) => {
                  setRecipientPhone(event.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. 0244123456"
                aria-describedby="tracking-help"
                style={styles.input(colors)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={styles.submitButton(colors, loading)}
            >
              {loading ? (
                <Loader2 size={17} style={{ animation: "track-spin 0.8s linear infinite" }} />
              ) : (
                <Search size={17} />
              )}
              {loading ? "Checking..." : "Track order"}
            </button>
          </div>
          <p id="tracking-help" style={styles.help(colors)}>
            For privacy, only the newest matching order is shown and results
            are limited to this storefront.
          </p>
        </form>

        <div aria-live="polite">
          {error && (
            <div role="alert" style={styles.error(colors)}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {order && (
            <div style={styles.result(colors)}>
              <div style={styles.resultHeader}>
                <span style={styles.statusIcon(currentStatus.color)}>
                  <StatusIcon size={22} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <span style={styles.resultLabel(colors)}>Current status</span>
                  <h2 style={{ ...styles.resultStatus, color: currentStatus.color }}>
                    {order.status_display || order.status}
                  </h2>
                </div>
                <span style={styles.sourceBadge(colors)}>
                  {tracking?.source === "provider" ? "Live update" : "Saved status"}
                </span>
              </div>

              <p style={styles.resultMessage(colors)}>{result.message}</p>

              {tracking?.live_refresh_failed && (
                <div style={styles.warning(colors)}>
                  <AlertCircle size={16} />
                  The provider could not be reached, so this is the latest
                  status saved by Azoemart.
                </div>
              )}

              <div style={styles.detailsGrid}>
                <Detail label="Order reference" value={`#${order.reference}`} colors={colors} />
                <Detail label="Recipient" value={order.recipient_phone} colors={colors} />
                <Detail
                  label="Package"
                  value={`${order.network} ${Number(order.package_size_gb)}GB`}
                  colors={colors}
                />
                <Detail
                  label="Payment"
                  value={order.payment_status_display || order.payment_status}
                  colors={colors}
                />
                <Detail label="Ordered" value={formatDateTime(order.created_at)} colors={colors} />
                <Detail label="Last updated" value={formatDateTime(order.updated_at)} colors={colors} />
              </div>

              <div style={styles.resultActions}>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setRecipientPhone("");
                  }}
                  style={styles.secondaryButton(colors)}
                >
                  Track another number
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/orders")}
                  style={styles.ordersButton(colors)}
                >
                  View my orders <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside style={styles.notice(colors)}>
        <ShieldCheck size={18} color={colors.btnBg} />
        <span>
          No order price, account details, seller earnings, or provider
          reference is exposed by this tracker.
        </span>
      </aside>

      <DeliverySpeed />

      <style>{`@keyframes track-spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
};

const Detail = ({ label, value, colors }) => (
  <div style={styles.detail(colors)}>
    <span style={styles.detailLabel(colors)}>{label}</span>
    <strong style={styles.detailValue(colors)}>{value}</strong>
  </div>
);

const styles = {
  page: (colors) => ({
    width: "min(100%, 820px)",
    minHeight: "calc(100vh - 140px)",
    margin: "0 auto",
    padding: "clamp(20px, 4vw, 46px) 16px 80px",
    color: colors.text,
  }),
  hero: (colors) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: 15,
    marginBottom: 22,
    padding: "0 2px",
    color: colors.text,
  }),
  heroIcon: (colors) => ({
    width: 50,
    height: 50,
    display: "inline-flex",
    flex: "0 0 auto",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    color: colors.btnBg,
    background: `${colors.btnBg}14`,
  }),
  eyebrow: (colors) => ({
    display: "block",
    marginBottom: 4,
    color: colors.btnBg,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  }),
  title: (colors) => ({
    margin: 0,
    color: colors.heading,
    fontSize: "clamp(25px, 5vw, 36px)",
    letterSpacing: "-0.025em",
  }),
  subtitle: (colors) => ({
    maxWidth: 650,
    margin: "8px 0 0",
    color: colors.secondaryText,
    fontSize: 14,
    lineHeight: 1.6,
  }),
  trackerCard: (colors) => ({
    padding: "clamp(18px, 4vw, 28px)",
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    background: colors.raisedBg,
    boxShadow: `0 18px 50px ${colors.shadow || "rgba(0,0,0,0.08)"}`,
  }),
  label: (colors) => ({
    display: "block",
    marginBottom: 8,
    color: colors.heading,
    fontSize: 13,
    fontWeight: 750,
  }),
  formRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  inputWrap: (colors, invalid) => ({
    minWidth: "min(100%, 250px)",
    minHeight: 48,
    display: "flex",
    flex: "1 1 330px",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    border: `1.5px solid ${invalid ? colors.error : colors.border}`,
    borderRadius: 12,
    background: colors.mainBg,
  }),
  input: (colors) => ({
    minWidth: 0,
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    color: colors.text,
    fontFamily: "inherit",
    fontSize: 15,
  }),
  submitButton: (colors, disabled) => ({
    minHeight: 48,
    display: "inline-flex",
    flex: "1 0 150px",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 20px",
    border: "none",
    borderRadius: 12,
    background: colors.btnBg,
    color: colors.btnText,
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.72 : 1,
    fontFamily: "inherit",
    fontSize: 13.5,
    fontWeight: 800,
  }),
  help: (colors) => ({
    margin: "9px 0 0",
    color: colors.secondaryText,
    fontSize: 11.5,
    lineHeight: 1.5,
  }),
  error: (colors) => ({
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginTop: 18,
    padding: "12px 14px",
    border: `1px solid ${colors.error}44`,
    borderRadius: 11,
    color: colors.error,
    background: `${colors.error}0d`,
    fontSize: 13,
  }),
  result: (colors) => ({
    marginTop: 24,
    paddingTop: 22,
    borderTop: `1px solid ${colors.border}`,
  }),
  resultHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  statusIcon: (color) => ({
    width: 46,
    height: 46,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    color,
    background: `${color}14`,
  }),
  resultLabel: (colors) => ({
    display: "block",
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: 700,
  }),
  resultStatus: {
    margin: "2px 0 0",
    fontSize: 21,
    textTransform: "capitalize",
  },
  sourceBadge: (colors) => ({
    marginLeft: "auto",
    padding: "5px 9px",
    border: `1px solid ${colors.border}`,
    borderRadius: 999,
    color: colors.secondaryText,
    background: colors.subtleBg,
    fontSize: 10.5,
    fontWeight: 750,
  }),
  resultMessage: (colors) => ({
    margin: "15px 0",
    color: colors.text,
    fontSize: 13.5,
    lineHeight: 1.55,
  }),
  warning: (colors) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 15,
    padding: "10px 12px",
    borderRadius: 10,
    color: colors.warning,
    background: `${colors.warning}12`,
    fontSize: 12,
    lineHeight: 1.5,
  }),
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
    gap: 10,
  },
  detail: (colors) => ({
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    padding: "11px 12px",
    borderRadius: 11,
    background: colors.subtleBg,
  }),
  detailLabel: (colors) => ({
    color: colors.secondaryText,
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  }),
  detailValue: (colors) => ({
    overflowWrap: "anywhere",
    color: colors.heading,
    fontSize: 13,
  }),
  resultActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
  },
  secondaryButton: (colors) => ({
    minHeight: 40,
    padding: "8px 13px",
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: colors.mainBg,
    color: colors.text,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 700,
  }),
  ordersButton: (colors) => ({
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 13px",
    border: "none",
    borderRadius: 10,
    background: `${colors.btnBg}12`,
    color: colors.btnBg,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 12.5,
    fontWeight: 750,
  }),
  notice: (colors) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    marginTop: 16,
    padding: "12px 14px",
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    color: colors.secondaryText,
    background: colors.raisedBg,
    fontSize: 11.5,
    lineHeight: 1.55,
  }),
};

export default TrackDataOrder;
