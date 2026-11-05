import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { Search, X, Eye, RefreshCw, CheckCircle, Clock, AlertCircle, ArrowUp, ArrowDown, Printer, Filter as FilterIcon, SlidersHorizontal, Wallet, TrendingUp, CreditCard, Receipt, ArrowLeftRight } from 'lucide-react';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_PAGE_SIZE = 200;
const SEARCH_PAGE_CAP = 5;

const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

const buildTransactionHaystack = (transaction) => [
  transaction.id,
  transaction.username,
  transaction.reference,
  transaction.description,
  transaction.transaction_type,
  transaction.source,
  transaction.status,
  transaction.amount,
  transaction.created_at,
  transaction.updated_at,
  transaction.metadata ? JSON.stringify(transaction.metadata) : '',
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const TransactionsList = () => {
  const { colors } = useTheme();
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [draftType, setDraftType] = useState('ALL');
  const [draftStatus, setDraftStatus] = useState('ALL');
  const [draftSource, setDraftSource] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchSet, setSearchSet] = useState(null);
  const [typeBreakdown, setTypeBreakdown] = useState({});
  const [statusBreakdown, setStatusBreakdown] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalPages: 1,
    count: 0,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const listAbortRef = useRef(null);
  const searchAbortRef = useRef(null);
  const searchSetRef = useRef(null);
  const searchSetKeyRef = useRef('');
  const searchRequestKeyRef = useRef('');
  const searchRequestIdRef = useRef(0);
  const debouncedSearch = useDebouncedValue(searchQuery.trim().toLowerCase(), SEARCH_DEBOUNCE_MS);
  const filterKey = `${selectedType}|${selectedStatus}|${selectedSource}`;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const buildFilterParams = useCallback((page, pageSize) => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (selectedType !== 'ALL') params.set('type', selectedType);
    if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
    if (selectedSource !== 'ALL') params.set('source', selectedSource);
    return params;
  }, [selectedType, selectedStatus, selectedSource]);

  const fetchTransactions = useCallback(async ({ silent = false } = {}) => {
    if (listAbortRef.current) listAbortRef.current.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      const params = buildFilterParams(pagination.page, pagination.pageSize);
      const response = await authFetch(`/accounts/transactions/?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setTransactions(data.data || []);
        setPagination(prev => ({
          ...prev,
          count: data.count || 0,
          totalPages: data.total_pages || 1,
        }));
        setTypeBreakdown(data.type_breakdown || {});
        setStatusBreakdown(data.status_breakdown || {});
      } else {
        showToast(data.message || 'Failed to fetch transactions', 'error');
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching transactions:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch, buildFilterParams, pagination.page, pagination.pageSize, showToast]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await authFetch('/accounts/transactions/summary/');
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [authFetch]);

  const fetchSearchSet = useCallback(async ({ force = false } = {}) => {
    if (!force && searchSetKeyRef.current === filterKey && searchSetRef.current) return;
    if (!force && searchRequestKeyRef.current === filterKey) return;

    if (searchAbortRef.current) searchAbortRef.current.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const requestKey = filterKey;
    const requestId = ++searchRequestIdRef.current;
    searchRequestKeyRef.current = requestKey;
    setSearching(true);

    try {
      const firstParams = buildFilterParams(1, SEARCH_PAGE_SIZE);
      const firstResponse = await authFetch(`/accounts/transactions/?${firstParams.toString()}`, {
        signal: controller.signal,
      });
      const firstData = await firstResponse.json();
      if (!firstResponse.ok || firstData.status !== 'success') {
        throw new Error(firstData.message || 'Failed to search transactions');
      }

      const totalPages = firstData.total_pages || 1;
      const pagesToFetch = Math.min(totalPages, SEARCH_PAGE_CAP);
      const remainingPages = Array.from({ length: Math.max(0, pagesToFetch - 1) }, (_, index) => index + 2);
      const pageResults = await Promise.all(remainingPages.map(async (page) => {
        const params = buildFilterParams(page, SEARCH_PAGE_SIZE);
        const response = await authFetch(`/accounts/transactions/?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
          throw new Error(data.message || `Failed to load transaction page ${page}`);
        }
        return data.data || [];
      }));

      const nextSearchSet = {
        data: [firstData.data || [], ...pageResults].flat(),
        truncated: totalPages > SEARCH_PAGE_CAP,
      };
      if (searchRequestIdRef.current !== requestId) return;
      searchSetRef.current = nextSearchSet;
      searchSetKeyRef.current = requestKey;
      setSearchSet(nextSearchSet);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error searching transactions:', error);
      showToast(error.message || 'Failed to search transactions', 'error');
    } finally {
      if (searchRequestIdRef.current === requestId) {
        searchRequestKeyRef.current = '';
        setSearching(false);
      }
    }
  }, [authFetch, buildFilterParams, filterKey, showToast]);

  useEffect(() => {
    if (!debouncedSearch) fetchTransactions();
  }, [debouncedSearch, fetchTransactions]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    searchSetRef.current = null;
    searchSetKeyRef.current = '';
    setSearchSet(null);
  }, [filterKey]);

  useEffect(() => {
    if (debouncedSearch) fetchSearchSet();
  }, [debouncedSearch, fetchSearchSet]);

  useEffect(() => () => {
    listAbortRef.current?.abort();
    searchAbortRef.current?.abort();
  }, []);

  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#F59E0B',
      'COMPLETED': '#10B981',
      'FAILED': '#EF4444',
      'CANCELLED': '#6B7280',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'PENDING': <Clock size={14} />,
      'COMPLETED': <CheckCircle size={14} />,
      'FAILED': <AlertCircle size={14} />,
      'CANCELLED': <X size={14} />,
    };
    return icons[status] || null;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'DEPOSIT': <ArrowDown size={16} style={{ color: '#10B981' }} />,
      'WITHDRAWAL': <ArrowUp size={16} style={{ color: '#EF4444' }} />,
      'PURCHASE': <CreditCard size={16} style={{ color: '#3B82F6' }} />,
      'REFUND': <Receipt size={16} style={{ color: '#8B5CF6' }} />,
      'COMMISSION': <TrendingUp size={16} style={{ color: '#F59E0B' }} />,
      'TRANSFER': <ArrowLeftRight size={16} style={{ color: '#6B7280' }} />,
    };
    return icons[type] || null;
  };

  const getTypeColor = (type) => {
    const colors = {
      'DEPOSIT': '#10B981',
      'WITHDRAWAL': '#EF4444',
      'PURCHASE': '#3B82F6',
      'REFUND': '#8B5CF6',
      'COMMISSION': '#F59E0B',
      'TRANSFER': '#6B7280',
    };
    return colors[type] || '#6B7280';
  };

  const getTypeLabel = (type) => {
    return type?.charAt(0).toUpperCase() + type?.slice(1).toLowerCase() || 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount) => {
    return `₵${parseFloat(amount || 0).toFixed(2)}`;
  };

  const userRole = user?.role || 'CUSTOMER';
  const isAdmin = userRole === 'ADMIN';

  const typeOptions = ['ALL', 'DEPOSIT', 'WITHDRAWAL', 'PURCHASE', 'REFUND', 'COMMISSION', 'TRANSFER', 'REGISTRATION_FEE'];
  const statusOptions = ['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const sourceOptions = ['ALL', 'DATASELLING', 'MARKETPLACE', 'WALLET', 'REGISTRATION'];

  const visibleTransactions = useMemo(() => {
    if (!debouncedSearch) return transactions;
    const tokens = debouncedSearch.split(/\s+/).filter(Boolean);
    return (searchSet?.data || []).filter((transaction) => {
      const haystack = buildTransactionHaystack(transaction);
      return tokens.every((token) => haystack.includes(token));
    });
  }, [debouncedSearch, searchSet, transactions]);

  const handleRefresh = () => {
    fetchSummary();
    if (debouncedSearch) fetchSearchSet({ force: true });
    else fetchTransactions({ silent: true });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setSelectedSource('ALL');
    setDraftType('ALL');
    setDraftStatus('ALL');
    setDraftSource('ALL');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedSource !== 'ALL' || searchQuery;
  const activeStructuredFilterCount = [
    selectedType !== 'ALL',
    selectedStatus !== 'ALL',
    selectedSource !== 'ALL',
  ].filter(Boolean).length;

  if (loading && transactions.length === 0 && !debouncedSearch) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: `3px solid ${colors.border}`,
          borderTop: `3px solid ${colors.btnBg}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 16px 24px',
    }}>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: '700',
            color: colors.heading,
            margin: '0 0 4px 0',
          }}>
            Transactions
          </h1>
          <p style={{
            color: colors.secondaryText,
            margin: 0,
            fontSize: '14px',
          }}>
            {isAdmin ? 'View all transactions across the platform' : 'Your transaction history'}
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setShowSummary(!showSummary)}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              backgroundColor: showSummary ? colors.btnBg : colors.raisedBg,
              color: showSummary ? colors.btnText : colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
          >
            <Wallet size={16} />
            {showSummary ? 'Hide Summary' : 'Show Summary'}
          </button>
          <button
            onClick={handleRefresh}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.raisedBg,
              color: colors.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
          >
            <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
            Refresh
          </button>
        </div>
      </div>

      
      {showSummary && summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px',
          marginBottom: '20px',
        }}>
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '10px',
            padding: '12px 14px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: '11px', color: colors.secondaryText }}>Balance</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: colors.btnBg }}>
              {formatAmount(summary.summary?.current_balance || 0)}
            </div>
          </div>
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '10px',
            padding: '12px 14px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: '11px', color: colors.secondaryText }}>Total Transactions</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: colors.heading }}>
              {pagination.count || 0}
            </div>
          </div>
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '10px',
            padding: '12px 14px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: '11px', color: colors.secondaryText }}>Total Spent</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>
              {formatAmount(summary.summary?.total_purchases || 0)}
            </div>
          </div>
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '10px',
            padding: '12px 14px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: '11px', color: colors.secondaryText }}>Pending</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#F59E0B' }}>
              {statusBreakdown.PENDING?.count || 0}
            </div>
          </div>
          {isAdmin && (
            <>
              <div style={{
                backgroundColor: colors.raisedBg,
                borderRadius: '10px',
                padding: '12px 14px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Total Revenue</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10B981' }}>
                  {formatAmount(typeBreakdown.PURCHASE?.total || 0)}
                </div>
              </div>
              <div style={{
                backgroundColor: colors.raisedBg,
                borderRadius: '10px',
                padding: '12px 14px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Total Commissions</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#F59E0B' }}>
                  {formatAmount(typeBreakdown.COMMISSION?.total || 0)}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
          minWidth: '200px',
        }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.secondaryText,
            }}
          />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 40px 10px 40px',
              borderRadius: '10px',
              border: `1.5px solid ${colors.border}`,
              backgroundColor: colors.raisedBg,
              color: colors.text,
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.btnBg;
              e.target.style.boxShadow = `0 0 0 3px ${colors.btnBg}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border;
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.secondaryText,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setDraftType(selectedType);
            setDraftStatus(selectedStatus);
            setDraftSource(selectedSource);
            setShowFilterModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '10px',
            border: `1.5px solid ${activeStructuredFilterCount ? colors.btnBg : colors.border}`,
            backgroundColor: activeStructuredFilterCount ? colors.btnBg : colors.raisedBg,
            color: activeStructuredFilterCount ? colors.btnText : colors.text,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s',
          }}
        >
          <FilterIcon size={18} />
          Filters
          {activeStructuredFilterCount > 0 && (
            <span style={{
              marginLeft: '4px',
              padding: '1px 8px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontSize: '12px',
            }}>
              {activeStructuredFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            style={{
              fontSize: '13px',
              color: colors.btnBg,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = `${colors.btnBg}15`}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Clear filters
          </button>
        )}
      </div>

      {debouncedSearch && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          padding: '8px 12px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.raisedBg,
          color: colors.secondaryText,
          fontSize: '12px',
        }}>
          {searching && <RefreshCw size={14} className="spin-icon" />}
          <span>
            {searching
              ? 'Searching transaction history…'
              : `${visibleTransactions.length} matching transaction${visibleTransactions.length === 1 ? '' : 's'}`}
            {!searching && searchSet?.truncated
              ? ` · scanned the newest ${SEARCH_PAGE_CAP * SEARCH_PAGE_SIZE}`
              : ''}
          </span>
        </div>
      )}

      
      {!isMobile && (
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            overflowX: 'auto',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isAdmin ? '1fr 1.5fr 1.2fr 1fr 1fr 1fr 0.6fr' : '1fr 1.5fr 1.2fr 1fr 1fr 0.6fr',
              padding: '12px 16px',
              backgroundColor: colors.mainBg,
              borderBottom: `1px solid ${colors.border}`,
              fontSize: '12px',
              fontWeight: '600',
              color: colors.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              minWidth: '800px',
            }}>
              <span>Type</span>
              <span>Description</span>
              {isAdmin && <span>User</span>}
              <span>Amount</span>
              <span>Source</span>
              <span>Status</span>
              <span style={{ textAlign: 'center' }}>Actions</span>
            </div>

            {visibleTransactions.map((txn) => (
              <div
                key={txn.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isAdmin ? '1fr 1.5fr 1.2fr 1fr 1fr 1fr 0.6fr' : '1fr 1.5fr 1.2fr 1fr 1fr 0.6fr',
                  padding: '12px 16px',
                  borderBottom: `1px solid ${colors.border}`,
                  alignItems: 'center',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                  minWidth: '800px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: getTypeColor(txn.transaction_type),
                  fontWeight: '600',
                  fontSize: '13px',
                }}>
                  {getTypeIcon(txn.transaction_type)}
                  {getTypeLabel(txn.transaction_type)}
                </span>
                <span style={{ color: colors.text, fontSize: '13px' }}>
                  {txn.description || 'N/A'}
                </span>
                {isAdmin && (
                  <span style={{ fontSize: '13px', color: colors.text }}>
                    {txn.user?.username || 'N/A'}
                  </span>
                )}
                <span style={{
                  fontWeight: '700',
                  fontSize: '15px',
                  color: txn.transaction_type === 'WITHDRAWAL' || txn.transaction_type === 'PURCHASE' ? '#EF4444' : '#10B981',
                }}>
                  {txn.transaction_type === 'WITHDRAWAL' || txn.transaction_type === 'PURCHASE' ? '-' : '+'}
                  {formatAmount(txn.amount)}
                </span>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  backgroundColor: `${colors.btnBg}15`,
                  color: colors.btnBg,
                  fontWeight: '500',
                  textTransform: 'capitalize',
                  width: 'fit-content',
                }}>
                  {txn.source?.toLowerCase() || 'N/A'}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: getStatusColor(txn.status),
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  {getStatusIcon(txn.status)}
                  {getTypeLabel(txn.status)}
                </span>
                <button
                  onClick={() => handleViewTransaction(txn)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: 'transparent',
                    color: colors.secondaryText,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    margin: '0 auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.btnBg;
                    e.currentTarget.style.color = colors.btnText;
                    e.currentTarget.style.borderColor = colors.btnBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = colors.secondaryText;
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <Eye size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {isMobile && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {visibleTransactions.map((txn) => (
            <div
              key={txn.id}
              style={{
                backgroundColor: colors.raisedBg,
                borderRadius: '12px',
                padding: '14px 16px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: getTypeColor(txn.transaction_type),
                  fontWeight: '600',
                  fontSize: '14px',
                }}>
                  {getTypeIcon(txn.transaction_type)}
                  {getTypeLabel(txn.transaction_type)}
                </div>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: getStatusColor(txn.status),
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  {getStatusIcon(txn.status)}
                  {getTypeLabel(txn.status)}
                </span>
              </div>

              <div style={{
                fontSize: '14px',
                color: colors.text,
                marginBottom: '6px',
              }}>
                {txn.description || 'N/A'}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: colors.secondaryText }}>Amount</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: txn.transaction_type === 'WITHDRAWAL' || txn.transaction_type === 'PURCHASE' ? '#EF4444' : '#10B981',
                  }}>
                    {txn.transaction_type === 'WITHDRAWAL' || txn.transaction_type === 'PURCHASE' ? '-' : '+'}
                    {formatAmount(txn.amount)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: colors.secondaryText }}>Source</div>
                  <div style={{
                    fontSize: '12px',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    backgroundColor: `${colors.btnBg}15`,
                    color: colors.btnBg,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    display: 'inline-block',
                  }}>
                    {txn.source?.toLowerCase() || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: `1px solid ${colors.border}`,
              }}>
                <span style={{ fontSize: '12px', color: colors.secondaryText }}>
                  {formatDate(txn.created_at)}
                </span>
                <button
                  onClick={() => handleViewTransaction(txn)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: 'transparent',
                    color: colors.secondaryText,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.btnBg;
                    e.currentTarget.style.color = colors.btnText;
                    e.currentTarget.style.borderColor = colors.btnBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = colors.secondaryText;
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <Eye size={14} />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      
      {visibleTransactions.length === 0 && !searching && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: colors.secondaryText,
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.6,
          }}>
            <Receipt size={48} />
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.heading,
            margin: '0 0 8px 0',
          }}>
            No transactions found
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px',
          }}>
            {hasActiveFilters ? 'Try adjusting your search or filter criteria' : 'Transactions will appear here once you make a purchase or deposit'}
          </p>
        </div>
      )}

      
      {!debouncedSearch && pagination.totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px',
        }}>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.raisedBg,
              color: pagination.page === 1 ? colors.secondaryText : colors.text,
              cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
              opacity: pagination.page === 1 ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: '14px', color: colors.text }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
            disabled={pagination.page === pagination.totalPages}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.raisedBg,
              color: pagination.page === pagination.totalPages ? colors.secondaryText : colors.text,
              cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
              opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            Next
          </button>
        </div>
      )}

      
      {showDetailsModal && selectedTransaction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedTransaction(null);
            }
          }}
        >
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: `0 20px 60px ${colors.shadow}`,
            animation: 'slideUp 0.25s ease',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.heading,
                margin: 0,
              }}>
                Transaction Details
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.secondaryText,
                  padding: '4px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: colors.mainBg,
              borderRadius: '10px',
              marginBottom: '16px',
            }}>
              <div>
                <div style={{ fontSize: '12px', color: colors.secondaryText }}>Reference</div>
                <div style={{ fontWeight: '600', color: colors.heading, fontSize: '13px' }}>
                  {selectedTransaction.reference || 'N/A'}
                </div>
              </div>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: getStatusColor(selectedTransaction.status),
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {getStatusIcon(selectedTransaction.status)}
                {getTypeLabel(selectedTransaction.status)}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Type</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: getTypeColor(selectedTransaction.transaction_type),
                  fontWeight: '600',
                  fontSize: '14px',
                }}>
                  {getTypeIcon(selectedTransaction.transaction_type)}
                  {getTypeLabel(selectedTransaction.transaction_type)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Amount</div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: selectedTransaction.transaction_type === 'WITHDRAWAL' || selectedTransaction.transaction_type === 'PURCHASE' ? '#EF4444' : '#10B981',
                }}>
                  {selectedTransaction.transaction_type === 'WITHDRAWAL' || selectedTransaction.transaction_type === 'PURCHASE' ? '-' : '+'}
                  {formatAmount(selectedTransaction.amount)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Source</div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.text,
                  textTransform: 'capitalize',
                }}>
                  {selectedTransaction.source?.toLowerCase() || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.secondaryText }}>User</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>
                  {selectedTransaction.user?.username || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: '11px', color: colors.secondaryText }}>Description</div>
              <div style={{ fontSize: '14px', color: colors.text }}>
                {selectedTransaction.description || 'N/A'}
              </div>
            </div>

            {selectedTransaction.metadata && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${colors.border}`,
              }}>
                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Metadata</div>
                <div style={{
                  fontSize: '13px',
                  color: colors.secondaryText,
                  backgroundColor: colors.mainBg,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginTop: '4px',
                  wordBreak: 'break-all',
                  maxHeight: '100px',
                  overflow: 'auto',
                }}>
                  {Object.entries(selectedTransaction.metadata).map(([key, value]) => (
                    <div key={key}>
                      <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: colors.secondaryText,
            }}>
              <span>Created: {formatDate(selectedTransaction.created_at)}</span>
              {selectedTransaction.updated_at && selectedTransaction.updated_at !== selectedTransaction.created_at && (
                <span>Updated: {formatDate(selectedTransaction.updated_at)}</span>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '20px',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '20px',
            }}>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTransaction(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1.5px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Close
              </button>
              <button
                onClick={() => {
                  showToast('Printing transaction receipt...', 'info');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: colors.btnBg,
                  color: colors.btnText,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Printer size={18} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      
      {showFilterModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFilterModal(false);
            }
          }}
        >
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '16px',
            maxWidth: '420px',
            width: '100%',
            padding: '24px',
            boxShadow: `0 20px 60px ${colors.shadow}`,
            animation: 'slideUp 0.25s ease',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.heading,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <SlidersHorizontal size={20} />
                Filter Transactions
              </h3>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.secondaryText,
                  padding: '4px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.text,
                display: 'block',
                marginBottom: '6px',
              }}>
                Transaction Type
              </label>
              <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              }}>
                {typeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => setDraftType(type)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `2px solid ${draftType === type ? colors.btnBg : colors.border}`,
                      backgroundColor: draftType === type ? colors.btnBg : 'transparent',
                      color: draftType === type ? colors.btnText : colors.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: draftType === type ? '600' : '500',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {type.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.text,
                display: 'block',
                marginBottom: '6px',
              }}>
                Status
              </label>
              <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              }}>
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => setDraftStatus(status)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `2px solid ${draftStatus === status ? colors.btnBg : colors.border}`,
                      backgroundColor: draftStatus === status ? colors.btnBg : 'transparent',
                      color: draftStatus === status ? colors.btnText : colors.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: draftStatus === status ? '600' : '500',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {status.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.text,
                display: 'block',
                marginBottom: '6px',
              }}>
                Source
              </label>
              <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
              }}>
                {sourceOptions.map((source) => (
                  <button
                    key={source}
                    onClick={() => setDraftSource(source)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `2px solid ${draftSource === source ? colors.btnBg : colors.border}`,
                      backgroundColor: draftSource === source ? colors.btnBg : 'transparent',
                      color: draftSource === source ? colors.btnText : colors.text,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: draftSource === source ? '600' : '500',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {source.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '20px',
            }}>
              <button
                onClick={() => {
                  setDraftType('ALL');
                  setDraftStatus('ALL');
                  setDraftSource('ALL');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1.5px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setSelectedType(draftType);
                  setSelectedStatus(draftStatus);
                  setSelectedSource(draftSource);
                  setShowFilterModal(false);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: colors.btnBg,
                  color: colors.btnText,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TransactionsList;

