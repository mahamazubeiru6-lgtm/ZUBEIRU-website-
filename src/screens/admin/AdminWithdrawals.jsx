import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Wallet, RefreshCw, Search, X, CheckCircle, AlertCircle, Clock, Mail, Phone, Eye, Edit2, Save, XCircle, Loader2, CreditCard, Smartphone, Building } from 'lucide-react';

const AdminWithdrawals = () => {
    const { colors } = useTheme();
    const { authFetch } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [withdrawals, setWithdrawals] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('ALL');
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [expandedWithdrawals, setExpandedWithdrawals] = useState({});
    const [processData, setProcessData] = useState({
        status: 'COMPLETED',
        admin_notes: '',
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        try {
            setLoading(true);
            const response = await authFetch('/accounts/withdrawals/');
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                setWithdrawals(data.data || []);
            } else {
                showToast(data.message || 'Failed to fetch withdrawals', 'error');
            }
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessWithdrawal = async () => {
        if (!selectedWithdrawal) return;

        setIsSubmitting(true);
        try {
            const response = await authFetch(`/accounts/withdrawals/${selectedWithdrawal.id}/update/`, {
                method: 'PATCH',
                body: JSON.stringify({
                    status: processData.status,
                    admin_notes: processData.admin_notes || `${processData.status} by admin`,
                }),
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showToast(`Withdrawal ${processData.status.toLowerCase()} successfully`, 'success');
                setShowProcessModal(false);
                setSelectedWithdrawal(null);
                setProcessData({ status: 'COMPLETED', admin_notes: '' });
                setWithdrawals((current) => current.map((withdrawal) => (
                    withdrawal.id === data.data.id ? data.data : withdrawal
                )));
            } else {
                showToast(data.message || 'Failed to process withdrawal', 'error');
            }
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openProcessModal = (withdrawal) => {
        setSelectedWithdrawal(withdrawal);
        setProcessData({
            status: 'COMPLETED',
            admin_notes: '',
        });
        setShowProcessModal(true);
    };

    const getStatusColor = (status) => {
        const colors = {
            'PENDING': '#F59E0B',
            'PROCESSING': '#3B82F6',
            'COMPLETED': '#10B981',
            'FAILED': '#EF4444',
            'CANCELLED': '#6B7280',
        };
        return colors[status] || '#6B7280';
    };

    const getStatusIcon = (status) => {
        const icons = {
            'PENDING': <Clock size={14} />,
            'PROCESSING': <RefreshCw size={14} />,
            'COMPLETED': <CheckCircle size={14} />,
            'FAILED': <AlertCircle size={14} />,
            'CANCELLED': <XCircle size={14} />,
        };
        return icons[status] || null;
    };

    const getStatusLabel = (status) => {
        return status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || 'N/A';
    };

    const getPaymentMethodIcon = (method) => {
        const icons = {
            'MOBILE_MONEY': <Smartphone size={14} />,
            'BANK_TRANSFER': <Building size={14} />,
            'PAYSTACK': <CreditCard size={14} />,
            'CASH': <Wallet size={14} />,
        };
        return icons[method] || <Wallet size={14} />;
    };

    const getPaymentMethodLabel = (method) => {
        const labels = {
            'MOBILE_MONEY': 'Mobile Money',
            'BANK_TRANSFER': 'Bank Transfer',
            'PAYSTACK': 'Paystack',
            'CASH': 'Cash',
        };
        return labels[method] || method || 'N/A';
    };

    const getNetworkColor = (network) => {
        const colors = {
            'MTN': '#FFD700',
            'MTN_EXPRESS': '#FFD700',
            'Telecel': '#FF0000',
            'AirtelTigo': '#1A73E8',
            'AT_BIGTIME': '#1A73E8',
        };
        return colors[network] || '#6B7280';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'N/A';
        }
    };

    const toggleExpand = (id) => {
        setExpandedWithdrawals(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const filteredWithdrawals = useMemo(() => {
        let filtered = withdrawals;

        if (selectedStatus !== 'ALL') {
            filtered = filtered.filter(w => w.status === selectedStatus);
        }

        if (selectedPaymentMethod !== 'ALL') {
            filtered = filtered.filter(w => w.payment_method === selectedPaymentMethod);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(w =>
                w.username?.toLowerCase().includes(query) ||
                w.user_email?.toLowerCase().includes(query) ||
                w.user_role?.toLowerCase().includes(query) ||
                w.mobile_money_number?.includes(query) ||
                w.id?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [withdrawals, selectedStatus, selectedPaymentMethod, searchQuery]);

    const totalWithdrawals = withdrawals.length;
    const pendingCount = withdrawals.filter(w => w.status === 'PENDING').length;
    const completedCount = withdrawals.filter(w => w.status === 'COMPLETED').length;
    const failedCount = withdrawals.filter(w => w.status === 'FAILED').length;
    const totalAmount = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

    const statusOptions = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    const paymentMethods = ['ALL', 'MOBILE_MONEY', 'BANK_TRANSFER', 'PAYSTACK', 'CASH'];

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedStatus('ALL');
        setSelectedPaymentMethod('ALL');
    };

    const hasActiveFilters = selectedStatus !== 'ALL' || selectedPaymentMethod !== 'ALL' || searchQuery;

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px',
                flexDirection: 'column',
                gap: '16px',
            }}>
                <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: `3px solid ${colors.border}`,
                    borderTop: `3px solid ${colors.btnBg}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <span style={{ color: colors.secondaryText, fontSize: '14px' }}>
                    Loading withdrawals...
                </span>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 12px 24px',
            width: '100%',
            boxSizing: 'border-box',
        }}>
            
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: isMobile ? '16px' : '20px',
                flexWrap: 'wrap',
                gap: isMobile ? '8px' : '12px',
            }}>
                <div>
                    <h1 style={{
                        fontSize: isMobile ? 'clamp(20px, 5vw, 24px)' : 'clamp(24px, 3vw, 32px)',
                        fontWeight: '700',
                        color: colors.heading,
                        margin: '0 0 2px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                    }}>
                        <Wallet size={isMobile ? 20 : 24} style={{ color: colors.btnBg }} />
                        Withdrawals
                    </h1>
                    <p style={{
                        color: colors.secondaryText,
                        margin: 0,
                        fontSize: isMobile ? '12px' : '14px',
                    }}>
                        Manage and process user withdrawal requests
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '4px' : '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={fetchWithdrawals}
                        style={{
                            padding: isMobile ? '6px 10px' : '8px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.raisedBg,
                            color: colors.text,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '4px' : '8px',
                            fontSize: isMobile ? '11px' : '13px',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
                    >
                        <RefreshCw size={isMobile ? 14 : 16} />
                        {!isMobile && 'Refresh'}
                    </button>
                </div>
            </div>

            
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
                gap: isMobile ? '6px' : '10px',
                marginBottom: isMobile ? '12px' : '16px',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Total</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: colors.heading }}>
                        {totalWithdrawals}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Pending</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#F59E0B' }}>
                        {pendingCount}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Completed</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#10B981' }}>
                        {completedCount}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Failed</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#EF4444' }}>
                        {failedCount}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Total Amount</div>
                    <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '700', color: colors.btnBg }}>
                        ₵{totalAmount.toFixed(2)}
                    </div>
                </div>
            </div>

            
            <div style={{
                display: 'flex',
                gap: isMobile ? '6px' : '10px',
                marginBottom: isMobile ? '10px' : '16px',
                alignItems: 'center',
                flexWrap: 'wrap',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    flex: 1,
                    position: 'relative',
                    minWidth: isMobile ? '120px' : '200px',
                }}>
                    <Search
                        size={isMobile ? 14 : 16}
                        style={{
                            position: 'absolute',
                            left: isMobile ? '8px' : '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: colors.secondaryText,
                        }}
                    />
                    <input
                        type="text"
                        placeholder={isMobile ? "Search..." : "Search by user, email, phone..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: isMobile ? '6px 32px 6px 32px' : '8px 40px 8px 40px',
                            borderRadius: isMobile ? '8px' : '10px',
                            border: `1.5px solid ${searchQuery ? colors.btnBg : colors.border}`,
                            backgroundColor: colors.raisedBg,
                            color: colors.text,
                            fontSize: isMobile ? '13px' : '14px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            minHeight: isMobile ? '36px' : '44px',
                            boxShadow: searchQuery ? `0 0 0 3px ${colors.btnBg}20` : 'none',
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = colors.btnBg;
                            e.target.style.boxShadow = `0 0 0 3px ${colors.btnBg}20`;
                        }}
                        onBlur={(e) => {
                            if (!searchQuery) {
                                e.target.style.borderColor = colors.border;
                                e.target.style.boxShadow = 'none';
                            }
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: isMobile ? '6px' : '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: colors.secondaryText,
                                padding: '4px',
                            }}
                        >
                            <X size={isMobile ? 14 : 16} />
                        </button>
                    )}
                </div>

                
                {!isMobile && (
                    <>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '3px',
                            backgroundColor: colors.raisedBg,
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                        }}>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                style={{
                                    padding: '4px 28px 4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: selectedStatus !== 'ALL' ? colors.btnBg : 'transparent',
                                    color: selectedStatus !== 'ALL' ? colors.btnText : colors.secondaryText,
                                    fontSize: '11px',
                                    fontWeight: selectedStatus !== 'ALL' ? '600' : '500',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${selectedStatus !== 'ALL' ? 'white' : colors.secondaryText}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 8px center',
                                    backgroundSize: '12px',
                                }}
                            >
                                {statusOptions.map(s => (
                                    <option key={s} value={s} style={{ color: colors.text, background: colors.raisedBg }}>
                                        {s === 'ALL' ? 'All Status' : s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '3px',
                            backgroundColor: colors.raisedBg,
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                        }}>
                            <select
                                value={selectedPaymentMethod}
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                style={{
                                    padding: '4px 28px 4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: selectedPaymentMethod !== 'ALL' ? colors.btnBg : 'transparent',
                                    color: selectedPaymentMethod !== 'ALL' ? colors.btnText : colors.secondaryText,
                                    fontSize: '11px',
                                    fontWeight: selectedPaymentMethod !== 'ALL' ? '600' : '500',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${selectedPaymentMethod !== 'ALL' ? 'white' : colors.secondaryText}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 8px center',
                                    backgroundSize: '12px',
                                }}
                            >
                                {paymentMethods.map(m => (
                                    <option key={m} value={m} style={{ color: colors.text, background: colors.raisedBg }}>
                                        {m === 'ALL' ? 'All Methods' : getPaymentMethodLabel(m)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                style={{
                                    fontSize: '12px',
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
                    </>
                )}
            </div>

            
            <div style={{
                marginBottom: isMobile ? '10px' : '16px',
                fontSize: isMobile ? '12px' : '14px',
                color: colors.secondaryText,
            }}>
                Showing <strong style={{ color: colors.text }}>{filteredWithdrawals.length}</strong> withdrawal{filteredWithdrawals.length !== 1 ? 's' : ''}
            </div>

            
            {!isMobile && (
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        width: '100%',
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 0.6fr',
                            padding: '10px 16px',
                            backgroundColor: colors.mainBg,
                            borderBottom: `1px solid ${colors.border}`,
                            fontSize: '11px',
                            fontWeight: '600',
                            color: colors.secondaryText,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            minWidth: '700px',
                        }}>
                            <span>User</span>
                            <span>Amount</span>
                            <span>Method</span>
                            <span>Status</span>
                            <span>Date</span>
                            <span style={{ textAlign: 'center' }}>Actions</span>
                        </div>

                        {filteredWithdrawals.length === 0 ? (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: colors.secondaryText,
                            }}>
                                <Wallet size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                <p>No withdrawals found</p>
                            </div>
                        ) : (
                            filteredWithdrawals.map((withdrawal) => {
                                const statusColor = getStatusColor(withdrawal.status);
                                const isPending = withdrawal.status === 'PENDING';

                                return (
                                    <div
                                        key={withdrawal.id}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 0.6fr',
                                            padding: '10px 16px',
                                            borderBottom: `1px solid ${colors.border}`,
                                            alignItems: 'center',
                                            fontSize: '13px',
                                            transition: 'background 0.2s',
                                            minWidth: '700px',
                                            backgroundColor: isPending ? `${statusColor}08` : 'transparent',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                        onMouseLeave={(e) => e.currentTarget.style.background = isPending ? `${statusColor}08` : 'transparent'}
                                    >
                                        <div>
                                            <div style={{
                                                fontWeight: '600',
                                                color: colors.heading,
                                                fontSize: '14px',
                                            }}>
                                                {withdrawal.username || 'N/A'}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: colors.secondaryText,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}>
                                                <Mail size={12} />
                                                {withdrawal.user_email || 'N/A'}
                                            </div>
                                            {withdrawal.user_role && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    padding: '1px 8px',
                                                    borderRadius: '10px',
                                                    backgroundColor: `${colors.btnBg}15`,
                                                    color: colors.btnBg,
                                                    fontWeight: '600',
                                                    display: 'inline-block',
                                                    marginTop: '2px',
                                                }}>
                                                    {withdrawal.user_role}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            color: colors.btnBg,
                                        }}>
                                            ₵{parseFloat(withdrawal.amount || 0).toFixed(2)}
                                        </div>

                                        <div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '12px',
                                                color: colors.secondaryText,
                                            }}>
                                                {getPaymentMethodIcon(withdrawal.payment_method)}
                                                {getPaymentMethodLabel(withdrawal.payment_method)}
                                            </div>
                                            {withdrawal.mobile_money_number && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: colors.secondaryText,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginTop: '2px',
                                                }}>
                                                    <Phone size={12} />
                                                    {withdrawal.mobile_money_number}
                                                </div>
                                            )}
                                            {withdrawal.mobile_money_network && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    color: getNetworkColor(withdrawal.mobile_money_network),
                                                }}>
                                                    {withdrawal.mobile_money_network}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '3px 12px',
                                                borderRadius: '12px',
                                                backgroundColor: `${statusColor}20`,
                                                color: statusColor,
                                                fontSize: '11px',
                                                fontWeight: '600',
                                            }}>
                                                {getStatusIcon(withdrawal.status)}
                                                {getStatusLabel(withdrawal.status)}
                                            </span>
                                        </div>

                                        <div style={{
                                            fontSize: '11px',
                                            color: colors.secondaryText,
                                        }}>
                                            {formatDate(withdrawal.requested_at)}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: '4px',
                                        }}>
                                            {isPending && (
                                                <button
                                                    onClick={() => openProcessModal(withdrawal)}
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        border: `1px solid ${colors.btnBg}`,
                                                        backgroundColor: 'transparent',
                                                        color: colors.btnBg,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '500',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = colors.btnBg;
                                                        e.currentTarget.style.color = colors.btnText;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.color = colors.btnBg;
                                                    }}
                                                >
                                                    <Edit2 size={14} />
                                                    Process
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedWithdrawal(withdrawal);
                                                    toggleExpand(withdrawal.id);
                                                }}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: 'transparent',
                                                    color: colors.secondaryText,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = colors.hoverBg;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <Eye size={14} />
                                                {expandedWithdrawals[withdrawal.id] ? 'Hide' : 'View'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            
            {isMobile && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    {filteredWithdrawals.length === 0 ? (
                        <div style={{
                            backgroundColor: colors.raisedBg,
                            borderRadius: '10px',
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: colors.secondaryText,
                            border: `1px solid ${colors.border}`,
                        }}>
                            <Wallet size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <p style={{ fontSize: '14px' }}>No withdrawals found</p>
                        </div>
                    ) : (
                        filteredWithdrawals.map((withdrawal) => {
                            const statusColor = getStatusColor(withdrawal.status);
                            const isPending = withdrawal.status === 'PENDING';
                            const isExpanded = expandedWithdrawals[withdrawal.id];

                            return (
                                <div
                                    key={withdrawal.id}
                                    style={{
                                        backgroundColor: colors.raisedBg,
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        border: `1px solid ${isPending ? statusColor : colors.border}`,
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        borderLeft: isPending ? `4px solid ${statusColor}` : 'none',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '6px',
                                    }}>
                                        <div>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: colors.heading,
                                            }}>
                                                {withdrawal.username || 'N/A'}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: colors.secondaryText,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}>
                                                <Mail size={12} />
                                                {withdrawal.user_email || 'N/A'}
                                            </div>
                                        </div>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '2px 10px',
                                            borderRadius: '10px',
                                            backgroundColor: `${statusColor}20`,
                                            color: statusColor,
                                            fontSize: '10px',
                                            fontWeight: '600',
                                        }}>
                                            {getStatusIcon(withdrawal.status)}
                                            {getStatusLabel(withdrawal.status)}
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '4px 8px',
                                        marginBottom: '6px',
                                        paddingTop: '6px',
                                        borderTop: `1px solid ${colors.border}`,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Amount</div>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: colors.btnBg }}>
                                                ₵{parseFloat(withdrawal.amount || 0).toFixed(2)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Method</div>
                                            <div style={{ fontSize: '12px', color: colors.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {getPaymentMethodIcon(withdrawal.payment_method)}
                                                {getPaymentMethodLabel(withdrawal.payment_method)}
                                            </div>
                                        </div>
                                        {withdrawal.mobile_money_number && (
                                            <div>
                                                <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Phone</div>
                                                <div style={{ fontSize: '12px', color: colors.text }}>
                                                    {withdrawal.mobile_money_number}
                                                </div>
                                            </div>
                                        )}
                                        {withdrawal.mobile_money_network && (
                                            <div>
                                                <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Network</div>
                                                <div style={{ fontSize: '12px', fontWeight: '600', color: getNetworkColor(withdrawal.mobile_money_network) }}>
                                                    {withdrawal.mobile_money_network}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Date</div>
                                            <div style={{ fontSize: '11px', color: colors.secondaryText }}>
                                                {formatDate(withdrawal.requested_at)}
                                            </div>
                                        </div>
                                        {withdrawal.user_role && (
                                            <div>
                                                <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Role</div>
                                                <div style={{ fontSize: '11px', fontWeight: '600', color: colors.btnBg }}>
                                                    {withdrawal.user_role}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    
                                    {isExpanded && (
                                        <div style={{
                                            marginTop: '6px',
                                            paddingTop: '6px',
                                            borderTop: `1px solid ${colors.border}`,
                                        }}>
                                            <div style={{
                                                fontSize: '11px',
                                                color: colors.secondaryText,
                                            }}>
                                                <div><strong>ID:</strong> {withdrawal.id}</div>
                                                {withdrawal.admin_notes && (
                                                    <div><strong>Admin Notes:</strong> {withdrawal.admin_notes}</div>
                                                )}
                                                {withdrawal.completed_at && (
                                                    <div><strong>Completed:</strong> {formatDate(withdrawal.completed_at)}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: `1px solid ${colors.border}`,
                                    }}>
                                        {isPending && (
                                            <button
                                                onClick={() => openProcessModal(withdrawal)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.btnBg}`,
                                                    backgroundColor: 'transparent',
                                                    color: colors.btnBg,
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = colors.btnBg;
                                                    e.currentTarget.style.color = colors.btnText;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = colors.btnBg;
                                                }}
                                            >
                                                <Edit2 size={14} />
                                                Process
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleExpand(withdrawal.id)}
                                            style={{
                                                flex: 1,
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: `1px solid ${colors.border}`,
                                                backgroundColor: 'transparent',
                                                color: colors.secondaryText,
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '4px',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = colors.hoverBg;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <Eye size={14} />
                                            {isExpanded ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            
            {showProcessModal && selectedWithdrawal && (
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
                            setShowProcessModal(false);
                            setSelectedWithdrawal(null);
                            setProcessData({ status: 'COMPLETED', admin_notes: '' });
                        }
                    }}
                >
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '14px' : '16px',
                        maxWidth: '480px',
                        width: '100%',
                        padding: isMobile ? '20px' : '24px',
                        boxShadow: `0 20px 60px ${colors.shadow}`,
                        animation: 'slideUp 0.25s ease',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: isMobile ? '16px' : '20px',
                        }}>
                            <h3 style={{
                                fontSize: isMobile ? '17px' : '18px',
                                fontWeight: '700',
                                color: colors.heading,
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <Edit2 size={isMobile ? 18 : 20} />
                                Process Withdrawal
                            </h3>
                            <button
                                onClick={() => {
                                    setShowProcessModal(false);
                                    setSelectedWithdrawal(null);
                                    setProcessData({ status: 'COMPLETED', admin_notes: '' });
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
                            marginBottom: '16px',
                            padding: '12px 16px',
                            backgroundColor: colors.mainBg,
                            borderRadius: '10px',
                            border: `1px solid ${colors.border}`,
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '4px',
                            }}>
                                <span style={{ fontSize: '13px', color: colors.secondaryText }}>User</span>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: colors.heading }}>
                                    {selectedWithdrawal.username}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '4px',
                            }}>
                                <span style={{ fontSize: '13px', color: colors.secondaryText }}>Amount</span>
                                <span style={{ fontSize: '18px', fontWeight: '700', color: colors.btnBg }}>
                                    ₵{parseFloat(selectedWithdrawal.amount || 0).toFixed(2)}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ fontSize: '13px', color: colors.secondaryText }}>Method</span>
                                <span style={{ fontSize: '13px', color: colors.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {getPaymentMethodIcon(selectedWithdrawal.payment_method)}
                                    {getPaymentMethodLabel(selectedWithdrawal.payment_method)}
                                </span>
                            </div>
                            {selectedWithdrawal.mobile_money_number && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '4px',
                                    paddingTop: '4px',
                                    borderTop: `1px solid ${colors.border}`,
                                }}>
                                    <span style={{ fontSize: '13px', color: colors.secondaryText }}>Phone</span>
                                    <span style={{ fontSize: '13px', color: colors.text }}>
                                        {selectedWithdrawal.mobile_money_number}
                                    </span>
                                </div>
                            )}
                            {selectedWithdrawal.mobile_money_network && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '13px', color: colors.secondaryText }}>Network</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: getNetworkColor(selectedWithdrawal.mobile_money_network) }}>
                                        {selectedWithdrawal.mobile_money_network}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: colors.text,
                                display: 'block',
                                marginBottom: '4px',
                            }}>
                                Status
                            </label>
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                flexWrap: 'wrap',
                            }}>
                                {['COMPLETED', 'PROCESSING', 'FAILED'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setProcessData(prev => ({ ...prev, status }))}
                                        style={{
                                            flex: 1,
                                            padding: isMobile ? '6px 12px' : '8px 16px',
                                            borderRadius: '8px',
                                            border: `2px solid ${processData.status === status ? getStatusColor(status) : colors.border}`,
                                            backgroundColor: processData.status === status ? `${getStatusColor(status)}20` : 'transparent',
                                            color: processData.status === status ? getStatusColor(status) : colors.secondaryText,
                                            cursor: 'pointer',
                                            fontSize: isMobile ? '11px' : '12px',
                                            fontWeight: processData.status === status ? '600' : '500',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        {getStatusIcon(status)}
                                        {getStatusLabel(status)}
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
                                marginBottom: '4px',
                            }}>
                                Admin Notes
                            </label>
                            <textarea
                                value={processData.admin_notes}
                                onChange={(e) => setProcessData(prev => ({ ...prev, admin_notes: e.target.value }))}
                                placeholder="Add notes about this transaction..."
                                rows={isMobile ? 2 : 3}
                                style={{
                                    width: '100%',
                                    padding: isMobile ? '8px 12px' : '10px 14px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    fontSize: isMobile ? '13px' : '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={(e) => e.target.style.borderColor = colors.btnBg}
                                onBlur={(e) => e.target.style.borderColor = colors.border}
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: isMobile ? '8px' : '10px',
                        }}>
                            <button
                                onClick={() => {
                                    setShowProcessModal(false);
                                    setSelectedWithdrawal(null);
                                    setProcessData({ status: 'COMPLETED', admin_notes: '' });
                                }}
                                style={{
                                    flex: 1,
                                    padding: isMobile ? '8px' : '10px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: 'transparent',
                                    color: colors.text,
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: isMobile ? '13px' : '14px',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProcessWithdrawal}
                                disabled={isSubmitting}
                                style={{
                                    flex: 2,
                                    padding: isMobile ? '8px' : '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: processData.status === 'FAILED' ? colors.error : colors.btnBg,
                                    color: colors.btnText,
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: isMobile ? '13px' : '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isMobile ? '4px' : '8px',
                                    transition: 'all 0.2s',
                                    opacity: isSubmitting ? 0.7 : 1,
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={isMobile ? 16 : 18} style={{ animation: 'spin 1s linear infinite' }} />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Save size={isMobile ? 16 : 18} />
                                        {processData.status === 'FAILED' ? 'Mark as Failed' : 'Process Withdrawal'}
                                    </>
                                )}
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
                * {
                    box-sizing: border-box;
                }
            `}</style>
        </div>
    );
};

export default AdminWithdrawals;

