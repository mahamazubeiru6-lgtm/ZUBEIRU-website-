


import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { STOREFRONT_DOMAIN } from '../../config';
import { UserPlus, Mail, Phone, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Shield, Building2, Sparkles, Crown, BadgeCheck, ArrowLeft, CreditCard, Wallet, Globe } from 'lucide-react';

const SubAgentRegistration = () => {
  const { colors } = useTheme();
  const {
    authFetch,
    login,
    isAuthenticated,
    user,
    refreshUser,
    initiateRegistrationPayment,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [currentStep, setCurrentStep] = useState(1);
  const [registrationData, setRegistrationData] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    shop_name: '',
    shop_description: '',
    shop_url: '',
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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      const registrationUserId = localStorage.getItem('registration_user_id');
      navigate('/activate-registration', {
        replace: true,
        state: { userId: registrationUserId },
      });
    }
  }, [navigate]);

  useEffect(() => {
    const detectAgentFromSubdomain = async () => {
      try {
        setIsVerifying(true);

        const hostname = window.location.hostname;
        let storeUrl = null;

        const isSubdomain = hostname !== 'localhost' &&
          hostname !== '127.0.0.1' &&
          hostname.split('.').length > 2;

        if (isSubdomain) {
          const parts = hostname.split('.');
          const subdomain = parts[0];
          if (subdomain !== 'www' && subdomain !== 'datastore') {
            storeUrl = subdomain;
          }
        }

        const paramAgent = searchParams.get('agent');
        if (paramAgent) {
          storeUrl = paramAgent;
        }

        if (!storeUrl) {
          showToast('Invalid registration link. Please contact your agent.', 'error');
          navigate('/');
          return;
        }

        const response = await authFetch(`/accounts/agent-by-store/?store_url=${storeUrl}`);
        const data = await response.json();

        if (response.ok && data.status === 'success' && data.exists) {
          const agentData = data.data.agent;
          if (agentData.role !== 'AGENT') {
            showToast('Invalid agent. Please contact your agent.', 'error');
            navigate('/');
            return;
          }
          setAgentInfo({
            id: agentData.id,
            username: agentData.username,
            email: agentData.email,
            shop_name: data.data.profile?.shop_name || `${agentData.username}'s Shop`,
            store_url: data.data.profile?.store_url || storeUrl,
          });
        } else {
          showToast(data.message || 'Agent not found. Please check your registration link.', 'error');
          navigate('/');
        }
      } catch (error) {
        console.error('Error detecting agent:', error);
        showToast('Network error. Please try again.', 'error');
      } finally {
        setIsVerifying(false);
      }
    };

    detectAgentFromSubdomain();
  }, [searchParams, authFetch, navigate, showToast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'shop_url') {
      let cleaned = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');

      setFormData(prev => ({ ...prev, [name]: cleaned }));
      if (formErrors.shop_url) {
        setFormErrors(prev => ({ ...prev, shop_url: '' }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
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

  const handleStoreUrlBlur = () => {
    if (formData.shop_url) {
      const validation = validateStoreUrl(formData.shop_url);
      if (validation) {
        setFormErrors(prev => ({ ...prev, shop_url: validation }));
      } else {
        setFormErrors(prev => ({ ...prev, shop_url: '' }));
      }
    }
  };

  const validateStep = () => {
    const errors = {};

    if (currentStep === 1) {
      if (!isAuthenticated) {
        if (!formData.username) errors.username = 'Username is required';
        if (formData.username && formData.username.length < 3) {
          errors.username = 'Username must be at least 3 characters';
        }
        if (!formData.email) errors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.email) {
          errors.email = 'Enter a valid email address';
        }
        if (!formData.phone_number) errors.phone_number = 'Phone number is required';
        if (!/^[0-9]{10}$/.test(formData.phone_number.replace(/\D/g, '')) && formData.phone_number) {
          errors.phone_number = 'Enter a valid 10-digit phone number';
        }
        if (!formData.first_name) errors.first_name = 'First name is required';
        if (!formData.last_name) errors.last_name = 'Last name is required';
        if (!formData.password) errors.password = 'Password is required';
        if (formData.password && formData.password.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.password_confirm) {
          errors.password_confirm = 'Passwords do not match';
        }
      }
    }

    if (currentStep === 2) {
      if (!formData.shop_name) errors.shop_name = 'Shop name is required';
      if (formData.shop_name && formData.shop_name.length < 3) {
        errors.shop_name = 'Shop name must be at least 3 characters';
      }
      const urlValidation = validateStoreUrl(formData.shop_url);
      if (urlValidation) {
        errors.shop_url = urlValidation;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    try {
      let payload;

      if (isAuthenticated) {
        payload = {
          shop_name: formData.shop_name,
          shop_description: formData.shop_description,
          shop_url: formData.shop_url,
        };
      } else {
        payload = {
          username: formData.username,
          email: formData.email,
          phone_number: formData.phone_number,
          password: formData.password,
          password_confirm: formData.password_confirm,
          first_name: formData.first_name,
          last_name: formData.last_name,
          shop_name: formData.shop_name,
          shop_description: formData.shop_description,
          shop_url: formData.shop_url,
        };
      }

      const response = await authFetch(`/accounts/agents/${agentInfo.id}/become-sub-agent/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 201 && data.status === 'success') {
        setRegistrationData(data.data);
        const registrationUserId = data.data.user_id || data.data.user?.id;

        if (registrationUserId) {
          localStorage.setItem('registration_user_id', registrationUserId);
          localStorage.setItem('registration_dashboard_url', '/subagent/dashboard');
        }

        if (!isAuthenticated && data.data.tokens) {
          login(data.data.user, data.data.tokens.access, data.data.tokens.refresh);
        }

        if (data.data.registration?.requires_fee) {
          setIsPaymentModalOpen(true);
          showToast(`Registration requires a fee of ₵${data.data.registration.fee_amount}. Please pay to activate your account.`, 'info');
        } else {
          showToast(data.message || 'Successfully registered as sub-agent!', 'success');
          if (isAuthenticated) {
            await refreshUser();
            navigate('/subagent/dashboard');
          } else if (data.data.tokens) {
            navigate('/subagent/dashboard');
          } else {
            navigate('/login');
          }
        }
      } else {
        if (data.errors) {
          setFormErrors(data.errors);
          const firstError = Object.values(data.errors)[0];
          showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
        } else {
          showToast(data.message || 'Registration failed. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiatePayment = async () => {
    setPaymentProcessing(true);
    try {
      if (registrationData?.registration?.authorization_url) {
        const registrationUserId = registrationData.user_id || registrationData.user?.id;
        if (registrationUserId) localStorage.setItem('registration_user_id', registrationUserId);
        localStorage.setItem('registration_dashboard_url', '/subagent/dashboard');
        window.location.href = registrationData.registration.authorization_url;
        return;
      }

      const registrationUserId = registrationData?.user_id || registrationData?.user?.id;
      const result = await initiateRegistrationPayment(
        isAuthenticated ? {} : { userId: registrationUserId }
      );

      if (result.ok && result.data?.authorization_url) {
        window.location.href = result.data.authorization_url;
      } else if (result.ok && (result.data?.already_paid || result.data?.zero_fee)) {
        navigate('/activate-registration', { state: { userId: registrationUserId } });
      } else {
        showToast(result.error || 'Failed to initiate payment. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleSkipPayment = () => {
    setIsPaymentModalOpen(false);
    navigate('/');
    showToast('You can pay the registration fee later from your dashboard.', 'info');
  };

  if (isVerifying) {
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
          Verifying registration link...
        </span>
      </div>
    );
  }

  if (!agentInfo) {
    return null;
  }

  return (
    <div style={{
      maxWidth: '560px',
      margin: '0 auto',
      padding: isMobile ? '16px 16px 24px' : '24px 16px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: colors.secondaryText,
          cursor: 'pointer',
          padding: '8px 0',
          fontSize: '13px',
          transition: 'color 0.2s',
          width: 'fit-content',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = colors.heading}
        onMouseLeave={(e) => e.currentTarget.style.color = colors.secondaryText}
      >
        <ArrowLeft size={18} />
        Back to Home
      </button>

      
      <div style={{
        textAlign: 'center',
        marginBottom: isMobile ? '24px' : '32px',
        marginTop: isMobile ? '8px' : '16px',
      }}>
        <div style={{
          width: isMobile ? '56px' : '72px',
          height: isMobile ? '56px' : '72px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.btnBg}25, ${colors.btnBg}10)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          color: colors.btnBg,
          border: `2px solid ${colors.btnBg}20`,
        }}>
          <UserPlus size={isMobile ? 28 : 36} />
        </div>
        <h1 style={{
          fontSize: isMobile ? 'clamp(22px, 6vw, 28px)' : 'clamp(24px, 3vw, 32px)',
          fontWeight: '800',
          color: colors.heading,
          margin: '0 0 4px 0',
          letterSpacing: '-0.5px',
        }}>
          Become a Sub-Agent
        </h1>
        <p style={{
          color: colors.secondaryText,
          margin: 0,
          fontSize: isMobile ? '13px' : '14px',
        }}>
          Join <strong style={{ color: colors.heading }}>{agentInfo.shop_name}</strong> and start earning
        </p>
      </div>

      
      <div style={{
        backgroundColor: colors.raisedBg,
        borderRadius: isMobile ? '12px' : '14px',
        padding: isMobile ? '14px 16px' : '16px 20px',
        border: `1px solid ${colors.border}`,
        marginBottom: isMobile ? '20px' : '24px',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '10px' : '14px',
        boxShadow: `0 4px 16px ${colors.shadow}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.btnBg}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          width: isMobile ? '44px' : '48px',
          height: isMobile ? '44px' : '48px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.btnBg}, ${colors.btnBg}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: isMobile ? '16px' : '20px',
          fontWeight: '700',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${colors.btnBg}44`,
        }}>
          {agentInfo.shop_name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: '600',
            color: colors.heading,
            fontSize: isMobile ? '14px' : '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {agentInfo.shop_name}
            <BadgeCheck size={isMobile ? 14 : 16} color={colors.success} />
          </div>
          <div style={{
            fontSize: isMobile ? '11px' : '12px',
            color: colors.secondaryText,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <Crown size={isMobile ? 12 : 14} color={colors.warning} />
            Agent: {agentInfo.username}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: isMobile ? '9px' : '10px',
          padding: isMobile ? '2px 10px' : '3px 12px',
          borderRadius: '20px',
          backgroundColor: `${colors.success}15`,
          color: colors.success,
          fontWeight: '600',
          flexShrink: 0,
        }}>
          <Shield size={isMobile ? 10 : 12} />
          Verified
        </div>
      </div>

      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? '6px' : '10px',
        marginBottom: isMobile ? '20px' : '24px',
      }}>
        {[1, 2].map((step) => (
          <div key={step} style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px' : '10px',
          }}>
            <div style={{
              width: isMobile ? '32px' : '36px',
              height: isMobile ? '32px' : '36px',
              borderRadius: '50%',
              background: currentStep >= step ? colors.btnBg : colors.border,
              color: currentStep >= step ? colors.btnText : colors.secondaryText,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: '700',
              transition: 'all 0.3s ease',
            }}>
              {currentStep > step ? <CheckCircle size={isMobile ? 16 : 18} /> : step}
            </div>
            <span style={{
              fontSize: isMobile ? '10px' : '12px',
              color: currentStep >= step ? colors.heading : colors.secondaryText,
              fontWeight: currentStep >= step ? '600' : '400',
              display: isMobile ? 'none' : 'inline',
            }}>
              {step === 1 ? 'Account' : 'Shop'}
            </span>
            {step < 2 && (
              <div style={{
                width: isMobile ? '20px' : '30px',
                height: '2px',
                background: currentStep > step ? colors.btnBg : colors.border,
                borderRadius: '1px',
              }} />
            )}
          </div>
        ))}
      </div>

      
      <form onSubmit={handleSubmit} style={{ flex: 1 }}>

        
        {currentStep === 1 && (
          <div style={{
            animation: 'fadeIn 0.3s ease',
          }}>
            {isAuthenticated && (
              <div style={{
                backgroundColor: colors.mainBg,
                borderRadius: isMobile ? '10px' : '12px',
                padding: isMobile ? '12px 14px' : '14px 18px',
                marginBottom: isMobile ? '16px' : '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '8px' : '12px',
                }}>
                  <div style={{
                    width: isMobile ? '36px' : '40px',
                    height: isMobile ? '36px' : '40px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors.btnBg}, ${colors.btnBg}88)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}>
                    {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '600',
                      color: colors.heading,
                      fontSize: isMobile ? '13px' : '14px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {user?.first_name || user?.username} {user?.last_name || ''}
                    </div>
                    <div style={{
                      fontSize: isMobile ? '10px' : '12px',
                      color: colors.secondaryText,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {user?.email} • {user?.phone_number}
                    </div>
                  </div>
                  <CheckCircle size={isMobile ? 18 : 20} style={{ color: '#10B981', flexShrink: 0 }} />
                </div>
                <div style={{
                  fontSize: isMobile ? '11px' : '12px',
                  color: colors.secondaryText,
                  marginTop: isMobile ? '8px' : '10px',
                  paddingTop: isMobile ? '8px' : '10px',
                  borderTop: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <Sparkles size={isMobile ? 14 : 16} color={colors.warning} />
                  You're logged in. Complete your shop details in the next step.
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? '10px' : '12px',
                  marginBottom: isMobile ? '10px' : '12px',
                }}>
                  <div>
                    <label style={{
                      fontSize: isMobile ? '12px' : '13px',
                      fontWeight: '600',
                      color: colors.text,
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="John"
                      style={{
                        width: '100%',
                        padding: isMobile ? '8px 12px' : '10px 14px',
                        borderRadius: isMobile ? '8px' : '10px',
                        border: `1.5px solid ${formErrors.first_name ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: isMobile ? '13px' : '14px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.target.style.borderColor = formErrors.first_name ? colors.error : colors.btnBg}
                      onBlur={(e) => e.target.style.borderColor = formErrors.first_name ? colors.error : colors.border}
                    />
                    {formErrors.first_name && (
                      <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} /> {formErrors.first_name}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{
                      fontSize: isMobile ? '12px' : '13px',
                      fontWeight: '600',
                      color: colors.text,
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      style={{
                        width: '100%',
                        padding: isMobile ? '8px 12px' : '10px 14px',
                        borderRadius: isMobile ? '8px' : '10px',
                        border: `1.5px solid ${formErrors.last_name ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: isMobile ? '13px' : '14px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.target.style.borderColor = formErrors.last_name ? colors.error : colors.btnBg}
                      onBlur={(e) => e.target.style.borderColor = formErrors.last_name ? colors.error : colors.border}
                    />
                    {formErrors.last_name && (
                      <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} /> {formErrors.last_name}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: isMobile ? '10px' : '12px' }}>
                  <label style={{
                    fontSize: isMobile ? '12px' : '13px',
                    fontWeight: '600',
                    color: colors.text,
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Username *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={isMobile ? 16 : 18} style={{
                      position: 'absolute',
                      left: isMobile ? '10px' : '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: colors.secondaryText,
                    }} />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="subagent_username"
                      style={{
                        width: '100%',
                        padding: isMobile ? '8px 10px 8px 34px' : '10px 14px 10px 40px',
                        borderRadius: isMobile ? '8px' : '10px',
                        border: `1.5px solid ${formErrors.username ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: isMobile ? '13px' : '14px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.target.style.borderColor = formErrors.username ? colors.error : colors.btnBg}
                      onBlur={(e) => e.target.style.borderColor = formErrors.username ? colors.error : colors.border}
                    />
                  </div>
                  {formErrors.username && (
                    <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> {formErrors.username}
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: isMobile ? '10px' : '12px' }}>
                  <label style={{
                    fontSize: isMobile ? '12px' : '13px',
                    fontWeight: '600',
                    color: colors.text,
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Email Address *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={isMobile ? 16 : 18} style={{
                      position: 'absolute',
                      left: isMobile ? '10px' : '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: colors.secondaryText,
                    }} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="subagent@example.com"
                      style={{
                        width: '100%',
                        padding: isMobile ? '8px 10px 8px 34px' : '10px 14px 10px 40px',
                        borderRadius: isMobile ? '8px' : '10px',
                        border: `1.5px solid ${formErrors.email ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: isMobile ? '13px' : '14px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.target.style.borderColor = formErrors.email ? colors.error : colors.btnBg}
                      onBlur={(e) => e.target.style.borderColor = formErrors.email ? colors.error : colors.border}
                    />
                  </div>
                  {formErrors.email && (
                    <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> {formErrors.email}
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: isMobile ? '10px' : '12px' }}>
                  <label style={{
                    fontSize: isMobile ? '12px' : '13px',
                    fontWeight: '600',
                    color: colors.text,
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Phone Number *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={isMobile ? 16 : 18} style={{
                      position: 'absolute',
                      left: isMobile ? '10px' : '12px',
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
                        padding: isMobile ? '8px 10px 8px 34px' : '10px 14px 10px 40px',
                        borderRadius: isMobile ? '8px' : '10px',
                        border: `1.5px solid ${formErrors.phone_number ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: isMobile ? '13px' : '14px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.target.style.borderColor = formErrors.phone_number ? colors.error : colors.btnBg}
                      onBlur={(e) => e.target.style.borderColor = formErrors.phone_number ? colors.error : colors.border}
                    />
                  </div>
                  {formErrors.phone_number && (
                    <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} /> {formErrors.phone_number}
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: isMobile ? '10px' : '12px',
                  marginBottom: isMobile ? '10px' : '12px',
                }}>
                  <div>
                    <label style={{
                      fontSize: isMobile ? '12px' : '13px',
                      fontWeight: '600',
                      color: colors.text,
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={isMobile ? 16 : 18} style={{
                        position: 'absolute',
                        left: isMobile ? '10px' : '12px',
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
                          padding: isMobile ? '8px 10px 8px 34px' : '10px 14px 10px 40px',
                          borderRadius: isMobile ? '8px' : '10px',
                          border: `1.5px solid ${formErrors.password ? colors.error : colors.border}`,
                          backgroundColor: colors.raisedBg,
                          color: colors.text,
                          fontSize: isMobile ? '13px' : '14px',
                          outline: 'none',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => e.target.style.borderColor = formErrors.password ? colors.error : colors.btnBg}
                        onBlur={(e) => e.target.style.borderColor = formErrors.password ? colors.error : colors.border}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: isMobile ? '8px' : '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.secondaryText,
                          padding: '4px',
                        }}
                      >
                        {showPassword ? <EyeOff size={isMobile ? 16 : 18} /> : <Eye size={isMobile ? 16 : 18} />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} /> {formErrors.password}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{
                      fontSize: isMobile ? '12px' : '13px',
                      fontWeight: '600',
                      color: colors.text,
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      Confirm Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={isMobile ? 16 : 18} style={{
                        position: 'absolute',
                        left: isMobile ? '10px' : '12px',
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
                          padding: isMobile ? '8px 10px 8px 34px' : '10px 14px 10px 40px',
                          borderRadius: isMobile ? '8px' : '10px',
                          border: `1.5px solid ${formErrors.password_confirm ? colors.error : colors.border}`,
                          backgroundColor: colors.raisedBg,
                          color: colors.text,
                          fontSize: isMobile ? '13px' : '14px',
                          outline: 'none',
                          transition: 'all 0.2s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => e.target.style.borderColor = formErrors.password_confirm ? colors.error : colors.btnBg}
                        onBlur={(e) => e.target.style.borderColor = formErrors.password_confirm ? colors.error : colors.border}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: isMobile ? '8px' : '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.secondaryText,
                          padding: '4px',
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={isMobile ? 16 : 18} /> : <Eye size={isMobile ? 16 : 18} />}
                      </button>
                    </div>
                    {formErrors.password_confirm && (
                      <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} /> {formErrors.password_confirm}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        
        {currentStep === 2 && (
          <div style={{
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{
              padding: isMobile ? '14px 14px' : '16px 18px',
              backgroundColor: colors.mainBg,
              borderRadius: isMobile ? '10px' : '12px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: isMobile ? '10px' : '14px',
              }}>
                <Building2 size={isMobile ? 16 : 18} style={{ color: colors.btnBg }} />
                <span style={{
                  fontWeight: '600',
                  fontSize: isMobile ? '13px' : '14px',
                  color: colors.heading,
                }}>
                  Shop Details
                </span>
                <span style={{
                  fontSize: isMobile ? '8px' : '9px',
                  padding: isMobile ? '1px 8px' : '2px 10px',
                  borderRadius: '12px',
                  backgroundColor: colors.error,
                  color: '#fff',
                  fontWeight: '600',
                  marginLeft: 'auto',
                }}>
                  Required
                </span>
              </div>

              <div style={{ marginBottom: isMobile ? '10px' : '12px' }}>
                <label style={{
                  fontSize: isMobile ? '12px' : '13px',
                  fontWeight: '600',
                  color: colors.text,
                  display: 'block',
                  marginBottom: '4px',
                }}>
                  Shop Name *
                </label>
                <input
                  type="text"
                  name="shop_name"
                  value={formData.shop_name}
                  onChange={handleInputChange}
                  placeholder="My Data Shop"
                  style={{
                    width: '100%',
                    padding: isMobile ? '8px 12px' : '10px 14px',
                    borderRadius: isMobile ? '8px' : '10px',
                    border: `1.5px solid ${formErrors.shop_name ? colors.error : colors.border}`,
                    backgroundColor: colors.raisedBg,
                    color: colors.text,
                    fontSize: isMobile ? '13px' : '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => e.target.style.borderColor = formErrors.shop_name ? colors.error : colors.btnBg}
                  onBlur={(e) => e.target.style.borderColor = formErrors.shop_name ? colors.error : colors.border}
                />
                {formErrors.shop_name && (
                  <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} /> {formErrors.shop_name}
                  </span>
                )}
                <div style={{
                  fontSize: isMobile ? '10px' : '11px',
                  color: colors.secondaryText,
                  marginTop: '4px',
                }}>
                  This will be displayed to your customers
                </div>
              </div>

              <div style={{ marginBottom: isMobile ? '10px' : '12px' }}>
                <label style={{
                  fontSize: isMobile ? '12px' : '13px',
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
                    padding: isMobile ? '8px 12px' : '10px 14px',
                    borderRadius: isMobile ? '8px' : '10px',
                    border: `1.5px solid ${colors.border}`,
                    backgroundColor: colors.raisedBg,
                    color: colors.text,
                    fontSize: isMobile ? '13px' : '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{
                  fontSize: isMobile ? '12px' : '13px',
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
                  borderRadius: isMobile ? '8px' : '10px',
                  border: `1.5px solid ${formErrors.shop_url ? colors.error : colors.border}`,
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                  padding: '0 12px',
                  minHeight: isMobile ? '44px' : '48px',
                }}>
                  <span style={{
                    fontSize: isMobile ? '11px' : '12px',
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
                    placeholder="myshop"
                    style={{
                      flex: 1,
                      padding: isMobile ? '8px 4px' : '10px 4px',
                      border: 'none',
                      background: 'transparent',
                      color: colors.text,
                      fontSize: isMobile ? '13px' : '14px',
                      outline: 'none',
                      minWidth: '50px',
                    }}
                  />
                  <span style={{
                    fontSize: isMobile ? '11px' : '12px',
                    color: colors.secondaryText,
                    whiteSpace: 'nowrap',
                    opacity: 0.7,
                  }}>
                    .{STOREFRONT_DOMAIN}
                  </span>
                </div>
                {formErrors.shop_url ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                    fontSize: '11px',
                    color: colors.error,
                  }}>
                    <AlertCircle size={14} />
                    {formErrors.shop_url}
                  </div>
                ) : (
                  <div style={{
                    fontSize: isMobile ? '10px' : '11px',
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
                {formData.shop_url && !formErrors.shop_url && (
                  <div style={{
                    fontSize: isMobile ? '10px' : '11px',
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
              marginTop: isMobile ? '12px' : '16px',
              padding: isMobile ? '10px 12px' : '12px 16px',
              borderRadius: '8px',
              backgroundColor: colors.warningBg || '#FEF3C7',
              border: `1px solid ${colors.warning || '#F59E0B'}`,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: isMobile ? '12px' : '13px',
                color: colors.warning || '#F59E0B',
              }}>
                <Wallet size={isMobile ? 16 : 18} />
                <span>
                  Sub-Agent registration requires a one-time fee of <strong>₵25.00</strong>
                </span>
              </div>
              <div style={{
                fontSize: isMobile ? '10px' : '11px',
                color: colors.secondaryText,
                marginTop: '4px',
                paddingLeft: isMobile ? '28px' : '32px',
              }}>
                You'll be prompted to pay after creating your account.
              </div>
            </div>

            
            <div style={{
              marginTop: isMobile ? '12px' : '16px',
              padding: isMobile ? '12px 14px' : '14px 18px',
              backgroundColor: `${colors.success}08`,
              borderRadius: isMobile ? '10px' : '12px',
              border: `1px solid ${colors.success}20`,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: isMobile ? '6px' : '8px',
              }}>
                <Sparkles size={isMobile ? 14 : 16} color={colors.warning} />
                <span style={{
                  fontWeight: '600',
                  fontSize: isMobile ? '12px' : '13px',
                  color: colors.heading,
                }}>
                  What you get as a Sub-Agent
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '4px' : '6px',
                fontSize: isMobile ? '11px' : '12px',
                color: colors.secondaryText,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={isMobile ? 12 : 14} color={colors.success} />
                  Set your own selling prices
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={isMobile ? 12 : 14} color={colors.success} />
                  Earn commission on sales
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={isMobile ? 12 : 14} color={colors.success} />
                  Access to all data packages
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={isMobile ? 12 : 14} color={colors.success} />
                  Real-time sales tracking
                </div>
              </div>
            </div>
          </div>
        )}

        
        <div style={{
          display: 'flex',
          gap: isMobile ? '8px' : '12px',
          marginTop: isMobile ? '20px' : '24px',
        }}>
          {currentStep === 2 && (
            <button
              type="button"
              onClick={handlePrevStep}
              style={{
                flex: 1,
                padding: isMobile ? '10px' : '12px',
                borderRadius: isMobile ? '8px' : '10px',
                border: `1.5px solid ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.text,
                cursor: 'pointer',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Back
            </button>
          )}

          {currentStep === 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              style={{
                flex: 2,
                padding: isMobile ? '10px' : '12px',
                borderRadius: isMobile ? '8px' : '10px',
                border: 'none',
                backgroundColor: colors.btnBg,
                color: colors.btnText,
                cursor: 'pointer',
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Continue
              <ArrowRight size={isMobile ? 16 : 18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: isMobile ? '10px' : '12px',
                borderRadius: isMobile ? '8px' : '10px',
                border: 'none',
                backgroundColor: colors.btnBg,
                color: colors.btnText,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner-small" style={{
                    width: '18px',
                    height: '18px',
                    border: `2px solid ${colors.btnText}40`,
                    borderTop: `2px solid ${colors.btnText}`,
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Registering...
                </>
              ) : (
                <>
                  Register as Sub-Agent
                  <ArrowRight size={isMobile ? 16 : 18} />
                </>
              )}
            </button>
          )}
        </div>

        <div style={{
          marginTop: isMobile ? '14px' : '16px',
          fontSize: isMobile ? '11px' : '12px',
          color: colors.secondaryText,
          textAlign: 'center',
        }}>
          By registering, you agree to our Terms of Service and Privacy Policy.
        </div>
      </form>

      
      {isPaymentModalOpen && registrationData?.registration?.requires_fee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
            }
          }}
        >
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '20px',
            maxWidth: '440px',
            width: '100%',
            padding: isMobile ? '24px 20px' : '32px 28px',
            boxShadow: `0 24px 64px ${colors.shadow}`,
            animation: 'slideUp 0.3s ease',
            textAlign: 'center',
          }}>
            <div style={{
              width: isMobile ? '64px' : '72px',
              height: isMobile ? '64px' : '72px',
              borderRadius: '50%',
              backgroundColor: `${colors.warningBg || '#FEF3C7'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: colors.warning || '#F59E0B',
            }}>
              <CreditCard size={isMobile ? 30 : 36} />
            </div>

            <h2 style={{
              fontSize: isMobile ? '20px' : '22px',
              fontWeight: '700',
              color: colors.heading,
              margin: '0 0 6px 0',
            }}>
              Registration Fee Required
            </h2>
            <p style={{
              fontSize: isMobile ? '13px' : '14px',
              color: colors.secondaryText,
              margin: '0 0 4px 0',
              lineHeight: '1.6',
            }}>
              To activate your <strong>Sub-Agent</strong> account, you need to pay a one-time registration fee.
            </p>

            <div style={{
              margin: isMobile ? '16px 0' : '20px 0',
              padding: isMobile ? '14px' : '16px',
              backgroundColor: colors.mainBg,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                fontSize: isMobile ? '12px' : '13px',
                color: colors.secondaryText,
              }}>
                Registration Fee
              </div>
              <div style={{
                fontSize: isMobile ? '28px' : '32px',
                fontWeight: '800',
                color: colors.heading,
              }}>
                ₵{registrationData.registration.fee_amount}
              </div>
              <div style={{
                fontSize: isMobile ? '11px' : '12px',
                color: colors.secondaryText,
                marginTop: '4px',
              }}>
                One-time payment • Secure via Paystack
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <button
                onClick={handleInitiatePayment}
                disabled={paymentProcessing}
                style={{
                  width: '100%',
                  padding: isMobile ? '12px' : '14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: colors.btnBg,
                  color: colors.btnText,
                  fontSize: isMobile ? '15px' : '16px',
                  fontWeight: '600',
                  cursor: paymentProcessing ? 'not-allowed' : 'pointer',
                  opacity: paymentProcessing ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {paymentProcessing ? (
                  <>
                    <div className="spinner" style={{
                      width: '20px',
                      height: '20px',
                      border: `2px solid ${colors.btnText}40`,
                      borderTop: `2px solid ${colors.btnText}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }} />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={isMobile ? 18 : 20} />
                    Pay Now
                  </>
                )}
              </button>

              <button
                onClick={handleSkipPayment}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px' : '12px',
                  borderRadius: '12px',
                  border: `1.5px solid ${colors.border}`,
                  backgroundColor: 'transparent',
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: isMobile ? '13px' : '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                I'll pay later
              </button>
            </div>

            <div style={{
              marginTop: isMobile ? '12px' : '16px',
              fontSize: isMobile ? '11px' : '12px',
              color: colors.secondaryText,
            }}>
              Your account will be activated immediately after payment.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
      `}</style>
    </div>
  );
};

export default SubAgentRegistration;

