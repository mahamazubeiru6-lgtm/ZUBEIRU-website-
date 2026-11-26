import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  TrendingUp,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../providers/ToastProvider";
import PaystackFeeConfirmationModal from "../components/PaystackFeeConfirmationModal";
import "./wallet.css";

const PAGE_SIZE = 12;

const money = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const TYPE_META = {
  DEPOSIT: { label: "Deposit", icon: ArrowDownLeft, direction: "credit" },
  COMMISSION: { label: "Commission", icon: TrendingUp, direction: "credit" },
  REFUND: { label: "Refund", icon: ArrowDownLeft, direction: "credit" },
  WITHDRAWAL: { label: "Withdrawal", icon: ArrowUpRight, direction: "debit" },
  PURCHASE: { label: "Purchase", icon: ShoppingBag, direction: "debit" },
  TRANSFER: { label: "Transfer", icon: ArrowUpRight, direction: "debit" },
  REGISTRATION_FEE: { label: "Registration fee", icon: CreditCard, direction: "debit" },
};

const STATUS_META = {
  COMPLETED: { label: "Completed", icon: CheckCircle2 },
  PENDING: { label: "Pending", icon: Clock3 },
  FAILED: { label: "Failed", icon: XCircle },
  CANCELLED: { label: "Cancelled", icon: XCircle },
};

const extractError = (payload, fallback) => {
  if (payload?.message) return payload.message;
  if (payload?.detail) return payload.detail;
  return fallback;
};

export default function Wallet() {
  const { authFetch, user } = useAuth();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const callbackPayment = searchParams.get("top_up");
  const verifiedCallback = useRef(null);

  const [wallet, setWallet] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [showFunding, setShowFunding] = useState(false);
  const [fundingAmount, setFundingAmount] = useState("");
  const [startingPayment, setStartingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(null);
  const [paystackPayment, setPaystackPayment] = useState(null);

  const fetchWallet = useCallback(async () => {
    const response = await authFetch("/accounts/wallet/");
    const payload = await response.json();
    if (!response.ok || payload.status !== "success") {
      throw new Error(extractError(payload, "Could not load your wallet."));
    }
    setWallet(payload.data);
    window.dispatchEvent(
      new CustomEvent("wallet-balance-updated", {
        detail: { balance: payload.data?.balance ?? 0 },
      })
    );
  }, [authFetch]);

  const fetchSummary = useCallback(async () => {
    const response = await authFetch("/accounts/transactions/summary/");
    const payload = await response.json();
    if (!response.ok || payload.status !== "success") {
      throw new Error(extractError(payload, "Could not load the wallet summary."));
    }
    setSummary(payload.data?.summary || null);
  }, [authFetch]);

  const fetchTransactions = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      user: user.id,
    });
    if (type !== "ALL") params.set("type", type);
    if (source !== "ALL") params.set("source", source);
    if (status !== "ALL") params.set("status", status);

    const response = await authFetch(`/accounts/transactions/?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok || payload.status !== "success") {
      throw new Error(extractError(payload, "Could not load transactions."));
    }

    setTransactions(payload.data || []);
    setTotalPages(Math.max(Number(payload.total_pages || 1), 1));
    setTotalCount(Number(payload.count || 0));
    setStatusBreakdown(payload.status_breakdown || {});
  }, [authFetch, page, source, status, type, user.id]);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      quiet ? setRefreshing(true) : setLoading(true);
      try {
        await Promise.all([fetchWallet(), fetchSummary(), fetchTransactions()]);
      } catch (error) {
        showToast(error.message || "Could not load wallet data.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchSummary, fetchTransactions, fetchWallet, showToast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const verifyTopUp = useCallback(async (paymentId) => {
    setVerifyingPayment(paymentId);
    try {
      const response = await authFetch(`/accounts/wallet/top-up/${paymentId}/verify/`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(extractError(payload, "Could not confirm the wallet top-up."));
      showToast(payload.message, "success");
      await load({ quiet: true });
    } catch (error) {
      showToast(error.message || "Could not confirm the wallet top-up.", "error");
    } finally {
      setVerifyingPayment(null);
    }
  }, [authFetch, load, showToast]);

  useEffect(() => {
    if (!callbackPayment || verifiedCallback.current === callbackPayment) return;
    verifiedCallback.current = callbackPayment;
    setSearchParams({}, { replace: true });
    verifyTopUp(callbackPayment);
  }, [callbackPayment, setSearchParams, verifyTopUp]);

  const startTopUp = async (event) => {
    event.preventDefault();
    setStartingPayment(true);
    try {
      const response = await authFetch("/accounts/wallet/top-up/", {
        method: "POST",
        body: { amount: fundingAmount },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.amount?.[0] || extractError(payload, "Could not start the wallet top-up."));
      setPaystackPayment(payload.data);
      await load({ quiet: true });
    } catch (error) {
      showToast(error.message || "Could not start the wallet top-up.", "error");
    } finally {
      setStartingPayment(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [type, source, status]);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((transaction) =>
      [
        transaction.reference,
        transaction.description,
        transaction.transaction_type,
        transaction.source,
        transaction.status,
      ].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [search, transactions]);

  const pendingCount = Number(statusBreakdown?.PENDING?.count || 0);
  const isAgent = user?.role === "AGENT" || user?.role === "SUB_AGENT";
  const withdrawalPath = user?.role === "AGENT" ? "/agent/withdrawals" : "/subagent/withdrawals";

  const stats = [
    {
      label: "Total commissions",
      value: summary?.total_commissions,
      icon: TrendingUp,
      tone: "success",
    },
    {
      label: "Total deposits",
      value: summary?.total_deposits,
      icon: ArrowDownLeft,
      tone: "primary",
    },
    {
      label: "Total withdrawals",
      value: summary?.total_withdrawals,
      icon: ArrowUpRight,
      tone: "warning",
    },
    {
      label: "Total purchases",
      value: summary?.total_purchases,
      icon: ShoppingBag,
      tone: "neutral",
    },
  ];

  if (loading) {
    return (
      <div className="wallet-state" style={{ color: colors.secondaryText }}>
        <Loader2 className="wallet-spin" size={30} color={colors.btnBg} />
        <span>Loading your wallet…</span>
      </div>
    );
  }

  return (
    <main className="wallet-page" style={{ color: colors.text }}>
      <section
        className="wallet-hero"
        style={{
          background: `linear-gradient(135deg, ${colors.btnBg}, ${colors.linkColor || colors.btnBg})`,
          boxShadow: `0 18px 45px ${colors.btnBg}28`,
        }}
      >
        <div className="wallet-hero-copy">
          <span className="wallet-eyebrow">
            <WalletCards size={15} /> Available balance
          </span>
          <h1>{money(wallet?.balance ?? summary?.current_balance)}</h1>
          <p>
            Updated {formatDate(wallet?.updated_at)}
            {pendingCount > 0 ? ` • ${pendingCount} pending transaction${pendingCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>

        <div className="wallet-hero-actions">
          <button type="button" className="wallet-primary-action" aria-expanded={showFunding} onClick={() => setShowFunding((value) => !value)}>
            <Plus size={17} /> Add funds
          </button>
          {isAgent && (
            <button type="button" className="wallet-primary-action" onClick={() => navigate(withdrawalPath)}>
              <Banknote size={17} /> Withdraw funds
            </button>
          )}
          <button
            type="button"
            className="wallet-secondary-action"
            onClick={() => load({ quiet: true })}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "wallet-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </section>

      {showFunding && (
        <form className="wallet-top-up" onSubmit={startTopUp}>
          <label htmlFor="wallet-top-up-amount">Amount to add (GH₵)</label>
          <div>
            <input id="wallet-top-up-amount" type="number" inputMode="decimal" min="1" max="5000" step="0.01" required value={fundingAmount} onChange={(event) => setFundingAmount(event.target.value)} />
            <button type="submit" className="button primary" disabled={startingPayment || Boolean(paystackPayment)}>
              {startingPayment ? "Preparing payment…" : "Review top-up"}
            </button>
          </div>
        </form>
      )}
      <PaystackFeeConfirmationModal
        open={Boolean(paystackPayment)}
        authorizationUrl={paystackPayment?.authorization_url}
        breakdown={paystackPayment?.payment_breakdown}
        title="Review wallet top-up"
        description="Your wallet receives the top-up amount after Paystack confirms payment. The checkout fee is separate."
        baseAmountLabel="Wallet credit"
        onClose={() => setPaystackPayment(null)}
      />

      <section className="wallet-stats" aria-label="Wallet totals">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article
            key={label}
            className={`wallet-stat wallet-stat--${tone}`}
            style={{ background: colors.raisedBg, borderColor: colors.border }}
          >
            <span className="wallet-stat-icon"><Icon size={18} /></span>
            <div>
              <span style={{ color: colors.secondaryText }}>{label}</span>
              <strong style={{ color: colors.heading }}>{money(value)}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="wallet-shortcuts" aria-label="Wallet shortcuts">
        <button type="button" onClick={() => navigate("/data")} style={{ borderColor: colors.border, color: colors.text, background: colors.raisedBg }}>
          <CreditCard size={17} color={colors.btnBg} /> Buy data
        </button>
        <button type="button" onClick={() => navigate("/marketplace")} style={{ borderColor: colors.border, color: colors.text, background: colors.raisedBg }}>
          <ShoppingBag size={17} color={colors.btnBg} /> Shop products
        </button>
        <button type="button" onClick={() => navigate("/courses")} style={{ borderColor: colors.border, color: colors.text, background: colors.raisedBg }}>
          <BookOpen size={17} color={colors.btnBg} /> Digital courses
        </button>
      </section>

      <section className="wallet-panel" style={{ background: colors.raisedBg, borderColor: colors.border }}>
        <header className="wallet-panel-header">
          <div>
            <h2 style={{ color: colors.heading }}>Transactions</h2>
            <p style={{ color: colors.secondaryText }}>{totalCount} wallet record{totalCount === 1 ? "" : "s"}</p>
          </div>
          <button
            type="button"
            className="wallet-refresh-icon"
            onClick={() => load({ quiet: true })}
            aria-label="Refresh transactions"
            title="Refresh transactions"
            style={{ borderColor: colors.border, color: colors.secondaryText }}
          >
            <RefreshCw className={refreshing ? "wallet-spin" : ""} size={17} />
          </button>
        </header>

        <div className="wallet-filters">
          <label className="wallet-search" style={{ borderColor: colors.border, background: colors.mainBg }}>
            <Search size={16} color={colors.secondaryText} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search this page"
              style={{ color: colors.text }}
            />
          </label>

          <div className="wallet-filter-selects">
            <Filter size={16} color={colors.secondaryText} />
            <select value={type} onChange={(event) => setType(event.target.value)} style={{ color: colors.text, background: colors.mainBg, borderColor: colors.border }}>
              <option value="ALL">All types</option>
              {Object.entries(TYPE_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </select>
            <select value={source} onChange={(event) => setSource(event.target.value)} style={{ color: colors.text, background: colors.mainBg, borderColor: colors.border }}>
              <option value="ALL">All sources</option>
              <option value="DATASELLING">Data</option>
              <option value="MARKETPLACE">Marketplace</option>
              <option value="UTILITIES">Utilities</option>
              <option value="WALLET">Wallet</option>
              <option value="REGISTRATION">Registration</option>
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={{ color: colors.text, background: colors.mainBg, borderColor: colors.border }}>
              <option value="ALL">All statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {visibleTransactions.length === 0 ? (
          <div className="wallet-empty" style={{ color: colors.secondaryText }}>
            <WalletCards size={36} />
            <strong style={{ color: colors.heading }}>No transactions found</strong>
            <span>Try another filter or return after your first wallet activity.</span>
          </div>
        ) : (
          <div className="wallet-transactions">
            {visibleTransactions.map((transaction) => {
              const typeMeta = TYPE_META[transaction.transaction_type] || {
                label: transaction.transaction_type || "Transaction",
                icon: CreditCard,
                direction: "neutral",
              };
              const statusMeta = STATUS_META[transaction.status] || STATUS_META.PENDING;
              const TypeIcon = typeMeta.icon;
              const StatusIcon = statusMeta.icon;
              const isCredit = typeMeta.direction === "credit";
              const isDebit = typeMeta.direction === "debit";

              return (
                <article key={transaction.id} className="wallet-transaction" style={{ borderColor: colors.border }}>
                  <span className={`wallet-transaction-icon wallet-transaction-icon--${typeMeta.direction}`}>
                    <TypeIcon size={18} />
                  </span>
                  <div className="wallet-transaction-main">
                    <div className="wallet-transaction-title">
                      <strong style={{ color: colors.heading }}>{transaction.description || typeMeta.label}</strong>
                      <span className={`wallet-status wallet-status--${String(transaction.status || "PENDING").toLowerCase()}`}>
                        <StatusIcon size={12} /> {statusMeta.label}
                      </span>
                    </div>
                    <div className="wallet-transaction-meta" style={{ color: colors.secondaryText }}>
                      <span>{typeMeta.label}</span>
                      <span>{String(transaction.source || "Wallet").replaceAll("_", " ")}</span>
                      {transaction.status === "PENDING" && transaction.metadata?.payment_type === "WALLET_TOP_UP" && (
                        <button type="button" className="wallet-verify-button" disabled={Boolean(verifyingPayment)} onClick={() => verifyTopUp(transaction.id)}>
                          {verifyingPayment === transaction.id ? "Checking…" : "Check payment"}
                        </button>
                      )}
                      <span>{formatDate(transaction.created_at)}</span>
                      <span title={transaction.reference}>{transaction.reference || "No reference"}</span>
                    </div>
                  </div>
                  <strong
                    className={`wallet-transaction-amount ${isCredit ? "is-credit" : isDebit ? "is-debit" : ""}`}
                    style={!isCredit && !isDebit ? { color: colors.heading } : undefined}
                  >
                    {isCredit ? "+" : isDebit ? "−" : ""}{money(transaction.amount)}
                  </strong>
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <footer className="wallet-pagination" style={{ borderColor: colors.border }}>
            <span style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</span>
            <div>
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} style={{ borderColor: colors.border, color: colors.text }}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} style={{ borderColor: colors.border, color: colors.text }}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>
    </main>
  );
}
