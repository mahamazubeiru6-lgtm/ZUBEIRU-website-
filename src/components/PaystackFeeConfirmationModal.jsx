import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CreditCard, LockKeyhole, X } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `GH₵${amount.toFixed(2)}` : "—";
};

const PaystackFeeConfirmationModal = ({
  open,
  authorizationUrl,
  breakdown,
  title = "Review payment total",
  description = "Confirm the full amount before continuing to Paystack.",
  baseAmountLabel = "Order amount",
  canPayLater = true,
  onClose,
  onContinue,
}) => {
  const { colors } = useTheme();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && canPayLater) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canPayLater, onClose, open]);

  useEffect(() => {
    if (!open) setRedirecting(false);
  }, [open]);

  if (!open || !authorizationUrl || !breakdown) return null;

  const continueToPaystack = () => {
    if (redirecting) return;
    setRedirecting(true);
    if (onContinue) {
      onContinue(authorizationUrl);
      return;
    }
    window.location.assign(authorizationUrl);
  };

  const modal = (
    <div
      className="paystack-fee-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          canPayLater &&
          !redirecting
        ) {
          onClose?.();
        }
      }}
    >
      <section
        className="paystack-fee-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paystack-fee-title"
        style={{
          background: colors.raisedBg,
          borderColor: colors.border,
          boxShadow: `0 24px 80px ${colors.shadowStrong || "rgba(0,0,0,.28)"}`,
        }}
      >
        <div className="paystack-fee-header">
          <div
            className="paystack-fee-icon"
            style={{ background: `${colors.btnBg}18`, color: colors.btnBg }}
          >
            <CreditCard size={21} />
          </div>
          <div className="paystack-fee-heading">
            <h2 id="paystack-fee-title" style={{ color: colors.heading }}>
              {title}
            </h2>
            <p style={{ color: colors.secondaryText }}>{description}</p>
          </div>
          {canPayLater && (
            <button
              type="button"
              className="paystack-fee-close"
              onClick={onClose}
              disabled={redirecting}
              aria-label="Close payment summary"
              style={{ color: colors.secondaryText }}
            >
              <X size={19} />
            </button>
          )}
        </div>

        <div
          className="paystack-fee-summary"
          style={{ background: colors.mainBg, borderColor: colors.border }}
        >
          <PaymentRow
            label={baseAmountLabel}
            value={money(breakdown.base_amount)}
            colors={colors}
          />
          <PaymentRow
            label={breakdown.fee_label || "Paystack transaction fee"}
            value={money(breakdown.transaction_fee)}
            colors={colors}
          />
          <div style={{ height: 1, background: colors.border }} />
          <PaymentRow
            label="Total to pay"
            value={money(breakdown.total_amount)}
            colors={colors}
            total
          />
        </div>

        <div
          className="paystack-fee-security"
          style={{ color: colors.secondaryText }}
        >
          <LockKeyhole size={14} color={colors.success || colors.btnBg} />
          Paystack securely processes the payment. The transaction fee applies
          only to this Paystack checkout.
        </div>

        <div className="paystack-fee-actions">
          {canPayLater && (
            <button
              type="button"
              className="paystack-fee-secondary"
              onClick={onClose}
              disabled={redirecting}
              style={{
                borderColor: colors.border,
                color: colors.text,
                background: colors.raisedBg,
              }}
            >
              Pay later
            </button>
          )}
          <button
            type="button"
            className="paystack-fee-primary"
            onClick={continueToPaystack}
            disabled={redirecting}
            style={{ background: colors.btnBg, color: colors.btnText }}
          >
            {redirecting ? "Opening Paystack…" : "Continue to Paystack"}
            {!redirecting && <ArrowRight size={16} />}
          </button>
        </div>

        <style>{`
          .paystack-fee-backdrop {
            position: fixed;
            inset: 0;
            z-index: 4000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18px;
            background: rgba(7, 12, 24, .62);
            backdrop-filter: blur(5px);
          }
          .paystack-fee-modal {
            width: min(100%, 440px);
            border: 1px solid;
            border-radius: 20px;
            padding: 22px;
            box-sizing: border-box;
          }
          .paystack-fee-header {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }
          .paystack-fee-icon {
            width: 42px;
            height: 42px;
            border-radius: 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
          }
          .paystack-fee-heading { flex: 1; min-width: 0; }
          .paystack-fee-heading h2 {
            margin: 1px 0 5px;
            font-size: 18px;
            line-height: 1.25;
          }
          .paystack-fee-heading p {
            margin: 0;
            font-size: 12.5px;
            line-height: 1.55;
          }
          .paystack-fee-close {
            width: 34px;
            height: 34px;
            border: 0;
            background: transparent;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
          .paystack-fee-summary {
            margin-top: 20px;
            border: 1px solid;
            border-radius: 15px;
            padding: 5px 15px;
          }
          .paystack-fee-row {
            min-height: 46px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            font-size: 13px;
          }
          .paystack-fee-row.total {
            min-height: 54px;
            font-size: 15px;
            font-weight: 800;
          }
          .paystack-fee-security {
            display: flex;
            align-items: flex-start;
            gap: 7px;
            margin: 14px 2px 18px;
            font-size: 11.5px;
            line-height: 1.5;
          }
          .paystack-fee-security svg { flex: 0 0 auto; margin-top: 1px; }
          .paystack-fee-actions { display: flex; gap: 9px; }
          .paystack-fee-actions button {
            min-height: 46px;
            border-radius: 12px;
            padding: 11px 14px;
            font: inherit;
            font-size: 13px;
            font-weight: 750;
            cursor: pointer;
          }
          .paystack-fee-actions button:disabled { opacity: .68; cursor: wait; }
          .paystack-fee-secondary { flex: 0 0 105px; border: 1px solid; }
          .paystack-fee-primary {
            flex: 1;
            border: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }
          @media (max-width: 560px) {
            .paystack-fee-backdrop {
              align-items: flex-end;
              padding: 0;
            }
            .paystack-fee-modal {
              width: 100%;
              border-radius: 22px 22px 0 0;
              padding: 20px 16px max(18px, env(safe-area-inset-bottom));
              max-height: 92vh;
              overflow-y: auto;
            }
            .paystack-fee-actions { flex-direction: column-reverse; }
            .paystack-fee-secondary, .paystack-fee-primary { width: 100%; flex-basis: auto; }
          }
        `}</style>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
};

const PaymentRow = ({ label, value, colors, total = false }) => (
  <div className={`paystack-fee-row${total ? " total" : ""}`}>
    <span style={{ color: total ? colors.heading : colors.secondaryText }}>
      {label}
    </span>
    <strong style={{ color: total ? colors.btnBg : colors.text }}>{value}</strong>
  </div>
);

export default PaystackFeeConfirmationModal;
