import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Wallet, RefreshCw, Search, X, CheckCircle, AlertCircle, Clock, Phone, Eye, Plus, CreditCard, Smartphone, Building, Loader2, Check, XCircle } from 'lucide-react';

const Withdrawals = () => {
    const { colors } = useTheme();
    const { authFetch } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [withdrawals, setWithdrawals] = useState([]);
    const [summary, setSummary] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedWithdrawals, setExpandedWithdrawals] = useState({});

    const [formData, setFormData] = useState({
        amount: '',
        payment_method: 'MOBILE_MONEY',
        mobile_money_network: 'MTN',
        mobile_money_number: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        notes: '',
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchWithdrawals();
        fetchSummary();
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

    const fetchSummary = async () => {
        try {
            const response = await authFetch('/accounts/withdrawals/summary/');
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                setSummary(data.data);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const handleRequestWithdrawal = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            const payload = {
                amount: formData.amount,
                payment_method: formData.payment_method,
                notes: formData.notes || undefined,
            };

            if (formData.payment_method === 'MOBILE_MONEY') {
                payload.mobile_money_network = formData.mobile_money_network;
                payload.mobile_money_number = formData.mobile_money_number;
            } else if (formData.payment_method === 'BANK') {
                payload.bank_name = formData.bank_name;
                payload.account_number = formData.account_number;
                payload.account_name = formData.account_name;
            }

            const response = await authFetch('/accounts/withdrawals/', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.status === 201 && data.status === 'success') {
                showToast(data.message || 'Withdrawal request submitted successfully!', 'success');
                setWithdrawals((current) => [data.data, ...current]);
                setSummary((current) => ({
                    ...(current || {}),
                    total_requests: (current?.total_requests || 0) + 1,
                    total_pending: (current?.total_pending || 0) + 1,
                    pending_amount: parseFloat(current?.pending_amount || 0) + parseFloat(data.data?.amount || 0),
                }));
                setShowRequestModal(false);
                resetForm();
            } else {
                if (data.errors) {
                    setFormErrors(data.errors);
                    const firstError = Object.values(data.errors)[0];
                    showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                } else {
                    showToast(data.message || 'Failed to submit withdrawal request', 'error');
                }
            }
        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            errors.amount = 'Please enter a valid amount';
        }

        if (formData.payment_method === 'MOBILE_MONEY') {
            if (!formData.mobile_money_number) {
                errors.mobile_money_number = 'Phone number is required';
            }
            if (!formData.mobile_money_network) {
                errors.mobile_money_network = 'Network is required';
            }
        } else if (formData.payment_method === 'BANK') {
            if (!formData.bank_name) errors.bank_name = 'Bank name is required';
            if (!formData.account_number) errors.account_number = 'Account number is required';
            if (!formData.account_name) errors.account_name = 'Account name is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const resetForm = () => {
        setFormData({
            amount: '',
            payment_method: 'MOBILE_MONEY',
            mobile_money_network: 'MTN',
            mobile_money_number: '',
            bank_name: '',
            account_number: '',
            account_name: '',
            notes: '',
        });
        setFormErrors({});
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
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
            'BANK': <Building size={14} />,
            'PAYSTACK': <CreditCard size={14} />,
            'CASH': <Wallet size={14} />,
        };
        return icons[method] || <Wallet size={14} />;
    };

    const getPaymentMethodLabel = (method) => {
        const labels = {
            'MOBILE_MONEY': 'Mobile Money',
            'BANK': 'Bank Transfer',
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
            'TELECEL': '#FF0000',
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

    const openDetailModal = (withdrawal) => {
        setSelectedWithdrawal(withdrawal);
        setShowDetailModal(true);
    };

    const filteredWithdrawals = useMemo(() => {
        let filtered = withdrawals;

        if (selectedStatus !== 'ALL') {
            filtered = filtered.filter(w => w.status === selectedStatus);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(w =>
                w.username?.toLowerCase().includes(query) ||
                w.user_email?.toLowerCase().includes(query) ||
                w.mobile_money_number?.includes(query) ||
                w.id?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [withdrawals, selectedStatus, searchQuery]);

    const statusOptions = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedStatus('ALL');
    };

    const hasActiveFilters = selectedStatus !== 'ALL' || searchQuery;

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
                        Manage your withdrawal requests and history
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '4px' : '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowRequestModal(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '4px' : '8px',
                            padding: isMobile ? '8px 14px' : '10px 20px',
                            borderRadius: isMobile ? '8px' : '10px',
                            border: 'none',
                            backgroundColor: colors.btnBg,
                            color: colors.btnText,
                            cursor: 'pointer',
                            fontSize: isMobile ? '12px' : '14px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease',
                            whiteSpace: 'nowrap',
                            boxShadow: `0 4px 12px ${colors.btnBg}44`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 8px 24px ${colors.btnBg}66`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.btnBg}44`;
                        }}
                    >
                        <Plus size={isMobile ? 16 : 18} />
                        {!isMobile && 'Request Withdrawal'}
                    </button>
                    <button
                        onClick={() => {
                            fetchWithdrawals();
                            fetchSummary();
                        }}
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

            
            {summary && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)',
                    gap: isMobile ? '6px' : '10px',
                    marginBottom: isMobile ? '12px' : '16px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '8px' : '10px',
                        padding: isMobile ? '8px 10px' : '10px 12px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: isMobile ? '7px' : '9px', color: colors.secondaryText }}>Wallet</div>
                        <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '700', color: colors.btnBg }}>
                            ₵{parseFloat(summary.wallet_balance || 0).toFixed(2)}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '8px' : '10px',
                        padding: isMobile ? '8px 10px' : '10px 12px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: isMobile ? '7px' : '9px', color: colors.secondaryText }}>Total</div>
                        <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '700', color: colors.heading }}>
                            {summary.total_requests || 0}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '8px' : '10px',
                        padding: isMobile ? '8px 10px' : '10px 12px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: isMobile ? '7px' : '9px', color: colors.secondaryText }}>Pending</div>
                        <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '700', color: '#F59E0B' }}>
                            {summary.total_pending || 0}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '8px' : '10px',
                        padding: isMobile ? '8px 10px' : '10px 12px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: isMobile ? '7px' : '9px', color: colors.secondaryText }}>Processing</div>
                        <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '700', color: '#3B82F6' }}>
                            {summary.total_processing ?? withdrawals.filter((item) => item.status === 'PROCESSING').length}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '8px' : '10px',
                        padding: isMobile ? '8px 10px' : '10px 12px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: isMobile ? '7px' : '9px', color: colors.secondaryText }}>Completed</div>
                        <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '700', color: '#10B981' }}>
                            {summary.total_completed || 0}
                        </div>
                    </div>
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '8px' : '10px',
                        padding: isMobile ? '8px 10px' : '10px 12px',
                        border: `1px solid ${colors.border}`,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: isMobile ? '7px' : '9px', color: colors.secondaryText }}>Withdrawn</div>
                        <div style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: '700', color: colors.btnBg }}>
                            ₵{parseFloat(summary.total_withdrawn || 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            )}

            
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
                        placeholder={isMobile ? "Search..." : "Search by ID, phone, email..."}
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
                )}

                {hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        style={{
                            fontSize: isMobile ? '11px' : '12px',
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
                            <span>ID / Date</span>
                            <span>Amount</span>
                            <span>Method</span>
                            <span>Status</span>
                            <span>Details</span>
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
                                                fontSize: '12px',
                                            }}>
                                                {withdrawal.id?.slice(0, 8) || 'N/A'}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: colors.secondaryText,
                                            }}>
                                                {formatDate(withdrawal.requested_at)}
                                            </div>
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
                                            {withdrawal.mobile_money_network && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                    color: getNetworkColor(withdrawal.mobile_money_network),
                                                }}>
                                                    {withdrawal.mobile_money_network}
                                                </div>
                                            )}
                                            {withdrawal.bank_name && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: colors.secondaryText,
                                                }}>
                                                    {withdrawal.bank_name}
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
                                            {withdrawal.processed_by_username && (
                                                <div style={{
                                                    fontSize: '9px',
                                                    color: colors.secondaryText,
                                                    marginTop: '2px',
                                                }}>
                                                    by {withdrawal.processed_by_username}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{
                                            fontSize: '11px',
                                            color: colors.secondaryText,
                                        }}>
                                            {withdrawal.mobile_money_number && (
                                                <div>{withdrawal.mobile_money_number}</div>
                                            )}
                                            {withdrawal.account_name && (
                                                <div>{withdrawal.account_name}</div>
                                            )}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: '4px',
                                        }}>
                                            <button
                                                onClick={() => openDetailModal(withdrawal)}
                                                style={{
                                                    padding: '4px 12px',
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
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: colors.heading,
                                            }}>
                                                {withdrawal.id?.slice(0, 8) || 'N/A'}
                                            </div>
                                            <div style={{
                                                fontSize: '10px',
                                                color: colors.secondaryText,
                                            }}>
                                                {formatDate(withdrawal.requested_at)}
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
                                        {withdrawal.bank_name && (
                                            <div>
                                                <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Bank</div>
                                                <div style={{ fontSize: '12px', color: colors.text }}>
                                                    {withdrawal.bank_name}
                                                </div>
                                            </div>
                                        )}
                                        {withdrawal.account_name && (
                                            <div>
                                                <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Account</div>
                                                <div style={{ fontSize: '12px', color: colors.text }}>
                                                    {withdrawal.account_name}
                                                </div>
                                            </div>
                                        )}
                                        {withdrawal.processed_by_username && (
                                            <div>
                                                <div style={{ fontSize: '8px', color: colors.secondaryText, textTransform: 'uppercase' }}>Processed By</div>
                                                <div style={{ fontSize: '11px', color: colors.secondaryText }}>
                                                    {withdrawal.processed_by_username}
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
                                            {withdrawal.notes && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: colors.secondaryText,
                                                    marginBottom: '4px',
                                                }}>
                                                    <strong>Your Notes:</strong> {withdrawal.notes}
                                                </div>
                                            )}
                                            {withdrawal.admin_notes && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: colors.secondaryText,
                                                    marginBottom: '4px',
                                                }}>
                                                    <strong>Admin Notes:</strong> {withdrawal.admin_notes}
                                                </div>
                                            )}
                                            {withdrawal.completed_at && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: colors.secondaryText,
                                                }}>
                                                    <strong>Completed:</strong> {formatDate(withdrawal.completed_at)}
                                                </div>
                                            )}
                                            {withdrawal.transaction && (
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: colors.secondaryText,
                                                }}>
                                                    <strong>Transaction:</strong> {withdrawal.transaction}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: `1px solid ${colors.border}`,
                                    }}>
                                        <button
                                            onClick={() => openDetailModal(withdrawal)}
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
                                            <Eye size={14} />
                                            View Details
                                        </button>
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
                                            {isExpanded ? 'Hide' : 'More Info'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            
            {showRequestModal && (
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
                            setShowRequestModal(false);
                            resetForm();
                        }
                    }}
                >
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '14px' : '16px',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
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
                                <Plus size={isMobile ? 18 : 20} />
                                Request Withdrawal
                            </h3>
                            <button
                                onClick={() => {
                                    setShowRequestModal(false);
                                    resetForm();
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

                        
                        {summary && (
                            <div style={{
                                padding: '12px 16px',
                                backgroundColor: colors.mainBg,
                                borderRadius: '10px',
                                border: `1px solid ${colors.border}`,
                                marginBottom: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <span style={{ fontSize: '13px', color: colors.secondaryText }}>Available Balance</span>
                                <span style={{ fontSize: '20px', fontWeight: '700', color: colors.btnBg }}>
                                    ₵{parseFloat(summary.wallet_balance || 0).toFixed(2)}
                                </span>
                            </div>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleRequestWithdrawal(); }}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Amount (₵) *
                                </label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    placeholder="Enter amount to withdraw"
                                    step="0.01"
                                    min="1"
                                    style={{
                                        width: '100%',
                                        padding: isMobile ? '8px 12px' : '10px 14px',
                                        borderRadius: '8px',
                                        border: `1.5px solid ${formErrors.amount ? colors.error : colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: isMobile ? '13px' : '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = formErrors.amount ? colors.error : colors.btnBg}
                                    onBlur={(e) => e.target.style.borderColor = formErrors.amount ? colors.error : colors.border}
                                />
                                {formErrors.amount && (
                                    <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {formErrors.amount}
                                    </span>
                                )}
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Payment Method *
                                </label>
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    flexWrap: 'wrap',
                                }}>
                                    {[
                                        { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: <Smartphone size={16} /> },
                                        { value: 'BANK', label: 'Bank Transfer', icon: <Building size={16} /> },
                                    ].map((method) => (
                                        <button
                                            key={method.value}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, payment_method: method.value }));
                                                setFormErrors(prev => ({ ...prev, payment_method: '' }));
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: isMobile ? '6px 12px' : '8px 16px',
                                                borderRadius: '8px',
                                                border: `2px solid ${formData.payment_method === method.value ? colors.btnBg : colors.border}`,
                                                backgroundColor: formData.payment_method === method.value ? `${colors.btnBg}15` : 'transparent',
                                                color: formData.payment_method === method.value ? colors.btnBg : colors.secondaryText,
                                                cursor: 'pointer',
                                                fontSize: isMobile ? '11px' : '12px',
                                                fontWeight: formData.payment_method === method.value ? '600' : '500',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            {method.icon}
                                            {method.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            
                            {formData.payment_method === 'MOBILE_MONEY' && (
                                <>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: colors.text,
                                            display: 'block',
                                            marginBottom: '4px',
                                        }}>
                                            Network *
                                        </label>
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                        }}>
                                            {['MTN', 'Telecel', 'AirtelTigo'].map((network) => (
                                                <button
                                                    key={network}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, mobile_money_network: network }));
                                                        setFormErrors(prev => ({ ...prev, mobile_money_network: '' }));
                                                    }}
                                                    style={{
                                                        padding: isMobile ? '4px 12px' : '6px 16px',
                                                        borderRadius: '6px',
                                                        border: `2px solid ${formData.mobile_money_network === network ? getNetworkColor(network) : colors.border}`,
                                                        backgroundColor: formData.mobile_money_network === network ? `${getNetworkColor(network)}20` : 'transparent',
                                                        color: formData.mobile_money_network === network ? getNetworkColor(network) : colors.secondaryText,
                                                        cursor: 'pointer',
                                                        fontSize: isMobile ? '10px' : '11px',
                                                        fontWeight: formData.mobile_money_network === network ? '600' : '500',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {network}
                                                </button>
                                            ))}
                                        </div>
                                        {formErrors.mobile_money_network && (
                                            <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                                {formErrors.mobile_money_network}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: colors.text,
                                            display: 'block',
                                            marginBottom: '4px',
                                        }}>
                                            Phone Number *
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <Phone size={18} style={{
                                                position: 'absolute',
                                                left: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: colors.secondaryText,
                                            }} />
                                            <input
                                                type="tel"
                                                name="mobile_money_number"
                                                value={formData.mobile_money_number}
                                                onChange={handleInputChange}
                                                placeholder="+233201234567"
                                                style={{
                                                    width: '100%',
                                                    padding: isMobile ? '8px 12px 8px 36px' : '10px 14px 10px 40px',
                                                    borderRadius: '8px',
                                                    border: `1.5px solid ${formErrors.mobile_money_number ? colors.error : colors.border}`,
                                                    backgroundColor: colors.raisedBg,
                                                    color: colors.text,
                                                    fontSize: isMobile ? '13px' : '14px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box',
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = formErrors.mobile_money_number ? colors.error : colors.btnBg}
                                                onBlur={(e) => e.target.style.borderColor = formErrors.mobile_money_number ? colors.error : colors.border}
                                            />
                                        </div>
                                        {formErrors.mobile_money_number && (
                                            <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                                {formErrors.mobile_money_number}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}

                            
                            {formData.payment_method === 'BANK' && (
                                <>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: colors.text,
                                            display: 'block',
                                            marginBottom: '4px',
                                        }}>
                                            Bank Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="bank_name"
                                            value={formData.bank_name}
                                            onChange={handleInputChange}
                                            placeholder="Enter bank name"
                                            style={{
                                                width: '100%',
                                                padding: isMobile ? '8px 12px' : '10px 14px',
                                                borderRadius: '8px',
                                                border: `1.5px solid ${formErrors.bank_name ? colors.error : colors.border}`,
                                                backgroundColor: colors.raisedBg,
                                                color: colors.text,
                                                fontSize: isMobile ? '13px' : '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = formErrors.bank_name ? colors.error : colors.btnBg}
                                            onBlur={(e) => e.target.style.borderColor = formErrors.bank_name ? colors.error : colors.border}
                                        />
                                        {formErrors.bank_name && (
                                            <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                                {formErrors.bank_name}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: colors.text,
                                            display: 'block',
                                            marginBottom: '4px',
                                        }}>
                                            Account Number *
                                        </label>
                                        <input
                                            type="text"
                                            name="account_number"
                                            value={formData.account_number}
                                            onChange={handleInputChange}
                                            placeholder="Enter account number"
                                            style={{
                                                width: '100%',
                                                padding: isMobile ? '8px 12px' : '10px 14px',
                                                borderRadius: '8px',
                                                border: `1.5px solid ${formErrors.account_number ? colors.error : colors.border}`,
                                                backgroundColor: colors.raisedBg,
                                                color: colors.text,
                                                fontSize: isMobile ? '13px' : '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = formErrors.account_number ? colors.error : colors.btnBg}
                                            onBlur={(e) => e.target.style.borderColor = formErrors.account_number ? colors.error : colors.border}
                                        />
                                        {formErrors.account_number && (
                                            <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                                {formErrors.account_number}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: colors.text,
                                            display: 'block',
                                            marginBottom: '4px',
                                        }}>
                                            Account Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="account_name"
                                            value={formData.account_name}
                                            onChange={handleInputChange}
                                            placeholder="Enter account holder name"
                                            style={{
                                                width: '100%',
                                                padding: isMobile ? '8px 12px' : '10px 14px',
                                                borderRadius: '8px',
                                                border: `1.5px solid ${formErrors.account_name ? colors.error : colors.border}`,
                                                backgroundColor: colors.raisedBg,
                                                color: colors.text,
                                                fontSize: isMobile ? '13px' : '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = formErrors.account_name ? colors.error : colors.btnBg}
                                            onBlur={(e) => e.target.style.borderColor = formErrors.account_name ? colors.error : colors.border}
                                        />
                                        {formErrors.account_name && (
                                            <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                                {formErrors.account_name}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Notes (Optional)
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    placeholder="Add any additional information..."
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
                                    type="button"
                                    onClick={() => {
                                        setShowRequestModal(false);
                                        resetForm();
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
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        flex: 2,
                                        padding: isMobile ? '8px' : '10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: colors.btnBg,
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
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={isMobile ? 16 : 18} />
                                            Submit Request
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            
            {showDetailModal && selectedWithdrawal && (
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
                            setShowDetailModal(false);
                            setSelectedWithdrawal(null);
                        }
                    }}
                >
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: isMobile ? '14px' : '16px',
                        maxWidth: '520px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: isMobile ? '20px' : '24px',
                        boxShadow: `0 20px 60px ${colors.shadow}`,
                        animation: 'slideUp 0.25s ease',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
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
                                <Eye size={isMobile ? 18 : 20} />
                                Withdrawal Details
                            </h3>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedWithdrawal(null);
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
                            justifyContent: 'center',
                            marginBottom: '16px',
                        }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 20px',
                                borderRadius: '20px',
                                backgroundColor: `${getStatusColor(selectedWithdrawal.status)}20`,
                                color: getStatusColor(selectedWithdrawal.status),
                                fontSize: '14px',
                                fontWeight: '600',
                            }}>
                                {getStatusIcon(selectedWithdrawal.status)}
                                {getStatusLabel(selectedWithdrawal.status)}
                            </span>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: '12px',
                        }}>
                            <div>
                                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Withdrawal ID</div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: colors.text, wordBreak: 'break-all' }}>
                                    {selectedWithdrawal.id}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Amount</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: colors.btnBg }}>
                                    ₵{parseFloat(selectedWithdrawal.amount || 0).toFixed(2)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Payment Method</div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {getPaymentMethodIcon(selectedWithdrawal.payment_method)}
                                    {getPaymentMethodLabel(selectedWithdrawal.payment_method)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: colors.secondaryText }}>Requested</div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>
                                    {formatDate(selectedWithdrawal.requested_at)}
                                </div>
                            </div>
                        </div>

                        
                        <div style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: `1px solid ${colors.border}`,
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: colors.heading, marginBottom: '8px' }}>
                                Payment Details
                            </div>
                            {selectedWithdrawal.mobile_money_number && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 0',
                                    fontSize: '13px',
                                }}>
                                    <span style={{ color: colors.secondaryText }}>Phone</span>
                                    <span style={{ color: colors.text }}>{selectedWithdrawal.mobile_money_number}</span>
                                </div>
                            )}
                            {selectedWithdrawal.mobile_money_network && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 0',
                                    fontSize: '13px',
                                }}>
                                    <span style={{ color: colors.secondaryText }}>Network</span>
                                    <span style={{ fontWeight: '600', color: getNetworkColor(selectedWithdrawal.mobile_money_network) }}>
                                        {selectedWithdrawal.mobile_money_network}
                                    </span>
                                </div>
                            )}
                            {selectedWithdrawal.bank_name && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 0',
                                    fontSize: '13px',
                                }}>
                                    <span style={{ color: colors.secondaryText }}>Bank</span>
                                    <span style={{ color: colors.text }}>{selectedWithdrawal.bank_name}</span>
                                </div>
                            )}
                            {selectedWithdrawal.account_number && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 0',
                                    fontSize: '13px',
                                }}>
                                    <span style={{ color: colors.secondaryText }}>Account Number</span>
                                    <span style={{ color: colors.text }}>{selectedWithdrawal.account_number}</span>
                                </div>
                            )}
                            {selectedWithdrawal.account_name && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '4px 0',
                                    fontSize: '13px',
                                }}>
                                    <span style={{ color: colors.secondaryText }}>Account Name</span>
                                    <span style={{ color: colors.text }}>{selectedWithdrawal.account_name}</span>
                                </div>
                            )}
                        </div>

                        
                        {(selectedWithdrawal.notes || selectedWithdrawal.admin_notes) && (
                            <div style={{
                                marginTop: '16px',
                                paddingTop: '16px',
                                borderTop: `1px solid ${colors.border}`,
                            }}>
                                {selectedWithdrawal.notes && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <div style={{ fontSize: '12px', color: colors.secondaryText, marginBottom: '2px' }}>Your Notes</div>
                                        <div style={{ fontSize: '13px', color: colors.text }}>{selectedWithdrawal.notes}</div>
                                    </div>
                                )}
                                {selectedWithdrawal.admin_notes && (
                                    <div>
                                        <div style={{ fontSize: '12px', color: colors.secondaryText, marginBottom: '2px' }}>Admin Notes</div>
                                        <div style={{ fontSize: '13px', color: colors.text }}>{selectedWithdrawal.admin_notes}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        
                        <div style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: `1px solid ${colors.border}`,
                        }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: colors.heading, marginBottom: '8px' }}>
                                Timeline
                            </div>
                            <div style={{ fontSize: '12px', color: colors.secondaryText }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                    <span>Requested</span>
                                    <span>{formatDate(selectedWithdrawal.requested_at)}</span>
                                </div>
                                {selectedWithdrawal.processed_at && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span>Processed</span>
                                        <span>{formatDate(selectedWithdrawal.processed_at)}</span>
                                    </div>
                                )}
                                {selectedWithdrawal.completed_at && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span>Completed</span>
                                        <span>{formatDate(selectedWithdrawal.completed_at)}</span>
                                    </div>
                                )}
                                {selectedWithdrawal.processed_by_username && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                                        <span>Processed By</span>
                                        <span>{selectedWithdrawal.processed_by_username}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        
                        {selectedWithdrawal.transaction && (
                            <div style={{
                                marginTop: '12px',
                                paddingTop: '12px',
                                borderTop: `1px solid ${colors.border}`,
                            }}>
                                <div style={{ fontSize: '12px', color: colors.secondaryText, marginBottom: '2px' }}>Transaction Reference</div>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: colors.text, wordBreak: 'break-all' }}>
                                    {selectedWithdrawal.transaction}
                                </div>
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            marginTop: '20px',
                            paddingTop: '18px',
                            borderTop: `1px solid ${colors.border}`,
                        }}>
                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setSelectedWithdrawal(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
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
                            {selectedWithdrawal.status === 'PENDING' && (
                                <button
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setSelectedWithdrawal(null);
                                        showToast('Please wait for admin to process your withdrawal request.', 'info');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: colors.warning,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <Clock size={16} />
                                    Pending Approval
                                </button>
                            )}
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

export default Withdrawals;

