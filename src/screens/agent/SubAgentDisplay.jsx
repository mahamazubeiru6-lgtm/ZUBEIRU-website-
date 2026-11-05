import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Users, UserPlus, Search, X, Eye, RefreshCw, CheckCircle, AlertCircle, Mail, Phone, Calendar, Store } from 'lucide-react';

const SubAgentDisplay = () => {
  const { colors } = useTheme();
  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [subAgents, setSubAgents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCopyRegistrationLink = async () => {
    const storeUrl = user?.agent_profile?.store_url;
    const registrationUrl = new URL('/subagent/register', window.location.origin);
    if (storeUrl) registrationUrl.searchParams.set('agent', storeUrl);

    try {
      await navigator.clipboard.writeText(registrationUrl.toString());
      showToast('Sub-agent registration link copied', 'success');
    } catch {
      window.prompt('Copy this sub-agent registration link:', registrationUrl.toString());
    }
  };

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
            onClick={handleCopyRegistrationLink}
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
            Copy Invite Link
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
              onClick={handleCopyRegistrationLink}
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
              Copy Invite Link
            </button>
          )}
        </div>
      )}

      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SubAgentDisplay;

