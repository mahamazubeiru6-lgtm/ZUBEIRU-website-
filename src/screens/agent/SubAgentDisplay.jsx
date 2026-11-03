import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Users, UserPlus, Search, X, Eye, RefreshCw, CheckCircle, AlertCircle, Mail, Phone, Calendar, User, Store } from 'lucide-react';

const SubAgentDisplay = () => {
  const { colors } = useTheme();
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subAgents, setSubAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExistingUserForm, setShowExistingUserForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    shop_name: '',
    shop_description: '',
  });

  const [existingUserForm, setExistingUserForm] = useState({
    user_id: '',
    shop_name: '',
    shop_description: '',
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchSubAgents();
  }, []);

  const fetchSubAgents = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`/accounts/agents/${user.id}/sub-agents/`);
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setSubAgents(data.data?.sub_agents || []);
      } else {
        showToast(data.message || 'Failed to fetch sub agents', 'error');
      }
    } catch (error) {
      console.error('Error fetching sub agents:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubAgent = async (e) => {
    e.preventDefault();
    
    const isNewUser = !showExistingUserForm;
    const errors = {};
    
    if (isNewUser) {
      if (!newUserForm.username) errors.username = 'Username is required';
      if (!newUserForm.email) errors.email = 'Email is required';
      if (!newUserForm.phone_number) errors.phone_number = 'Phone number is required';
      if (!newUserForm.password) errors.password = 'Password is required';
      if (newUserForm.password !== newUserForm.password_confirm) {
        errors.password_confirm = 'Passwords do not match';
      }
      if (!newUserForm.shop_name) errors.shop_name = 'Shop name is required';
    } else {
      if (!existingUserForm.user_id) errors.user_id = 'User ID is required';
      if (!existingUserForm.shop_name) errors.shop_name = 'Shop name is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      let payload;
      if (isNewUser) {
        payload = {
          username: newUserForm.username,
          email: newUserForm.email,
          phone_number: newUserForm.phone_number,
          password: newUserForm.password,
          password_confirm: newUserForm.password_confirm,
          first_name: newUserForm.first_name,
          last_name: newUserForm.last_name,
          shop_name: newUserForm.shop_name,
          shop_description: newUserForm.shop_description,
        };
      } else {
        payload = {
          user_id: existingUserForm.user_id,
          shop_name: existingUserForm.shop_name,
          shop_description: existingUserForm.shop_description,
        };
      }

      const response = await authFetch(`/accounts/agents/${user.id}/become-sub-agent/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 201 && data.status === 'success') {
        showToast(data.message || 'Sub-agent added successfully', 'success');
        setShowAddModal(false);
        resetForms();
        fetchSubAgents();
      } else {
        if (data.errors) {
          setFormErrors(data.errors);
          const firstError = Object.values(data.errors)[0];
          showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
        } else {
          showToast(data.message || 'Failed to add sub-agent', 'error');
        }
      }
    } catch (error) {
      console.error('Error adding sub-agent:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setNewUserForm({
      username: '',
      email: '',
      phone_number: '',
      password: '',
      password_confirm: '',
      first_name: '',
      last_name: '',
      shop_name: '',
      shop_description: '',
    });
    setExistingUserForm({
      user_id: '',
      shop_name: '',
      shop_description: '',
    });
    setFormErrors({});
    setShowExistingUserForm(false);
  };

  const handleViewSubAgent = (subAgentId) => {
    navigate(`/agent/subagents/${subAgentId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (isActive) => {
    return isActive ? '#10B981' : '#EF4444';
  };

  const filteredSubAgents = subAgents.filter(agent => {
    const query = searchQuery.toLowerCase();
    return (
      agent.username?.toLowerCase().includes(query) ||
      agent.email?.toLowerCase().includes(query) ||
      agent.first_name?.toLowerCase().includes(query) ||
      agent.last_name?.toLowerCase().includes(query) ||
      agent.shop_name?.toLowerCase().includes(query) ||
      agent.phone_number?.includes(query)
    );
  });

  if (loading) {
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
            Sub Agents
          </h1>
          <p style={{
            color: colors.secondaryText,
            margin: 0,
            fontSize: '14px',
          }}>
            Manage your sub-agents and their performance
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <button
            onClick={fetchSubAgents}
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
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => {
              resetForms();
              setShowAddModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: colors.btnBg,
              color: colors.btnText,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 24px ${colors.shadow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <UserPlus size={18} />
            Add Sub Agent
          </button>
        </div>
      </div>

      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          padding: '14px 16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '12px', color: colors.secondaryText }}>Total Sub Agents</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: colors.heading }}>
            {subAgents.length}
          </div>
        </div>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          padding: '14px 16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '12px', color: colors.secondaryText }}>Active</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#10B981' }}>
            {subAgents.filter(a => a.is_active).length}
          </div>
        </div>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          padding: '14px 16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '12px', color: colors.secondaryText }}>Total Sales</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: colors.btnBg }}>
            ₵{subAgents.reduce((sum, a) => sum + (a.total_revenue || a.sales || 0), 0).toLocaleString()}
          </div>
        </div>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          padding: '14px 16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '12px', color: colors.secondaryText }}>Total Profit</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#10B981' }}>
            ₵{subAgents.reduce((sum, a) => sum + (a.profit || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        alignItems: 'center',
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
            placeholder="Search sub-agents..."
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
      </div>

      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {filteredSubAgents.map((agent) => (
          <div
            key={agent.id || agent.user_id}
            style={{
              backgroundColor: colors.raisedBg,
              borderRadius: '12px',
              padding: '18px',
              border: `1px solid ${agent.is_active ? colors.border : '#EF444440'}`,
              transition: 'all 0.3s ease',
              opacity: agent.is_active ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = `0 6px 20px ${colors.shadow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '10px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: `${colors.btnBg}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.btnBg,
                  fontSize: '16px',
                  fontWeight: '700',
                }}>
                  {(agent.first_name?.[0] || agent.username?.[0] || 'S').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: colors.heading, fontSize: '14px' }}>
                    {agent.first_name || agent.username}
                    {agent.last_name && ` ${agent.last_name}`}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.secondaryText }}>
                    @{agent.username}
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '600',
                color: getStatusColor(agent.is_active),
                padding: '2px 10px',
                borderRadius: '12px',
                backgroundColor: `${getStatusColor(agent.is_active)}20`,
              }}>
                {agent.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {agent.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '13px', color: colors.text }}>
                <Store size={14} style={{ display: 'inline', marginRight: '6px', color: colors.secondaryText }} />
                {agent.shop_name || 'N/A'}
              </div>
              <div style={{ fontSize: '13px', color: colors.text }}>
                <Mail size={14} style={{ display: 'inline', marginRight: '6px', color: colors.secondaryText }} />
                {agent.email}
              </div>
              {agent.phone_number && (
                <div style={{ fontSize: '13px', color: colors.text }}>
                  <Phone size={14} style={{ display: 'inline', marginRight: '6px', color: colors.secondaryText }} />
                  {agent.phone_number}
                </div>
              )}
              <div style={{ fontSize: '12px', color: colors.secondaryText }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '6px', color: colors.secondaryText }} />
                Joined {formatDate(agent.created_at)}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              paddingTop: '10px',
              borderTop: `1px solid ${colors.border}`,
              marginBottom: '12px',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: colors.secondaryText }}>Orders</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.heading }}>
                  {agent.total_orders || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: colors.secondaryText }}>Revenue</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.btnBg }}>
                  ₵{agent.total_revenue || '0'}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleViewSubAgent(agent.user_id || agent.id)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.secondaryText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '13px',
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
              <Eye size={16} />
              View Details
            </button>
          </div>
        ))}
      </div>

      {filteredSubAgents.length === 0 && (
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
            <Users size={48} />
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.heading,
            margin: '0 0 8px 0',
          }}>
            No sub-agents found
          </h3>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
          }}>
            {searchQuery ? 'Try adjusting your search criteria' : 'Start by adding your first sub-agent'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                resetForms();
                setShowAddModal(true);
              }}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: colors.btnBg,
                color: colors.btnText,
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              <UserPlus size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Add Sub Agent
            </button>
          )}
        </div>
      )}

      
      {showAddModal && (
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
              setShowAddModal(false);
              resetForms();
            }
          }}
        >
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '16px',
            maxWidth: '540px',
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
              marginBottom: '20px',
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.heading,
                margin: 0,
              }}>
                Add Sub Agent
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForms();
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
              gap: '8px',
              marginBottom: '20px',
              padding: '4px',
              backgroundColor: colors.mainBg,
              borderRadius: '10px',
            }}>
              <button
                onClick={() => {
                  setShowExistingUserForm(false);
                  setFormErrors({});
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: !showExistingUserForm ? colors.btnBg : 'transparent',
                  color: !showExistingUserForm ? colors.btnText : colors.secondaryText,
                  cursor: 'pointer',
                  fontWeight: !showExistingUserForm ? '600' : '500',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                <UserPlus size={14} style={{ display: 'inline', marginRight: '6px' }} />
                New User
              </button>
              <button
                onClick={() => {
                  setShowExistingUserForm(true);
                  setFormErrors({});
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: showExistingUserForm ? colors.btnBg : 'transparent',
                  color: showExistingUserForm ? colors.btnText : colors.secondaryText,
                  cursor: 'pointer',
                  fontWeight: showExistingUserForm ? '600' : '500',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                <User size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Existing User
              </button>
            </div>

            <form onSubmit={handleAddSubAgent}>
              {!showExistingUserForm ? (
                <>
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
                        value={newUserForm.first_name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                        placeholder="John"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${colors.border}`,
                          backgroundColor: colors.raisedBg,
                          color: colors.text,
                          fontSize: '14px',
                          outline: 'none',
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
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={newUserForm.last_name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                        placeholder="Doe"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${colors.border}`,
                          backgroundColor: colors.raisedBg,
                          color: colors.text,
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
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
                      Username *
                    </label>
                    <input
                      type="text"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      placeholder="subagent_username"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${formErrors.username ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    {formErrors.username && (
                      <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                        {formErrors.username}
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
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      placeholder="subagent@example.com"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${formErrors.email ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    {formErrors.email && (
                      <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                        {formErrors.email}
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
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={newUserForm.phone_number}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone_number: e.target.value })}
                      placeholder="0244123456"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${formErrors.phone_number ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    {formErrors.phone_number && (
                      <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                        {formErrors.phone_number}
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
                        Password *
                      </label>
                      <input
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        placeholder="********"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${formErrors.password ? colors.error : colors.border}`,
                          backgroundColor: colors.raisedBg,
                          color: colors.text,
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {formErrors.password && (
                        <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                          {formErrors.password}
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
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        value={newUserForm.password_confirm}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password_confirm: e.target.value })}
                        placeholder="********"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: `1.5px solid ${formErrors.password_confirm ? colors.error : colors.border}`,
                          backgroundColor: colors.raisedBg,
                          color: colors.text,
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                      {formErrors.password_confirm && (
                        <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                          {formErrors.password_confirm}
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
                      Shop Name *
                    </label>
                    <input
                      type="text"
                      value={newUserForm.shop_name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, shop_name: e.target.value })}
                      placeholder="My Data Shop"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${formErrors.shop_name ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    {formErrors.shop_name && (
                      <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                        {formErrors.shop_name}
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
                      Shop Description
                    </label>
                    <textarea
                      value={newUserForm.shop_description}
                      onChange={(e) => setNewUserForm({ ...newUserForm, shop_description: e.target.value })}
                      placeholder="Describe your shop..."
                      rows="2"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.text,
                      display: 'block',
                      marginBottom: '4px',
                    }}>
                      User ID *
                    </label>
                    <input
                      type="text"
                      value={existingUserForm.user_id}
                      onChange={(e) => setExistingUserForm({ ...existingUserForm, user_id: e.target.value })}
                      placeholder="550e8400-e29b-41d4-a716-446655440003"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${formErrors.user_id ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    {formErrors.user_id && (
                      <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                        {formErrors.user_id}
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
                      Shop Name *
                    </label>
                    <input
                      type="text"
                      value={existingUserForm.shop_name}
                      onChange={(e) => setExistingUserForm({ ...existingUserForm, shop_name: e.target.value })}
                      placeholder="My Data Shop"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${formErrors.shop_name ? colors.error : colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    {formErrors.shop_name && (
                      <span style={{ fontSize: '12px', color: colors.error, marginTop: '2px' }}>
                        {formErrors.shop_name}
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
                      Shop Description
                    </label>
                    <textarea
                      value={existingUserForm.shop_description}
                      onChange={(e) => setExistingUserForm({ ...existingUserForm, shop_description: e.target.value })}
                      placeholder="Describe your shop..."
                      rows="2"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </>
              )}

              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '20px',
                borderTop: `1px solid ${colors.border}`,
                paddingTop: '20px',
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForms();
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: colors.btnBg,
                    color: colors.btnText,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="spinner-small" style={{
                        width: '16px',
                        height: '16px',
                        border: `2px solid ${colors.btnText}40`,
                        borderTop: `2px solid ${colors.btnText}`,
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Add Sub Agent
                    </>
                  )}
                </button>
              </div>
            </form>
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

export default SubAgentDisplay;

