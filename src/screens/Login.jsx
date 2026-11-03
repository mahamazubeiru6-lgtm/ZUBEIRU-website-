import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, User, LogIn, Shield, Clock, Star } from 'lucide-react';

const Login = () => {
  const { colors } = useTheme();
  const { login, API_BASE_URL } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
    if (!loginIdentifier.trim()) {
      newErrors.loginIdentifier = 'Email, username, or phone number is required';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let payload = { password };
      
      if (loginIdentifier.includes('@')) {
        payload.email = loginIdentifier;
      } else if (/^[+]?[0-9]{10,15}$/.test(loginIdentifier.replace(/\s/g, ''))) {
        let phone = loginIdentifier.replace(/\s/g, '');
        if (!phone.startsWith('+')) {
          phone = phone.startsWith('0') ? `+233${phone.substring(1)}` : `+233${phone}`;
        }
        payload.phone_number = phone;
      } else {
        payload.username = loginIdentifier;
      }

      const response = await fetch(`${API_BASE_URL}/accounts/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (
        response.status === 403 &&
        data.code === 'REGISTRATION_INCOMPLETE' &&
        data.data?.user_id
      ) {
        localStorage.setItem('registration_user_id', data.data.user_id);
        showToast(
          data.message || 'Complete your registration payment to activate your account.',
          'warning'
        );
        navigate('/activate-registration', {
          state: { userId: data.data.user_id },
        });
        return;
      }

      if (response.ok) {
        login(data.data.user, data.data.tokens.access, data.data.tokens.refresh);
        showToast(`Welcome back, ${data.data.user.first_name || data.data.user.username}!`, 'success');
        navigate('/');
      } else {
        if (data.errors) {
          if (data.errors.non_field_errors) {
            showToast(data.errors.non_field_errors[0], 'error');
          } else {
            setErrors(data.errors);
            const firstError = Object.values(data.errors)[0];
            showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
          }
        } else {
          showToast(data.message || 'Login failed. Please try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('Network error. Please check your connection.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  if (!isMobile) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.mainBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        
        <div style={{
          position: 'absolute',
          top: '-150px',
          right: '-150px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.btnBg}12, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.btnBg}08, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: '1000px',
          width: '100%',
          backgroundColor: colors.raisedBg,
          borderRadius: '24px',
          boxShadow: `0 20px 60px ${colors.shadow}`,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          minHeight: '560px',
        }}>
          
          <div style={{
            padding: '48px 36px',
            background: `linear-gradient(135deg, ${colors.btnBg}20, ${colors.btnBg}08)`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '24px',
            }}>
              <span style={{
                fontSize: '36px',
                fontWeight: '800',
                color: colors.heading,
                letterSpacing: '-0.5px',
              }}>
                DataHub
              </span>
              <span style={{
                fontSize: '10px',
                padding: '2px 10px',
                borderRadius: '12px',
                backgroundColor: colors.btnBg,
                color: colors.btnText,
                fontWeight: '600',
                textTransform: 'uppercase',
              }}>
                Beta
              </span>
            </div>

            <h1 style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: '700',
              color: colors.heading,
              margin: '0 0 12px 0',
            }}>
              Welcome Back! 👋
            </h1>
            <p style={{
              fontSize: '15px',
              color: colors.secondaryText,
              margin: '0 0 28px 0',
              lineHeight: '1.7',
            }}>
              Sign in to access your account, track orders, and manage your data packages.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '14px',
                color: colors.text,
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: `${colors.btnBg}08`,
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: `${colors.btnBg}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.btnBg,
                  flexShrink: 0,
                }}>
                  <LogIn size={16} />
                </div>
                <span>Access your personalized dashboard</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '14px',
                color: colors.text,
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: `${colors.btnBg}08`,
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: `${colors.btnBg}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.btnBg,
                  flexShrink: 0,
                }}>
                  <Clock size={16} />
                </div>
                <span>View order history & tracking</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '14px',
                color: colors.text,
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: `${colors.btnBg}08`,
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: `${colors.btnBg}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.btnBg,
                  flexShrink: 0,
                }}>
                  <Shield size={16} />
                </div>
                <span>Secure transactions & data protection</span>
              </div>
            </div>

            <div style={{
              marginTop: '28px',
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: colors.successBg || '#dcfce7',
              border: `1px solid ${colors.success || '#22c55e'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <Star size={18} style={{ color: colors.success || '#22c55e', flexShrink: 0 }} />
              <span style={{
                fontSize: '13px',
                color: colors.success || '#22c55e',
                fontWeight: '500',
              }}>
                Join 10,000+ happy customers on DataHub
              </span>
            </div>
          </div>

          
          <div style={{
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.heading,
                margin: '0 0 6px 0',
              }}>
                Sign In
              </h2>
              <p style={{
                fontSize: '14px',
                color: colors.secondaryText,
                margin: '0 0 28px 0',
              }}>
                Enter your credentials to access your account
              </p>

              
              <button
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: `1.5px solid ${colors.border}`,
                  backgroundColor: colors.raisedBg,
                  color: colors.text,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  marginBottom: '24px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google"
                  style={{ width: '20px', height: '20px' }}
                />
                Continue with Google
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: colors.border,
                }} />
                <span style={{
                  fontSize: '12px',
                  color: colors.secondaryText,
                }}>
                  OR
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: colors.border,
                }} />
              </div>

              <form onSubmit={handleSubmit}>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.text,
                    display: 'block',
                    marginBottom: '6px',
                  }}>
                    Email, Username, or Phone Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: colors.secondaryText,
                    }}>
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => {
                        setLoginIdentifier(e.target.value);
                        if (errors.loginIdentifier) {
                          setErrors({ ...errors, loginIdentifier: '' });
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Email, username, or phone number"
                      style={{
                        width: '100%',
                        padding: '13px 14px 13px 44px',
                        borderRadius: '12px',
                        border: `1.5px solid ${errors.loginIdentifier ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = errors.loginIdentifier ? colors.error : colors.btnBg;
                        e.target.style.boxShadow = `0 0 0 3px ${(errors.loginIdentifier ? colors.error : colors.btnBg)}20`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.loginIdentifier ? colors.error : colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  {errors.loginIdentifier && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      fontSize: '12px',
                      color: colors.error,
                    }}>
                      <AlertCircle size={14} />
                      {errors.loginIdentifier}
                    </div>
                  )}
                </div>

                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.text,
                    display: 'block',
                    marginBottom: '6px',
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: colors.secondaryText,
                    }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors({ ...errors, password: '' });
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        padding: '13px 14px 13px 44px',
                        borderRadius: '12px',
                        border: `1.5px solid ${errors.password ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = errors.password ? colors.error : colors.btnBg;
                        e.target.style.boxShadow = `0 0 0 3px ${(errors.password ? colors.error : colors.btnBg)}20`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.password ? colors.error : colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '14px',
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
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px',
                      fontSize: '12px',
                      color: colors.error,
                    }}>
                      <AlertCircle size={14} />
                      {errors.password}
                    </div>
                  )}
                </div>

                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '24px',
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: colors.secondaryText,
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: colors.btnBg,
                        cursor: 'pointer',
                      }}
                    />
                    Remember me
                  </label>
                  <Link to="/forgot-password" style={{
                    fontSize: '13px',
                    color: colors.btnBg,
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.color = colors.linkColor || colors.btnBg}
                  onMouseLeave={(e) => e.target.style.color = colors.btnBg}
                  >
                    Forgot password?
                  </Link>
                </div>

                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: colors.btnBg,
                    color: colors.btnText,
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px ${colors.shadow}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner" style={{
                        width: '20px',
                        height: '20px',
                        border: `2px solid ${colors.btnText}40`,
                        borderTop: `2px solid ${colors.btnText}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }} />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <div style={{
                  marginTop: '20px',
                  fontSize: '14px',
                  color: colors.secondaryText,
                  textAlign: 'center',
                }}>
                  Don't have an account?{' '}
                  <Link to="/register" style={{
                    color: colors.btnBg,
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.color = colors.linkColor || colors.btnBg}
                  onMouseLeave={(e) => e.target.style.color = colors.btnBg}
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.mainBg,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 20px 30px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${colors.btnBg}10, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
      }}>
        <span style={{
          fontSize: '28px',
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
        }}>
          Beta
        </span>
      </div>

      
      <h1 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: colors.heading,
        margin: '0 0 4px 0',
      }}>
        Welcome Back! 👋
      </h1>
      <p style={{
        fontSize: '14px',
        color: colors.secondaryText,
        margin: '0 0 24px 0',
      }}>
        Sign in to continue your journey
      </p>

      
      <button
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          border: `1.5px solid ${colors.border}`,
          backgroundColor: colors.raisedBg,
          color: colors.text,
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s',
          minHeight: '52px',
          marginBottom: '20px',
        }}
      >
        <img 
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
          alt="Google"
          style={{ width: '20px', height: '20px' }}
        />
        Continue with Google
      </button>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          flex: 1,
          height: '1px',
          backgroundColor: colors.border,
        }} />
        <span style={{
          fontSize: '12px',
          color: colors.secondaryText,
        }}>
          OR
        </span>
        <div style={{
          flex: 1,
          height: '1px',
          backgroundColor: colors.border,
        }} />
      </div>

      <form onSubmit={handleSubmit} style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.text,
            display: 'block',
            marginBottom: '6px',
          }}>
            Email, Username, or Phone Number
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.secondaryText,
            }}>
              <User size={18} />
            </div>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => {
                setLoginIdentifier(e.target.value);
                if (errors.loginIdentifier) {
                  setErrors({ ...errors, loginIdentifier: '' });
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Email, username, or phone number"
              style={{
                width: '100%',
                padding: '14px 14px 14px 44px',
                borderRadius: '12px',
                border: `1.5px solid ${errors.loginIdentifier ? colors.error : colors.border}`,
                backgroundColor: colors.raisedBg,
                color: colors.text,
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                minHeight: '52px',
              }}
              autoFocus
              onFocus={(e) => {
                e.target.style.borderColor = errors.loginIdentifier ? colors.error : colors.btnBg;
                e.target.style.boxShadow = `0 0 0 3px ${(errors.loginIdentifier ? colors.error : colors.btnBg)}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.loginIdentifier ? colors.error : colors.border;
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          {errors.loginIdentifier && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
              fontSize: '12px',
              color: colors.error,
            }}>
              <AlertCircle size={14} />
              {errors.loginIdentifier}
            </div>
          )}
        </div>

        
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.text,
            display: 'block',
            marginBottom: '6px',
          }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.secondaryText,
            }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors({ ...errors, password: '' });
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '14px 14px 14px 44px',
                borderRadius: '12px',
                border: `1.5px solid ${errors.password ? colors.error : colors.border}`,
                backgroundColor: colors.raisedBg,
                color: colors.text,
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                minHeight: '52px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = errors.password ? colors.error : colors.btnBg;
                e.target.style.boxShadow = `0 0 0 3px ${(errors.password ? colors.error : colors.btnBg)}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.password ? colors.error : colors.border;
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '14px',
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
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '4px',
              fontSize: '12px',
              color: colors.error,
            }}>
              <AlertCircle size={14} />
              {errors.password}
            </div>
          )}
        </div>

        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: colors.secondaryText,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.btnBg,
                cursor: 'pointer',
              }}
            />
            Remember me
          </label>
          <Link to="/forgot-password" style={{
            fontSize: '13px',
            color: colors.btnBg,
            fontWeight: '500',
            textDecoration: 'none',
          }}>
            Forgot password?
          </Link>
        </div>

        
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: colors.btnBg,
            color: colors.btnText,
            fontSize: '17px',
            fontWeight: '700',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            minHeight: '56px',
            marginTop: 'auto',
          }}
        >
          {isSubmitting ? (
            <>
              <div className="spinner" style={{
                width: '22px',
                height: '22px',
                border: `2px solid ${colors.btnText}40`,
                borderTop: `2px solid ${colors.btnText}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight size={20} />
            </>
          )}
        </button>

        <div style={{
          marginTop: '16px',
          fontSize: '14px',
          color: colors.secondaryText,
          textAlign: 'center',
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{
            color: colors.btnBg,
            fontWeight: '600',
            textDecoration: 'none',
          }}>
            Sign up
          </Link>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          * {
            -webkit-tap-highlight-color: transparent;
          }
          input, button {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;

