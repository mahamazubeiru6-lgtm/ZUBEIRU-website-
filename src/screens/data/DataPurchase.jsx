import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { ArrowLeft, User, Phone, Users, CreditCard, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2, Package, Wifi, Clock, Shield, Zap, Info, Lock, ArrowRight, Smartphone, WalletCards } from 'lucide-react';

const DataPurchase = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { colors } = useTheme();
    const { authFetch } = useAuth();
    const { showToast } = useToast();

    const routedPackage = location.state?.package?.id === id ? location.state.package : null;
    const [fetching, setFetching] = useState(!routedPackage);
    const [packageData, setPackageData] = useState(routedPackage);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [saveRecipient, setSaveRecipient] = useState(false);
    const [recipientName, setRecipientName] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [showRecipients, setShowRecipients] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('paystack');
    const [walletBalance, setWalletBalance] = useState(null);
    const pendingOrder = useRef(null);
    const purchaseInProgress = useRef(false);
    const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchPackage = async () => {
            if (routedPackage) {
                setPackageData(routedPackage);
                setFetching(false);
                return;
            }

            try {
                setFetching(true);
                const response = await authFetch(`/data/packages/${id}/`);
                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    const pkg = data.data;
                    setPackageData({
                        id: pkg.id,
                        network: pkg.network,
                        size: `${pkg.size_gb}GB`,
                        price: parseFloat(pkg.effective_price || pkg.base_price_customer),
                        priceDisplay: `₵${parseFloat(pkg.effective_price || pkg.base_price_customer).toFixed(2)}`,
                        originalPrice: pkg.base_price_customer ? parseFloat(pkg.base_price_customer) : null,
                        validity: '30 Days',
                        description: pkg.description || 'High-speed data bundle with instant activation',
                    });
                } else {
                    showToast(data.message || 'Package not found', 'error');
                    navigate('/data');
                }
            } catch (error) {
                console.error('Error fetching package:', error);
                showToast('Failed to load package details', 'error');
                navigate('/data');
            } finally {
                setFetching(false);
            }
        };

        fetchPackage();
        fetchRecipients();
    }, [authFetch, id, navigate, routedPackage, showToast]);

    useEffect(() => {
        let active = true;
        authFetch('/accounts/wallet/')
            .then((response) => response.ok ? response.json() : null)
            .then((payload) => {
                if (active) setWalletBalance(payload?.data?.balance ?? null);
            })
            .catch(() => {});
        return () => { active = false; };
    }, [authFetch]);

    const fetchRecipients = async () => {
        try {
            const response = await authFetch('/data/recipients/');
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                setRecipients(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching recipients:', error);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneNumber) {
            newErrors.phoneNumber = 'Phone number is required';
        } else if (!phoneRegex.test(phoneNumber)) {
            newErrors.phoneNumber = 'Enter a valid 10-digit phone number (e.g., 0244123456)';
        }

        if (saveRecipient && !recipientName.trim()) {
            newErrors.recipientName = 'Recipient name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePurchase = async () => {
        if (purchaseInProgress.current || !validateForm()) return;
        purchaseInProgress.current = true;

        try {
            setSubmitting(true);

            const orderPayload = {
                package: id,
                recipient_name: recipientName || 'Customer',
                recipient_phone: phoneNumber,
                ...(saveRecipient && { save_recipient: true }),
            };

            const orderKey = JSON.stringify(orderPayload);
            if (pendingOrder.current?.key !== orderKey) {
                const orderResponse = await authFetch('/data/orders/', {
                    method: 'POST',
                    body: orderPayload,
                });
                const orderData = await orderResponse.json();

                if (!orderResponse.ok) {
                    const firstError = Object.values(orderData.errors || {})[0];
                    showToast(firstError?.[0] || orderData.message || 'Failed to create order', 'error');
                    return;
                }
                pendingOrder.current = { key: orderKey, order: orderData.data.order };
            }

            const order = pendingOrder.current.order;
            const orderPrice = Number(order.customer_price);
            if (Number.isFinite(orderPrice) && orderPrice !== packageData.price) {
                setPackageData((current) => ({ ...current, price: orderPrice, priceDisplay: `₵${orderPrice.toFixed(2)}` }));
                showToast('The package price changed. Review the new total before paying.', 'warning');
                return;
            }

            const paymentResponse = await authFetch(`/data/orders/${order.id}/pay/`, {
                method: 'POST',
                body: { payment_method: selectedPaymentMethod },
            });

            const paymentData = await paymentResponse.json();

            if (!paymentResponse.ok) {
                showToast(paymentData.message || 'Failed to initiate payment', 'error');
                return;
            }

            if (selectedPaymentMethod === 'wallet') {
                const payment = paymentData.data;
                window.dispatchEvent(new CustomEvent('wallet-balance-updated', { detail: { balance: payment.wallet_balance } }));
                showToast(paymentData.message, payment.order_status === 'FAILED' ? 'warning' : 'success');
                navigate('/orders');
            } else if (paymentData.data.authorization_url) {
                window.location.href = paymentData.data.authorization_url;
            } else {
                showToast('No payment URL received', 'error');
            }

        } catch (error) {
            console.error('Purchase error:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            purchaseInProgress.current = false;
            setSubmitting(false);
        }
    };

    const handleRecipientSelect = (recipient) => {
        setPhoneNumber(recipient.phone_number || recipient.phone);
        setRecipientName(recipient.name);
        setShowRecipients(false);
    };

    const getNetworkConfig = (network) => {
        const configs = {
            'MTN': { color: '#FFD700', bg: '#FFD70015', label: 'MTN' },
            'MTN_EXPRESS': { color: '#FFD700', bg: '#FFD70015', label: 'MTN Express' },
            'Telecel': { color: '#FF0000', bg: '#FF000015', label: 'Telecel' },
            'AirtelTigo': { color: '#1A73E8', bg: '#1A73E815', label: 'AirtelTigo' },
            'AT_BIGTIME': { color: '#1A73E8', bg: '#1A73E815', label: 'AT BigTime' },
        };
        return configs[network] || { color: colors.btnBg, bg: `${colors.btnBg}15`, label: network };
    };

    const networkConfig = packageData ? getNetworkConfig(packageData.network) : { color: colors.btnBg, bg: `${colors.btnBg}15`, label: '' };

    if (fetching) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: isMobile ? '300px' : '500px',
                flexDirection: 'column',
                gap: isMobile ? '12px' : '20px',
                padding: '20px',
            }}>
                <div className="spinner" style={{
                    width: isMobile ? '32px' : '48px',
                    height: isMobile ? '32px' : '48px',
                    border: `3px solid ${colors.border}`,
                    borderTop: `3px solid ${colors.btnBg}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '14px' }}>
                    Loading package details...
                </span>
            </div>
        );
    }

    if (!packageData) return null;

    const networkColor = networkConfig.color;

    return (
        <div style={{
            maxWidth: '640px',
            margin: '0 auto',
            padding: isMobile ? '12px 12px 30px' : '16px 16px 40px',
            width: '100%',
            boxSizing: 'border-box',
        }}>
            
            <button
                onClick={() => navigate('/data')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: colors.secondaryText,
                    cursor: 'pointer',
                    padding: isMobile ? '4px 2px' : '8px 4px',
                    marginBottom: isMobile ? '12px' : '20px',
                    fontSize: isMobile ? '12px' : '14px',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.heading}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.secondaryText}
            >
                <ArrowLeft size={isMobile ? 16 : 20} />
                {!isMobile && 'Back to packages'}
            </button>

            
            <div style={{
                marginBottom: isMobile ? '16px' : '24px',
            }}>
                <h1 style={{
                    fontSize: isMobile ? 'clamp(20px, 5vw, 24px)' : 'clamp(24px, 3vw, 32px)',
                    fontWeight: '800',
                    color: colors.heading,
                    margin: '0 0 2px 0',
                    letterSpacing: '-0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '6px' : '10px',
                    flexWrap: 'wrap',
                }}>
                    <span>Complete Purchase</span>
                    <span style={{
                        fontSize: isMobile ? '10px' : '14px',
                        fontWeight: '600',
                        color: colors.success,
                        background: colors.successBg,
                        padding: isMobile ? '1px 8px' : '2px 12px',
                        borderRadius: isMobile ? '8px' : '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '2px' : '4px',
                    }}>
                        <Shield size={isMobile ? 12 : 14} />
                        Secure
                    </span>
                </h1>
                <p style={{
                    color: colors.secondaryText,
                    margin: 0,
                    fontSize: isMobile ? '12px' : '14px',
                }}>
                    Fill in the details below to complete your data purchase
                </p>
            </div>

            
            <div style={{
                backgroundColor: colors.raisedBg,
                borderRadius: isMobile ? '14px' : '20px',
                padding: isMobile ? '16px 18px' : '24px',
                marginBottom: isMobile ? '16px' : '24px',
                border: `1px solid ${colors.border}`,
                boxShadow: `0 4px 20px ${colors.shadow}`,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-60px',
                    right: '-60px',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${networkColor}15 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-40px',
                    left: '-40px',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${networkColor}08 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '4px' : '8px',
                        marginBottom: isMobile ? '4px' : '8px',
                        flexWrap: 'wrap',
                    }}>
                        <span style={{
                            fontSize: isMobile ? '9px' : '11px',
                            fontWeight: '600',
                            color: networkColor,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            background: networkConfig.bg,
                            padding: isMobile ? '1px 8px' : '2px 12px',
                            borderRadius: isMobile ? '8px' : '12px',
                            border: `1px solid ${networkColor}30`,
                        }}>
                            <Wifi size={isMobile ? 10 : 12} style={{ display: 'inline', marginRight: '4px' }} />
                            {networkConfig.label}
                        </span>
                        <span style={{
                            fontSize: isMobile ? '9px' : '11px',
                            color: colors.secondaryText,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <Clock size={isMobile ? 10 : 12} />
                            {packageData.validity}
                        </span>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: isMobile ? '8px' : '12px',
                    }}>
                        <div>
                            <div style={{
                                fontSize: isMobile ? 'clamp(22px, 6vw, 28px)' : 'clamp(28px, 4vw, 36px)',
                                fontWeight: '800',
                                color: colors.heading,
                                lineHeight: '1.1',
                            }}>
                                {packageData.size}
                            </div>
                            <div style={{
                                fontSize: isMobile ? '11px' : '13px',
                                color: colors.secondaryText,
                                marginTop: isMobile ? '2px' : '4px',
                            }}>
                                {packageData.description}
                            </div>
                        </div>
                        <div style={{
                            textAlign: 'right',
                        }}>
                            <div style={{
                                fontSize: isMobile ? 'clamp(22px, 6vw, 28px)' : 'clamp(28px, 4vw, 36px)',
                                fontWeight: '800',
                                color: networkColor,
                                lineHeight: '1.1',
                            }}>
                                {packageData.priceDisplay}
                            </div>
                            {packageData.originalPrice && packageData.originalPrice !== packageData.price && (
                                <div style={{
                                    fontSize: isMobile ? '11px' : '14px',
                                    color: colors.secondaryText,
                                    textDecoration: 'line-through',
                                }}>
                                    ₵{packageData.originalPrice.toFixed(2)}
                                </div>
                            )}
                            <div style={{
                                fontSize: isMobile ? '9px' : '11px',
                                color: colors.success,
                                fontWeight: '600',
                                marginTop: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '4px',
                            }}>
                                <Zap size={isMobile ? 10 : 12} />
                                Best Price
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            
            <div style={{
                marginBottom: isMobile ? '14px' : '20px',
                backgroundColor: colors.raisedBg,
                borderRadius: isMobile ? '12px' : '16px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden',
            }}>
                <button
                    onClick={() => setOrderSummaryExpanded(!orderSummaryExpanded)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: isMobile ? '10px 14px' : '14px 18px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: colors.text,
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '6px' : '10px',
                    }}>
                        <Package size={isMobile ? 16 : 18} style={{ color: colors.btnBg }} />
                        <span style={{ fontWeight: '600', fontSize: isMobile ? '13px' : '14px' }}>Order Summary</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '4px' : '8px',
                    }}>
                        <span style={{
                            fontSize: isMobile ? '13px' : '14px',
                            fontWeight: '600',
                            color: colors.heading,
                        }}>
                            {packageData.priceDisplay}
                        </span>
                        {orderSummaryExpanded ? <ChevronUp size={isMobile ? 16 : 18} /> : <ChevronDown size={isMobile ? 16 : 18} />}
                    </div>
                </button>

                {orderSummaryExpanded && (
                    <div style={{
                        padding: isMobile ? '0 14px 14px' : '0 18px 18px',
                        borderTop: `1px solid ${colors.border}`,
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: isMobile ? '6px 0' : '10px 0',
                            fontSize: isMobile ? '12px' : '13px',
                            color: colors.secondaryText,
                        }}>
                            <span>Data Package</span>
                            <span>{packageData.size} ({networkConfig.label})</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: isMobile ? '6px 0' : '10px 0',
                            fontSize: isMobile ? '12px' : '13px',
                            color: colors.secondaryText,
                            borderTop: `1px solid ${colors.border}`,
                        }}>
                            <span>Price</span>
                            <span style={{ fontWeight: '600', color: colors.heading }}>{packageData.priceDisplay}</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: isMobile ? '6px 0' : '10px 0',
                            fontSize: isMobile ? '12px' : '13px',
                            color: colors.secondaryText,
                            borderTop: `1px solid ${colors.border}`,
                        }}>
                            <span>Validity</span>
                            <span>{packageData.validity}</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: isMobile ? '8px 0' : '12px 0',
                            fontSize: isMobile ? '13px' : '15px',
                            fontWeight: '700',
                            color: colors.heading,
                            borderTop: `2px solid ${colors.border}`,
                        }}>
                            <span>Total</span>
                            <span style={{ color: networkColor }}>{packageData.priceDisplay}</span>
                        </div>
                    </div>
                )}
            </div>

            
            {recipients.length > 0 && (
                <div style={{
                    marginBottom: isMobile ? '14px' : '20px',
                }}>
                    <button
                        onClick={() => setShowRecipients(!showRecipients)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: isMobile ? '10px 14px' : '14px 18px',
                            backgroundColor: colors.raisedBg,
                            borderRadius: isMobile ? '10px' : '14px',
                            border: `1px solid ${showRecipients ? colors.btnBg : colors.border}`,
                            cursor: 'pointer',
                            color: colors.text,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '10px',
                        }}>
                            <Users size={isMobile ? 16 : 18} style={{ color: colors.btnBg }} />
                            <span style={{ fontWeight: '500', fontSize: isMobile ? '13px' : '14px' }}>Saved Recipients</span>
                            <span style={{
                                fontSize: isMobile ? '9px' : '11px',
                                color: colors.secondaryText,
                                background: colors.border,
                                padding: isMobile ? '0 6px' : '1px 8px',
                                borderRadius: isMobile ? '6px' : '10px',
                            }}>
                                {recipients.length}
                            </span>
                        </div>
                        {showRecipients ? <ChevronUp size={isMobile ? 16 : 18} /> : <ChevronDown size={isMobile ? 16 : 18} />}
                    </button>

                    {showRecipients && (
                        <div style={{
                            marginTop: '6px',
                            backgroundColor: colors.raisedBg,
                            borderRadius: isMobile ? '10px' : '14px',
                            border: `1px solid ${colors.border}`,
                            overflow: 'hidden',
                            boxShadow: `0 4px 12px ${colors.shadow}`,
                        }}>
                            {recipients.map((recipient) => (
                                <button
                                    key={recipient.id}
                                    onClick={() => handleRecipientSelect(recipient)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? '8px' : '12px',
                                        width: '100%',
                                        padding: isMobile ? '8px 12px' : '12px 16px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: `1px solid ${colors.border}`,
                                        cursor: 'pointer',
                                        color: colors.text,
                                        transition: 'background 0.2s',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        width: isMobile ? '32px' : '40px',
                                        height: isMobile ? '32px' : '40px',
                                        borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${colors.btnBg}25, ${colors.btnBg}10)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: colors.btnBg,
                                        flexShrink: 0,
                                    }}>
                                        <User size={isMobile ? 14 : 18} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: isMobile ? '13px' : '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {recipient.name}
                                        </div>
                                        <div style={{ fontSize: isMobile ? '11px' : '13px', color: colors.secondaryText }}>
                                            {recipient.phone_number || recipient.phone}
                                        </div>
                                    </div>
                                    <CheckCircle size={isMobile ? 16 : 18} style={{ color: colors.btnBg, flexShrink: 0 }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            
            <div style={{
                marginBottom: isMobile ? '14px' : '20px',
            }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '4px' : '8px',
                    fontSize: isMobile ? '13px' : '14px',
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: isMobile ? '4px' : '6px',
                }}>
                    <Smartphone size={isMobile ? 14 : 16} />
                    Phone Number
                </label>
                <div style={{
                    position: 'relative',
                }}>
                    <Phone
                        size={isMobile ? 16 : 18}
                        style={{
                            position: 'absolute',
                            left: isMobile ? '12px' : '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: colors.secondaryText,
                        }}
                    />
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 10) {
                                setPhoneNumber(value);
                                if (errors.phoneNumber) {
                                    setErrors({ ...errors, phoneNumber: '' });
                                }
                            }
                        }}
                        placeholder="0244123456"
                        style={{
                            width: '100%',
                            padding: isMobile ? '10px 12px 10px 36px' : '14px 16px 14px 44px',
                            borderRadius: isMobile ? '10px' : '14px',
                            border: `1.5px solid ${errors.phoneNumber ? colors.error : colors.border}`,
                            backgroundColor: colors.raisedBg,
                            color: colors.text,
                            fontSize: isMobile ? '14px' : '16px',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxShadow: errors.phoneNumber ? `0 0 0 3px ${colors.error}20` : 'none',
                            minHeight: isMobile ? '44px' : 'auto',
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = errors.phoneNumber ? colors.error : colors.btnBg;
                            if (!errors.phoneNumber) {
                                e.target.style.boxShadow = `0 0 0 3px ${colors.btnBg}20`;
                            }
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = errors.phoneNumber ? colors.error : colors.border;
                            e.target.style.boxShadow = errors.phoneNumber ? `0 0 0 3px ${colors.error}20` : 'none';
                        }}
                    />
                </div>
                {errors.phoneNumber && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: isMobile ? '12px' : '13px',
                        color: colors.error,
                    }}>
                        <AlertCircle size={isMobile ? 12 : 14} />
                        {errors.phoneNumber}
                    </div>
                )}
                <div style={{
                    fontSize: isMobile ? '10px' : '12px',
                    color: colors.secondaryText,
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    <Info size={isMobile ? 12 : 14} />
                    Enter the recipient's phone number (10 digits, no prefix)
                </div>
            </div>

            
            <div style={{
                marginBottom: isMobile ? '16px' : '24px',
                padding: isMobile ? '12px 14px' : '16px 18px',
                backgroundColor: colors.raisedBg,
                borderRadius: isMobile ? '10px' : '14px',
                border: `1px solid ${colors.border}`,
            }}>
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '8px' : '12px',
                    cursor: 'pointer',
                }}>
                    <input
                        type="checkbox"
                        checked={saveRecipient}
                        onChange={(e) => {
                            setSaveRecipient(e.target.checked);
                            if (!e.target.checked) {
                                setRecipientName('');
                                setErrors({ ...errors, recipientName: '' });
                            }
                        }}
                        style={{
                            width: '18px',
                            height: '18px',
                            accentColor: colors.btnBg,
                            cursor: 'pointer',
                            borderRadius: '4px',
                        }}
                    />
                    <div>
                        <div style={{
                            fontSize: isMobile ? '13px' : '14px',
                            fontWeight: '500',
                            color: colors.text,
                        }}>
                            Save this recipient
                        </div>
                        <div style={{
                            fontSize: isMobile ? '10px' : '12px',
                            color: colors.secondaryText,
                        }}>
                            For faster future purchases
                        </div>
                    </div>
                </label>

                {saveRecipient && (
                    <div style={{
                        marginTop: isMobile ? '10px' : '14px',
                        paddingTop: isMobile ? '10px' : '14px',
                        borderTop: `1px solid ${colors.border}`,
                    }}>
                        <label style={{
                            display: 'block',
                            fontSize: isMobile ? '12px' : '13px',
                            fontWeight: '500',
                            color: colors.text,
                            marginBottom: isMobile ? '4px' : '6px',
                        }}>
                            Recipient Name
                        </label>
                        <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => {
                                setRecipientName(e.target.value);
                                if (errors.recipientName) {
                                    setErrors({ ...errors, recipientName: '' });
                                }
                            }}
                            placeholder="e.g., John Doe"
                            style={{
                                width: '100%',
                                padding: isMobile ? '8px 12px' : '12px 14px',
                                borderRadius: isMobile ? '8px' : '12px',
                                border: `1.5px solid ${errors.recipientName ? colors.error : colors.border}`,
                                backgroundColor: colors.raisedBg,
                                color: colors.text,
                                fontSize: isMobile ? '13px' : '14px',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                minHeight: isMobile ? '40px' : 'auto',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = errors.recipientName ? colors.error : colors.btnBg;
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = errors.recipientName ? colors.error : colors.border;
                            }}
                        />
                        {errors.recipientName && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px',
                                fontSize: isMobile ? '12px' : '13px',
                                color: colors.error,
                            }}>
                                <AlertCircle size={isMobile ? 12 : 14} />
                                {errors.recipientName}
                            </div>
                        )}
                    </div>
                )}
            </div>

            
            <div style={{
                marginBottom: isMobile ? '16px' : '24px',
                padding: isMobile ? '12px 14px' : '16px 18px',
                backgroundColor: colors.raisedBg,
                borderRadius: isMobile ? '10px' : '14px',
                border: `1px solid ${colors.border}`,
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '6px' : '10px',
                    marginBottom: isMobile ? '8px' : '12px',
                }}>
                    <CreditCard size={isMobile ? 16 : 18} style={{ color: colors.btnBg }} />
                    <span style={{
                        fontSize: isMobile ? '13px' : '14px',
                        fontWeight: '600',
                        color: colors.text,
                    }}>
                        Payment Method
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    gap: isMobile ? '6px' : '10px',
                    flexWrap: 'wrap',
                }}>
                    {[
                        { method: 'paystack', Icon: Lock, label: 'Paystack', detail: 'Card, Mobile Money' },
                        { method: 'wallet', Icon: WalletCards, label: 'Wallet', detail: walletBalance === null ? 'Use your wallet balance' : `₵${Number(walletBalance).toFixed(2)} available` },
                    ].map(({ method, Icon, label, detail }) => {
                        const selected = selectedPaymentMethod === method;
                        return (
                            <button type="button" key={method} aria-pressed={selected} disabled={submitting}
                                onClick={() => setSelectedPaymentMethod(method)} style={{
                                    flex: 1, minWidth: 140, padding: isMobile ? '8px 12px' : '12px 16px',
                                    borderRadius: 10, border: `2px solid ${selected ? colors.btnBg : colors.border}`,
                                    background: selected ? colors.activeBg : 'transparent', color: colors.text,
                                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer',
                                }}>
                                <Icon size={17} color={selected ? colors.btnBg : colors.secondaryText} />
                                <span><strong>{label}</strong><br /><small style={{ color: colors.secondaryText }}>{detail}</small></span>
                                {selected && <CheckCircle size={16} color={colors.btnBg} style={{ marginLeft: 'auto' }} />}
                            </button>
                        );
                    })}
                </div>
                {selectedPaymentMethod === 'wallet' && walletBalance !== null && Number(walletBalance) < packageData.price && (
                    <p style={{ color: colors.secondaryText }}><Link to="/wallet">Add funds to your wallet</Link> or choose Paystack.</p>
                )}
            </div>

            
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: isMobile ? '12px' : '24px',
                marginBottom: isMobile ? '16px' : '24px',
                flexWrap: 'wrap',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: isMobile ? '10px' : '12px',
                    color: colors.secondaryText,
                }}>
                    <Lock size={isMobile ? 12 : 14} color={colors.success} />
                    Secure Payment
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: isMobile ? '10px' : '12px',
                    color: colors.secondaryText,
                }}>
                    <Clock size={isMobile ? 12 : 14} color={colors.warning} />
                    Instant Delivery
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: isMobile ? '10px' : '12px',
                    color: colors.secondaryText,
                }}>
                    <Shield size={isMobile ? 12 : 14} color={colors.linkColor} />
                    100% Guaranteed
                </div>
            </div>

            
            <button
                onClick={handlePurchase}
                disabled={submitting}
                style={{
                    width: '100%',
                    padding: isMobile ? '14px' : '18px',
                    borderRadius: isMobile ? '10px' : '14px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.btnBg}, ${colors.btnBg}CC)`,
                    color: colors.btnText,
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '700',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? '8px' : '12px',
                    boxShadow: `0 4px 20px ${colors.btnBg}44`,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: isMobile ? '48px' : 'auto',
                }}
                onMouseEnter={(e) => {
                    if (!submitting) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 8px 32px ${colors.btnBg}66`;
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 20px ${colors.btnBg}44`;
                }}
            >
                {submitting ? (
                    <>
                        <Loader2 size={isMobile ? 16 : 20} style={{ animation: 'spin 1s linear infinite' }} />
                        Processing Payment...
                    </>
                ) : (
                    <>
                        <Lock size={isMobile ? 16 : 20} />
                        {selectedPaymentMethod === 'wallet' ? 'Pay with Wallet' : 'Proceed to Payment'}
                        <ArrowRight size={isMobile ? 16 : 18} />
                    </>
                )}
            </button>

            <div style={{
                marginTop: isMobile ? '10px' : '14px',
                fontSize: isMobile ? '10px' : '12px',
                color: colors.secondaryText,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
            }}>
                <Shield size={isMobile ? 12 : 14} color={colors.success} />
                {selectedPaymentMethod === 'wallet'
                    ? 'The package price will be deducted from your wallet.'
                    : 'You will be redirected to Paystack to complete your payment securely'}
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default DataPurchase;

