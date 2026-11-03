import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { STOREFRONT_DOMAIN } from '../config';
import { User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle, ArrowRight, Store, Users, Globe, ChevronLeft, ShoppingBag, TrendingUp, Shield, Zap, AlertCircle, Coins, Building2, Loader2 } from 'lucide-react';

const Register = () => {
    const { colors } = useTheme();
    const { login, API_BASE_URL } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [selectedRole, setSelectedRole] = useState('CUSTOMER');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [currentStep, setCurrentStep] = useState(1);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone_number: '',
        password: '',
        password_confirm: '',
        role: 'CUSTOMER',
        shop_name: '',
        shop_description: '',
        shop_url: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setIsMobile(window.innerWidth <= 768);
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const roles = [
        {
            id: 'CUSTOMER',
            label: 'Customer',
            icon: <Users size={28} />,
            description: 'Buy data packages & products at the best prices',
            features: [
                { icon: <ShoppingBag size={16} />, text: 'Access to all data packages' },
                { icon: <Store size={16} />, text: 'Affordable data bundles' },
                { icon: <Zap size={16} />, text: 'Agent storefront pricing' },
                { icon: <TrendingUp size={16} />, text: 'Order tracking' }
            ],
            color: '#4DA6E8',
            bg: 'rgba(77, 166, 232, 0.1)',
            fee: null,
            feeLabel: 'Free Registration'
        },
        {
            id: 'AGENT',
            label: 'Agent',
            icon: <Store size={28} />,
            description: 'Sell data packages, build your business empire',
            features: [
                { icon: <TrendingUp size={16} />, text: 'Set your own prices' },
                { icon: <Users size={16} />, text: 'Manage sub-agents' },
                { icon: <Shield size={16} />, text: 'Track sales & profits' },
                { icon: <Globe size={16} />, text: 'Custom store URL' }
            ],
            color: '#22C55E',
            bg: 'rgba(34, 197, 94, 0.1)',
            fee: '',
            feeLabel: 'Registration Fee'
        },
    ];

    const getSelectedRoleData = () => roles.find(r => r.id === selectedRole);

    const handleRoleChange = (role) => {
        setSelectedRole(role);
        setFormData(prev => ({ ...prev, role }));
        setErrors({});
    };

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!selectedRole) {
                showToast('Please select a role to continue.', 'error');
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (validateUserInfo()) {
                if (selectedRole === 'AGENT') {
                    setCurrentStep(3);
                } else {
                    handleSubmitDirect();
                }
            }
        } else if (currentStep === 3) {
            if (validateStoreDetails()) {
                handleSubmitDirect();
            }
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const validateStoreUrl = (url) => {
        if (!url) return 'Store URL is required';
        const trimmed = url.trim();
        if (trimmed.length < 3) return 'Store URL must be at least 3 characters';
        if (trimmed.length > 30) return 'Store URL must be less than 30 characters';
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmed)) {
            return 'Use only lowercase letters, numbers, and hyphens';
        }
        if (trimmed.includes('--')) return 'Cannot contain consecutive hyphens';
        if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
            return 'Cannot start or end with a hyphen';
        }
        return '';
    };

    const validateUserInfo = () => {
        const newErrors = {};

        if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
        if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            if (formData.email) newErrors.email = 'Enter a valid email address';
        }
        if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required';
        if (!/^[0-9]{10}$/.test(formData.phone_number.replace(/\D/g, ''))) {
            if (formData.phone_number) newErrors.phone_number = 'Enter a valid 10-digit phone number';
        }
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password.length < 8) {
            if (formData.password) newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.password_confirm) {
            if (formData.password && formData.password_confirm) {
                newErrors.password_confirm = 'Passwords do not match';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStoreDetails = () => {
        const newErrors = {};
        if (!formData.shop_name.trim()) newErrors.shop_name = 'Shop name is required';

        const urlValidation = validateStoreUrl(formData.shop_url);
        if (urlValidation) {
            newErrors.shop_url = urlValidation;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitDirect = async () => {
        if (selectedRole === 'AGENT') {
            const urlValidation = validateStoreUrl(formData.shop_url);
            if (urlValidation) {
                setErrors(prev => ({ ...prev, shop_url: urlValidation }));
                showToast(urlValidation, 'error');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                role: selectedRole,
                phone_number: formData.phone_number.startsWith('+')
                    ? formData.phone_number
                    : `+233${formData.phone_number.replace(/^0/, '')}`,
            };

            const response = await fetch(`${API_BASE_URL}/accounts/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.status === 201 && data.status === 'success') {
                const regData = data.data.registration;
                const userId = data.data.user_id;

                localStorage.setItem('registration_user_id', userId);
                if (data.data.shop_url) {
                    localStorage.setItem('registration_shop_url', data.data.shop_url);
                }
                if (data.data.role === 'AGENT') {
                    localStorage.setItem('registration_dashboard_url', '/agent/dashboard');
                } else if (data.data.role === 'SUB_AGENT') {
                    localStorage.setItem('registration_dashboard_url', '/subagent/dashboard');
                }

                if (regData.requires_fee) {
                    setIsRedirecting(true);
                    showToast('Account created. Complete payment to activate it.', 'info');
                    navigate('/activate-registration', { state: { userId } });
                    return;
                }

                if (data.data.tokens) {
                    login(
                        {
                            id: userId,
                            role: data.data.role,
                            shop_url: data.data.shop_url,
                            is_active: regData.is_active,
                            agent_profile: data.data.role === 'AGENT'
                                ? {
                                    registration_fee_paid: true,
                                    registration_fee_amount: regData.fee_amount,
                                    store_url: data.data.shop_url,
                                }
                                : null,
                        },
                        data.data.tokens.access,
                        data.data.tokens.refresh
                    );
                    showToast('Registration successful! Welcome to DataHub.', 'success');
                    navigate(data.data.role === 'AGENT' ? '/agent/dashboard' : '/');
                    return;
                }

                showToast('Account created. Sign in to continue.', 'success');
                navigate('/login');
            } else {
                if (data.errors) {
                    setErrors(data.errors);
                    const firstError = Object.values(data.errors)[0];
                    showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
                } else {
                    showToast(data.message || 'Registration failed. Please try again.', 'error');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Network error. Please check your connection.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'shop_url') {
            let cleaned = value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-');

            setFormData(prev => ({ ...prev, [name]: cleaned }));
            if (errors.shop_url) {
                setErrors(prev => ({ ...prev, shop_url: '' }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleStoreUrlBlur = () => {
        if (formData.shop_url) {
            const validation = validateStoreUrl(formData.shop_url);
            if (validation) {
                setErrors(prev => ({ ...prev, shop_url: validation }));
            } else {
                setErrors(prev => ({ ...prev, shop_url: '' }));
            }
        }
    };

    const selectedRoleData = getSelectedRoleData();
    const requiresFee = selectedRole === 'AGENT';

    if (!isMobile) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: colors.mainBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                
                <div style={{
                    position: 'absolute',
                    top: '-200px',
                    right: '-200px',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.btnBg}08, transparent 70%)`,
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-250px',
                    left: '-250px',
                    width: '700px',
                    height: '700px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${colors.btnBg}05, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                <div style={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: '1100px',
                    minHeight: '600px',
                    maxHeight: '90vh',
                    backgroundColor: colors.raisedBg,
                    borderRadius: '24px',
                    boxShadow: `0 20px 60px ${colors.shadow}`,
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    
                    <div style={{
                        flex: '0 0 45%',
                        padding: '48px 40px',
                        background: `linear-gradient(135deg, ${colors.btnBg}12, ${colors.btnBg}04)`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflowY: 'auto',
                    }}>
                        <div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '32px',
                            }}>
                                <span style={{
                                    fontSize: '32px',
                                    fontWeight: '800',
                                    color: colors.heading,
                                    letterSpacing: '-0.5px',
                                }}>
                                    DataHub
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    backgroundColor: colors.btnBg,
                                    color: colors.btnText,
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    Beta
                                </span>
                            </div>

                            <h1 style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: colors.heading,
                                margin: '0 0 8px 0',
                            }}>
                                Join the DataHub Community
                            </h1>
                            <p style={{
                                fontSize: '14px',
                                color: colors.secondaryText,
                                margin: '0 0 28px 0',
                                lineHeight: '1.6',
                            }}>
                                Choose how you want to participate in a reliable data distribution platform.
                            </p>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                            }}>
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => handleRoleChange(role.id)}
                                        style={{
                                            width: '100%',
                                            padding: '18px 20px',
                                            borderRadius: '16px',
                                            border: `2px solid ${selectedRole === role.id ? role.color : colors.border}`,
                                            backgroundColor: selectedRole === role.id ? role.bg : 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            position: 'relative',
                                        }}
                                    >
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            backgroundColor: selectedRole === role.id ? role.color : colors.border,
                                            color: selectedRole === role.id ? '#fff' : colors.secondaryText,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            transition: 'all 0.3s ease',
                                        }}>
                                            {role.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                color: colors.heading,
                                            }}>
                                                {role.label}
                                            </div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: colors.secondaryText,
                                                marginTop: '2px',
                                            }}>
                                                {role.description}
                                            </div>
                                            {role.fee && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: colors.warning || '#F59E0B',
                                                    marginTop: '2px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}>
                                                    <Coins size={12} />
                                                    {role.feeLabel}
                                                </div>
                                            )}
                                            {!role.fee && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: colors.success || '#10B981',
                                                    marginTop: '2px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}>
                                                    <CheckCircle size={12} />
                                                    {role.feeLabel}
                                                </div>
                                            )}
                                        </div>
                                        {selectedRole === role.id && (
                                            <CheckCircle size={24} style={{ color: role.color, flexShrink: 0 }} />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {selectedRoleData && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    backgroundColor: colors.mainBg,
                                    border: `1px solid ${colors.border}`,
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '8px',
                                    }}>
                                        {selectedRoleData.features.map((feature, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: '13px',
                                                    color: colors.text,
                                                }}
                                            >
                                                <span style={{ color: selectedRoleData.color }}>
                                                    {feature.icon}
                                                </span>
                                                {feature.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{
                            marginTop: '24px',
                            fontSize: '14px',
                            color: colors.secondaryText,
                        }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{
                                color: colors.btnBg,
                                fontWeight: '600',
                                textDecoration: 'none',
                            }}>
                                Sign in
                            </Link>
                        </div>
                    </div>

                    
                    <div style={{
                        flex: 1,
                        padding: '48px 40px',
                        overflowY: 'auto',
                    }}>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: colors.heading,
                            margin: '0 0 4px 0',
                        }}>
                            Create Account
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: colors.secondaryText,
                            margin: '0 0 24px 0',
                        }}>
                            Fill in your details to get started
                        </p>

                        {requiresFee && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: '10px',
                                backgroundColor: colors.warningBg || '#FEF3C7',
                                border: `1px solid ${colors.warning || '#F59E0B'}`,
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                            }}>
                                <Coins size={18} style={{ color: colors.warning || '#F59E0B' }} />
                                <div>
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: colors.warning || '#F59E0B',
                                    }}>
                                        Registration Fee Required
                                    </span>
                                    <span style={{
                                        fontSize: '12px',
                                        color: colors.text,
                                        display: 'block',
                                    }}>
                                        Agents pay a one-time fee to activate their account.
                                    </span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleSubmitDirect(); }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                            }}>
                                <div>
                                    <label style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: colors.text,
                                        display: 'block',
                                        marginBottom: '4px',
                                    }}>
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleInputChange}
                                        placeholder="John"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.first_name ? colors.error : colors.border}`,
                                            backgroundColor: colors.raisedBg,
                                            color: colors.text,
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                    {errors.first_name && (
                                        <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                            {errors.first_name}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: colors.text,
                                        display: 'block',
                                        marginBottom: '4px',
                                    }}>
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleInputChange}
                                        placeholder="Doe"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.last_name ? colors.error : colors.border}`,
                                            backgroundColor: colors.raisedBg,
                                            color: colors.text,
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                    {errors.last_name && (
                                        <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                            {errors.last_name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Username
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: colors.secondaryText,
                                    }} />
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        placeholder="johndoe"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px 10px 40px',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.username ? colors.error : colors.border}`,
                                            backgroundColor: colors.raisedBg,
                                            color: colors.text,
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                {errors.username && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.username}
                                    </span>
                                )}
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Email Address
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: colors.secondaryText,
                                    }} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="john@example.com"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px 10px 40px',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.email ? colors.error : colors.border}`,
                                            backgroundColor: colors.raisedBg,
                                            color: colors.text,
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                {errors.email && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.email}
                                    </span>
                                )}
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Phone Number
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
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleInputChange}
                                        placeholder="0244123456"
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px 10px 40px',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.phone_number ? colors.error : colors.border}`,
                                            backgroundColor: colors.raisedBg,
                                            color: colors.text,
                                            fontSize: '14px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                {errors.phone_number && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.phone_number}
                                    </span>
                                )}
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '12px',
                                marginTop: '12px',
                            }}>
                                <div>
                                    <label style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: colors.text,
                                        display: 'block',
                                        marginBottom: '4px',
                                    }}>
                                        Password
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{
                                            position: 'absolute',
                                            left: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: colors.secondaryText,
                                        }} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="********"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px 10px 40px',
                                                borderRadius: '10px',
                                                border: `1.5px solid ${errors.password ? colors.error : colors.border}`,
                                                backgroundColor: colors.raisedBg,
                                                color: colors.text,
                                                fontSize: '14px',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: colors.secondaryText,
                                                padding: '4px',
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                            {errors.password}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: colors.text,
                                        display: 'block',
                                        marginBottom: '4px',
                                    }}>
                                        Confirm Password
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{
                                            position: 'absolute',
                                            left: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: colors.secondaryText,
                                        }} />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="password_confirm"
                                            value={formData.password_confirm}
                                            onChange={handleInputChange}
                                            placeholder="********"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px 10px 40px',
                                                borderRadius: '10px',
                                                border: `1.5px solid ${errors.password_confirm ? colors.error : colors.border}`,
                                                backgroundColor: colors.raisedBg,
                                                color: colors.text,
                                                fontSize: '14px',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: colors.secondaryText,
                                                padding: '4px',
                                            }}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.password_confirm && (
                                        <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                            {errors.password_confirm}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {selectedRole === 'AGENT' && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '20px',
                                    borderRadius: '14px',
                                    backgroundColor: colors.mainBg,
                                    border: `1px solid ${colors.border}`,
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        marginBottom: '16px',
                                    }}>
                                        <Building2 size={20} style={{ color: colors.btnBg }} />
                                        <span style={{
                                            fontWeight: '600',
                                            fontSize: '15px',
                                            color: colors.heading,
                                        }}>
                                            Store Details
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: colors.text,
                                            display: 'block',
                                            marginBottom: '4px',
                                        }}>
                                            Shop Name <span style={{ color: colors.error }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="shop_name"
                                            value={formData.shop_name}
                                            onChange={handleInputChange}
                                            placeholder="e.g., John's Tech Store"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                border: `1.5px solid ${errors.shop_name ? colors.error : colors.border}`,
                                                backgroundColor: colors.raisedBg,
                                                color: colors.text,
                                                fontSize: '14px',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                        {errors.shop_name && (
                                            <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                                {errors.shop_name}
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
                                            Shop Description
                                        </label>
                                        <input
                                            type="text"
                                            name="shop_description"
                                            value={formData.shop_description}
                                            onChange={handleInputChange}
                                            placeholder="Tell customers about your store"
                                            style={{
                                                width: '100%',
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                border: `1.5px solid ${colors.border}`,
                                                backgroundColor: colors.raisedBg,
                                                color: colors.text,
                                                fontSize: '14px',
                                                outline: 'none',
                                                transition: 'all 0.2s',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            color: colors.text,
                                            display: 'block',
                                            marginBottom: '4px',
                                        }}>
                                            Store URL <span style={{ color: colors.error }}>*</span>
                                        </label>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: colors.raisedBg,
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.shop_url ? colors.error : colors.border}`,
                                            transition: 'all 0.2s',
                                            overflow: 'hidden',
                                            padding: '0 12px',
                                        }}>
                                            <span style={{
                                                fontSize: '13px',
                                                color: colors.secondaryText,
                                                whiteSpace: 'nowrap',
                                                opacity: 0.7,
                                                padding: '10px 0',
                                            }}>
                                                https://
                                            </span>
                                            <input
                                                type="text"
                                                name="shop_url"
                                                value={formData.shop_url}
                                                onChange={handleInputChange}
                                                onBlur={handleStoreUrlBlur}
                                                placeholder="datahub"
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 4px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: colors.text,
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    minWidth: '60px',
                                                }}
                                            />
                                            <span style={{
                                                fontSize: '13px',
                                                color: colors.secondaryText,
                                                whiteSpace: 'nowrap',
                                                opacity: 0.7,
                                                padding: '10px 0',
                                            }}>
                                                .{STOREFRONT_DOMAIN}
                                            </span>
                                        </div>
                                        {errors.shop_url ? (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginTop: '4px',
                                                fontSize: '12px',
                                                color: colors.error,
                                            }}>
                                                <AlertCircle size={14} />
                                                {errors.shop_url}
                                            </div>
                                        ) : (
                                            <div style={{
                                                fontSize: '12px',
                                                color: colors.secondaryText,
                                                marginTop: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}>
                                                <Globe size={14} />
                                                Only lowercase letters, numbers, and hyphens
                                            </div>
                                        )}
                                        {formData.shop_url && !errors.shop_url && (
                                            <div style={{
                                                fontSize: '12px',
                                                color: colors.success,
                                                marginTop: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}>
                                                <CheckCircle size={14} />
                                                Available: https://{formData.shop_url}.{STOREFRONT_DOMAIN}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || isRedirecting}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: colors.btnBg,
                                    color: colors.btnText,
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    cursor: (isSubmitting || isRedirecting) ? 'not-allowed' : 'pointer',
                                    opacity: (isSubmitting || isRedirecting) ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    marginTop: '20px',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {isSubmitting || isRedirecting ? (
                                    <>
                                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                        {isRedirecting ? 'Redirecting to payment...' : 'Creating Account...'}
                                    </>
                                ) : (
                                    <>
                                        {requiresFee ? 'Register & Pay Fee' : 'Create Account'}
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: colors.mainBg,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
        }}>
            
            {currentStep === 1 && (
                <div style={{
                    flex: 1,
                    padding: '20px 16px 100px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                    }}>
                        <span style={{
                            fontSize: '26px',
                            fontWeight: '800',
                            color: colors.heading,
                            letterSpacing: '-0.5px',
                        }}>
                            DataHub
                        </span>
                        <span style={{
                            fontSize: '10px',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            backgroundColor: colors.btnBg,
                            color: colors.btnText,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}>
                            Beta
                        </span>
                    </div>

                    <h2 style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: colors.heading,
                        margin: '0 0 4px 0',
                    }}>
                        Choose your role
                    </h2>
                    <p style={{
                        fontSize: '14px',
                        color: colors.secondaryText,
                        margin: '0 0 20px 0',
                    }}>
                        Select how you want to use DataHub
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        flex: 1,
                    }}>
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => handleRoleChange(role.id)}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '14px',
                                    border: `2px solid ${selectedRole === role.id ? role.color : colors.border}`,
                                    backgroundColor: selectedRole === role.id ? role.bg : colors.raisedBg,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    position: 'relative',
                                    minHeight: '72px',
                                }}
                            >
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    backgroundColor: selectedRole === role.id ? role.color : colors.border,
                                    color: selectedRole === role.id ? '#fff' : colors.secondaryText,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.3s ease',
                                }}>
                                    {role.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: colors.heading,
                                    }}>
                                        {role.label}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: colors.secondaryText,
                                        marginTop: '2px',
                                        lineHeight: '1.3',
                                    }}>
                                        {role.description}
                                    </div>
                                    {role.fee && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: colors.warning || '#F59E0B',
                                            marginTop: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <Coins size={12} />
                                            {role.feeLabel}
                                        </div>
                                    )}
                                    {!role.fee && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: colors.success || '#10B981',
                                            marginTop: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <CheckCircle size={12} />
                                            {role.feeLabel}
                                        </div>
                                    )}
                                </div>
                                {selectedRole === role.id && (
                                    <CheckCircle size={22} style={{ color: role.color, flexShrink: 0 }} />
                                )}
                            </button>
                        ))}
                    </div>

                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '16px 16px 20px',
                        backgroundColor: colors.raisedBg,
                        borderTop: `1px solid ${colors.border}`,
                        boxShadow: `0 -4px 20px ${colors.shadow}`,
                    }}>
                        <button
                            onClick={handleNextStep}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: selectedRole ? colors.btnBg : colors.border,
                                color: selectedRole ? colors.btnText : colors.secondaryText,
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: selectedRole ? 'pointer' : 'not-allowed',
                                opacity: selectedRole ? 1 : 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                minHeight: '52px',
                            }}
                        >
                            Continue
                            <ArrowRight size={20} />
                        </button>
                        <div style={{
                            marginTop: '12px',
                            fontSize: '14px',
                            color: colors.secondaryText,
                            textAlign: 'center',
                        }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{
                                color: colors.btnBg,
                                fontWeight: '600',
                                textDecoration: 'none',
                            }}>
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            
            {currentStep === 2 && (
                <div style={{
                    flex: 1,
                    padding: '16px 16px 100px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                    }}>
                        <button
                            onClick={handlePrevStep}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: colors.text,
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <ChevronLeft size={26} />
                        </button>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: colors.heading,
                                margin: 0,
                            }}>
                                Personal Information
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: colors.secondaryText,
                                margin: '2px 0 0 0',
                            }}>
                                Step 2 of {selectedRole === 'AGENT' ? '3' : '2'}
                            </p>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                        }}>
                            <div>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    placeholder="John"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${errors.first_name ? colors.error : colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        minHeight: '48px',
                                    }}
                                />
                                {errors.first_name && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.first_name}
                                    </span>
                                )}
                            </div>
                            <div>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    placeholder="Doe"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${errors.last_name ? colors.error : colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        minHeight: '48px',
                                    }}
                                />
                                {errors.last_name && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.last_name}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <label style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: colors.text,
                                display: 'block',
                                marginBottom: '4px',
                            }}>
                                Username
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: colors.secondaryText,
                                }} />
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="johndoe"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 40px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${errors.username ? colors.error : colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        minHeight: '48px',
                                    }}
                                />
                            </div>
                            {errors.username && (
                                <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                    {errors.username}
                                </span>
                            )}
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <label style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: colors.text,
                                display: 'block',
                                marginBottom: '4px',
                            }}>
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: colors.secondaryText,
                                }} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="john@example.com"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 40px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${errors.email ? colors.error : colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        minHeight: '48px',
                                    }}
                                />
                            </div>
                            {errors.email && (
                                <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                    {errors.email}
                                </span>
                            )}
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <label style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: colors.text,
                                display: 'block',
                                marginBottom: '4px',
                            }}>
                                Phone Number
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
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleInputChange}
                                    placeholder="0244123456"
                                    inputMode="numeric"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px 12px 40px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${errors.phone_number ? colors.error : colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        minHeight: '48px',
                                    }}
                                />
                            </div>
                            {errors.phone_number && (
                                <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                    {errors.phone_number}
                                </span>
                            )}
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            marginTop: '10px',
                        }}>
                            <div>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: colors.secondaryText,
                                    }} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="********"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px 12px 40px',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.password ? colors.error : colors.border}`,
                                            backgroundColor: colors.raisedBg,
                                            color: colors.text,
                                            fontSize: '16px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                            minHeight: '48px',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: colors.secondaryText,
                                            padding: '4px',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.password}
                                    </span>
                                )}
                            </div>
                            <div>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Confirm Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: colors.secondaryText,
                                    }} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="password_confirm"
                                        value={formData.password_confirm}
                                        onChange={handleInputChange}
                                        placeholder="********"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px 12px 40px',
                                            borderRadius: '10px',
                                            border: `1.5px solid ${errors.password_confirm ? colors.error : colors.border}`,
                                            backgroundColor: colors.raisedBg,
                                            color: colors.text,
                                            fontSize: '16px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                            minHeight: '48px',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: colors.secondaryText,
                                            padding: '4px',
                                        }}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password_confirm && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.password_confirm}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '16px 16px 20px',
                        backgroundColor: colors.raisedBg,
                        borderTop: `1px solid ${colors.border}`,
                        boxShadow: `0 -4px 20px ${colors.shadow}`,
                    }}>
                        <button
                            onClick={handleNextStep}
                            disabled={isSubmitting || isRedirecting}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: colors.btnBg,
                                color: colors.btnText,
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: (isSubmitting || isRedirecting) ? 'not-allowed' : 'pointer',
                                opacity: (isSubmitting || isRedirecting) ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                minHeight: '52px',
                            }}
                        >
                            {isSubmitting || isRedirecting ? (
                                <>
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                    {isRedirecting ? 'Redirecting...' : 'Creating...'}
                                </>
                            ) : (
                                <>
                                    {selectedRole === 'AGENT' ? 'Continue to Store Details' : 'Create Account'}
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            
            {currentStep === 3 && selectedRole === 'AGENT' && (
                <div style={{
                    flex: 1,
                    padding: '16px 16px 100px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px',
                    }}>
                        <button
                            onClick={handlePrevStep}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: colors.text,
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <ChevronLeft size={26} />
                        </button>
                        <div>
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: colors.heading,
                                margin: 0,
                            }}>
                                Store Details
                            </h2>
                            <p style={{
                                fontSize: '13px',
                                color: colors.secondaryText,
                                margin: '2px 0 0 0',
                            }}>
                                Step 3 of 3
                            </p>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                    }}>
                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            backgroundColor: colors.mainBg,
                            border: `1px solid ${colors.border}`,
                            marginBottom: '16px',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                            }}>
                                <Building2 size={20} style={{ color: colors.btnBg }} />
                                <span style={{
                                    fontWeight: '600',
                                    fontSize: '15px',
                                    color: colors.heading,
                                }}>
                                    Set up your store
                                </span>
                            </div>
                            <p style={{
                                fontSize: '13px',
                                color: colors.secondaryText,
                                margin: '0 0 16px 0',
                            }}>
                                Customize your store to start selling immediately.
                            </p>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Shop Name <span style={{ color: colors.error }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="shop_name"
                                    value={formData.shop_name}
                                    onChange={handleInputChange}
                                    placeholder="e.g., John's Tech Store"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${errors.shop_name ? colors.error : colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        minHeight: '48px',
                                    }}
                                />
                                {errors.shop_name && (
                                    <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px', display: 'block' }}>
                                        {errors.shop_name}
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
                                    Shop Description
                                </label>
                                <input
                                    type="text"
                                    name="shop_description"
                                    value={formData.shop_description}
                                    onChange={handleInputChange}
                                    placeholder="Tell customers about your store"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: `1.5px solid ${colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: '16px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                        minHeight: '48px',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: colors.text,
                                    display: 'block',
                                    marginBottom: '4px',
                                }}>
                                    Store URL <span style={{ color: colors.error }}>*</span>
                                </label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: colors.raisedBg,
                                    borderRadius: '10px',
                                    border: `1.5px solid ${errors.shop_url ? colors.error : colors.border}`,
                                    transition: 'all 0.2s',
                                    overflow: 'hidden',
                                    padding: '0 12px',
                                    minHeight: '48px',
                                }}>
                                    <span style={{
                                        fontSize: '13px',
                                        color: colors.secondaryText,
                                        whiteSpace: 'nowrap',
                                        opacity: 0.7,
                                    }}>
                                        https://
                                    </span>
                                    <input
                                        type="text"
                                        name="shop_url"
                                        value={formData.shop_url}
                                        onChange={handleInputChange}
                                        onBlur={handleStoreUrlBlur}
                                        placeholder="datahub"
                                        style={{
                                            flex: 1,
                                            padding: '12px 4px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: colors.text,
                                            fontSize: '16px',
                                            outline: 'none',
                                            minWidth: '50px',
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '13px',
                                        color: colors.secondaryText,
                                        whiteSpace: 'nowrap',
                                        opacity: 0.7,
                                    }}>
                                        .{STOREFRONT_DOMAIN}
                                    </span>
                                </div>
                                {errors.shop_url ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        color: colors.error,
                                    }}>
                                        <AlertCircle size={14} />
                                        {errors.shop_url}
                                    </div>
                                ) : (
                                    <div style={{
                                        fontSize: '12px',
                                        color: colors.secondaryText,
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        <Globe size={14} />
                                        Only lowercase letters, numbers, and hyphens
                                    </div>
                                )}
                                {formData.shop_url && !errors.shop_url && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: colors.success,
                                        marginTop: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        <CheckCircle size={14} />
                                        Available: https://{formData.shop_url}.{STOREFRONT_DOMAIN}
                                    </div>
                                )}
                            </div>
                        </div>

                        
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            backgroundColor: colors.warningBg || '#FEF3C7',
                            border: `1px solid ${colors.warning || '#F59E0B'}`,
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                color: colors.warning || '#F59E0B',
                            }}>
                                <Coins size={16} />
                                <span>
                                    Agent registration requires a one-time fee of <strong>₵{selectedRoleData?.fee}</strong>
                                </span>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: colors.secondaryText,
                                marginTop: '4px',
                                paddingLeft: '28px',
                            }}>
                                You'll be redirected to payment after creating your account.
                            </div>
                        </div>
                    </div>

                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '16px 16px 20px',
                        backgroundColor: colors.raisedBg,
                        borderTop: `1px solid ${colors.border}`,
                        boxShadow: `0 -4px 20px ${colors.shadow}`,
                    }}>
                        <button
                            onClick={handleNextStep}
                            disabled={isSubmitting || isRedirecting}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: 'none',
                                backgroundColor: colors.btnBg,
                                color: colors.btnText,
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: (isSubmitting || isRedirecting) ? 'not-allowed' : 'pointer',
                                opacity: (isSubmitting || isRedirecting) ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.3s ease',
                                minHeight: '52px',
                            }}
                        >
                            {isSubmitting || isRedirecting ? (
                                <>
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                    {isRedirecting ? 'Redirecting to payment...' : 'Creating Account...'}
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
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

                @media (max-width: 768px) {
                    * {
                        -webkit-tap-highlight-color: transparent;
                    }
                    input, button, select, textarea {
                        font-size: 16px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Register;

