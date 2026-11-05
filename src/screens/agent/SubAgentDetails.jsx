


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { ArrowLeft, Mail, Phone, Calendar, Store, CheckCircle, AlertCircle, Clock, Package, Edit2, Save, X, RefreshCw, Search, Info } from 'lucide-react';

const transformPackage = (pkg, fallback = false) => ({
  id: pkg.id,
  network: pkg.network,
  size: `${pkg.size_gb}GB`,
  basePriceCustomer: parseFloat(pkg.base_price_customer || 0),
  basePriceAgent: parseFloat(pkg.base_price_agent || 0),
  agentSubBasePrice: pkg.agent_sub_base_price ? parseFloat(pkg.agent_sub_base_price) : null,
  agentSubCustomPrice: pkg.agent_sub_custom_price ? parseFloat(pkg.agent_sub_custom_price) : null,
  subAgentCustomerPrice: pkg.sub_agent_customer_price ? parseFloat(pkg.sub_agent_customer_price) : null,
  effectivePrice: parseFloat(pkg.effective_price || pkg.base_price_agent || 0),
  priceSource: pkg.price_source || 'base',
  hasCustomPrice: fallback ? pkg.price_source === 'agent_sub_custom' : pkg.has_custom_price || false,
  isActive: pkg.is_active,
  pricingId: pkg.pricing_id || null,
});

const SubAgentDetails = () => {
  const { subAgentId } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [subAgent, setSubAgent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [packages, setPackages] = useState([]);
  const [editingPackage, setEditingPackage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [editingType, setEditingType] = useState('custom');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('ALL');

  useEffect(() => {
    fetchSubAgentData();
  }, [subAgentId]);

  const fetchSubAgentData = async () => {
    try {
      setLoading(true);
      setOrders([]);
      setOrderSummary(null);
      setPackages([]);
      const [userResponse, summaryResponse, ordersResponse, pricingResponse] =
        await Promise.all([
          authFetch(`/accounts/users/${subAgentId}/`),
          authFetch(`/data/orders/summary/?sub_agent=${subAgentId}`),
          authFetch(`/data/orders/?sub_agent=${subAgentId}&page_size=10`),
          authFetch(`/data/sub-agent-pricing/?sub_agent_id=${subAgentId}`),
        ]);
      const [userData, summaryData, ordersData, pricingData] = await Promise.all([
        userResponse.json(),
        summaryResponse.json(),
        ordersResponse.json(),
        pricingResponse.json(),
      ]);

      if (!userResponse.ok || userData.status !== 'success') {
        showToast(userData.message || 'Failed to fetch sub-agent details', 'error');
        navigate('/agent/subagents');
        return;
      }
      setSubAgent(userData.data);

      if (summaryResponse.ok && summaryData.status === 'success') {
        setOrderSummary(summaryData.data);
      }

      if (ordersResponse.ok && ordersData.status === 'success') {
        setOrders(ordersData.data || []);
      }

      if (pricingResponse.ok && pricingData.status === 'success') {
        setPackages((pricingData.data.packages || []).map((pkg) => transformPackage(pkg)));
      } else {
        const fallbackResponse = await authFetch(`/data/packages/?user_id=${subAgentId}`);
        const fallbackData = await fallbackResponse.json();
        if (fallbackResponse.ok && fallbackData.status === 'success') {
          setPackages((fallbackData.data || []).map((pkg) => transformPackage(pkg, true)));
        }
      }

    } catch (error) {
      console.error('Error fetching sub-agent data:', error);
      showToast('Failed to load sub-agent data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrice = (pkg, type) => {
    setEditingPackage(pkg);
    setEditingType(type);
    if (type === 'custom') {
      setNewPrice(String(pkg.agentSubCustomPrice || pkg.effectivePrice || pkg.agentSubBasePrice || pkg.basePriceAgent));
    } else {
      setNewPrice(String(pkg.agentSubBasePrice || pkg.basePriceAgent));
    }
    setShowEditModal(true);
  };

  const handleSavePrice = async () => {
    if (!newPrice || isNaN(newPrice) || Number(newPrice) <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    const minimumPrice = editingPackage.agentSubBasePrice || editingPackage.basePriceAgent;
    if (Number(newPrice) < minimumPrice) {
      showToast(`Price cannot be below the agent base price (₵${minimumPrice.toFixed(2)})`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let priceType;
      if (editingType === 'custom') {
        priceType = 'AGENT_SUB_CUSTOM_PRICE';
      } else {
        priceType = 'AGENT_SUB_BASE_PRICE';
      }

      if (editingType === 'custom' && editingPackage.pricingId) {
        const response = await authFetch(`/data/pricing/${editingPackage.pricingId}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            price: newPrice,
            notes: `Updated custom price for ${editingPackage.network} ${editingPackage.size}`,
          }),
        });

        const data = await response.json();
        if (response.ok && data.status === 'success') {
          showToast('Custom price updated successfully', 'success');
          const price = Number(newPrice);
          setPackages((current) => current.map((pkg) => (
            pkg.id === editingPackage.id
              ? {
                  ...pkg,
                  agentSubCustomPrice: price,
                  effectivePrice: price,
                  priceSource: 'agent_sub_custom',
                  hasCustomPrice: true,
                  pricingId: data.data?.id || pkg.pricingId,
                }
              : pkg
          )));
          setShowEditModal(false);
          setEditingPackage(null);
          setNewPrice('');
        } else {
          showToast(data.message || 'Failed to update price', 'error');
        }
      } else {
        const response = await authFetch('/data/pricing/create/', {
          method: 'POST',
          body: JSON.stringify({
            package: editingPackage.id,
            user: subAgentId,
            price_type: priceType,
            price: newPrice,
            notes: `${editingType === 'custom' ? 'Custom' : 'Base'} price for ${editingPackage.network} ${editingPackage.size}`,
          }),
        });

        const data = await response.json();

        if (response.status === 201 && data.status === 'success') {
          showToast(`${editingType === 'custom' ? 'Custom' : 'Base'} price set successfully`, 'success');
          const price = Number(newPrice);
          setPackages((current) => current.map((pkg) => (
            pkg.id === editingPackage.id
              ? {
                  ...pkg,
                  agentSubCustomPrice: price,
                  effectivePrice: price,
                  priceSource: 'agent_sub_custom',
                  hasCustomPrice: true,
                  pricingId: data.data?.id || null,
                }
              : pkg
          )));
          setShowEditModal(false);
          setEditingPackage(null);
          setNewPrice('');
        } else {
          if (data.errors) {
            const firstError = Object.values(data.errors)[0];
            showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
          } else {
            showToast(data.message || 'Failed to set price', 'error');
          }
        }
      }
    } catch (error) {
      console.error('Error saving price:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCustomPrice = async (pkg) => {
    if (!pkg.pricingId) {
      showToast('No custom price to remove', 'error');
      return;
    }

    if (!window.confirm(`Remove custom price for ${pkg.network} ${pkg.size}? This will revert to the agent's base price.`)) {
      return;
    }

    try {
      const response = await authFetch(`/data/pricing/${pkg.pricingId}/`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        showToast('Custom price removed successfully', 'success');
        setPackages((current) => current.map((item) => (
          item.id === pkg.id
            ? {
                ...item,
                agentSubCustomPrice: null,
                effectivePrice: item.agentSubBasePrice || item.basePriceAgent,
                priceSource: item.agentSubBasePrice ? 'agent_base' : 'base',
                hasCustomPrice: false,
                pricingId: null,
              }
            : item
        )));
      } else {
        showToast(data.message || 'Failed to remove custom price', 'error');
      }
    } catch (error) {
      console.error('Error removing custom price:', error);
      showToast('Network error. Please try again.', 'error');
    }
  };

  const getPriceSourceBadge = (source) => {
    const badges = {
      'admin_custom': { label: 'Admin Special', color: '#3B82F6', bg: '#3B82F620' },
      'agent_custom': { label: 'Agent Custom', color: '#10B981', bg: '#10B98120' },
      'agent_sub_custom': { label: 'Agent-Sub Custom', color: '#F59E0B', bg: '#F59E0B20' },
      'sub_agent_custom': { label: 'Sub-Agent Price', color: '#8B5CF6', bg: '#8B5CF620' },
      'agent_base': { label: 'Agent Base', color: '#F97316', bg: '#F9731620' },
      'base': { label: 'Base Price', color: '#6B7280', bg: '#6B728020' },
    };
    return badges[source] || badges['base'];
  };

  const getNetworkColor = (network) => {
    const colors = {
      'MTN': '#FFD700',
      'Telecel': '#FF0000',
      'AirtelTigo': '#1A73E8',
    };
    return colors[network] || colors.btnBg;
  };

  const getNetworkBgColor = (network) => {
    const colors = {
      'MTN': '#FFFDE7',
      'Telecel': '#FFEBEE',
      'AirtelTigo': '#E8F0FE',
    };
    return colors[network] || '#F3F4F6';
  };

  const getStatusColor = (status) => {
    const colors = {
      'COMPLETED': '#10B981',
      'PROCESSING': '#3B82F6',
      'PENDING': '#F59E0B',
      'FAILED': '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'COMPLETED': <CheckCircle size={14} />,
      'PROCESSING': <RefreshCw size={14} />,
      'PENDING': <Clock size={14} />,
      'FAILED': <AlertCircle size={14} />,
    };
    return icons[status] || null;
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

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.network.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.size.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNetwork = selectedNetwork === 'ALL' || pkg.network === selectedNetwork;
    return matchesSearch && matchesNetwork && pkg.isActive;
  });

  const networks = ['ALL', 'MTN', 'Telecel', 'AirtelTigo'];

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

  if (!subAgent) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: colors.secondaryText,
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: colors.heading }}>
          Sub-Agent not found
        </h3>
        <p style={{ margin: '0 0 20px 0' }}>The sub-agent you're looking for doesn't exist</p>
        <button
          onClick={() => navigate('/agent/subagents')}
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
          Back to Sub-Agents
        </button>
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
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => navigate('/agent/subagents')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: colors.secondaryText,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.hoverBg;
            e.currentTarget.style.color = colors.heading;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = colors.secondaryText;
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: '700',
            color: colors.heading,
            margin: '0 0 4px 0',
          }}>
            Sub-Agent Details
          </h1>
          <p style={{
            color: colors.secondaryText,
            margin: 0,
            fontSize: '14px',
          }}>
            Manage sub-agent profile and pricing
          </p>
        </div>
        <button
          onClick={fetchSubAgentData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.raisedBg,
            color: colors.text,
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.2s',
            marginLeft: 'auto',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
          onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      
      <div style={{
        backgroundColor: colors.raisedBg,
        borderRadius: '16px',
        border: `1px solid ${colors.border}`,
        padding: '24px',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '20px',
        alignItems: 'center',
        '@media (max-width: 768px)': {
          gridTemplateColumns: '1fr',
          textAlign: 'center',
        },
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: `${colors.btnBg}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.btnBg,
            fontSize: '32px',
            fontWeight: '700',
          }}>
            {(subAgent.first_name?.[0] || subAgent.username?.[0] || 'S').toUpperCase()}
          </div>
          <span style={{
            fontSize: '12px',
            padding: '2px 12px',
            borderRadius: '12px',
            backgroundColor: subAgent.is_active ? '#10B98120' : '#EF444420',
            color: subAgent.is_active ? '#10B981' : '#EF4444',
            fontWeight: '600',
            textTransform: 'uppercase',
          }}>
            {subAgent.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            '@media (max-width: 768px)': {
              justifyContent: 'center',
            },
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.heading,
              margin: 0,
            }}>
              {subAgent.first_name || subAgent.username}
              {subAgent.last_name && ` ${subAgent.last_name}`}
            </h2>
            <span style={{
              fontSize: '12px',
              padding: '2px 12px',
              borderRadius: '12px',
              backgroundColor: '#8B5CF620',
              color: '#8B5CF6',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              Sub-Agent
            </span>
          </div>
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '8px',
            flexWrap: 'wrap',
            '@media (max-width: 768px)': {
              justifyContent: 'center',
            },
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: colors.text }}>
              <Mail size={16} style={{ color: colors.secondaryText }} />
              {subAgent.email}
            </div>
            {subAgent.phone_number && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: colors.text }}>
                <Phone size={16} style={{ color: colors.secondaryText }} />
                {subAgent.phone_number}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: colors.secondaryText }}>
              <Calendar size={16} />
              Joined {formatDate(subAgent.date_joined)}
            </div>
            {subAgent.agent_profile?.parent_agent_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: colors.secondaryText }}>
                <Store size={16} />
                Parent: {subAgent.agent_profile.parent_agent_name}
              </div>
            )}
          </div>
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
          <div style={{ fontSize: '12px', color: colors.secondaryText }}>Wallet Balance</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: colors.btnBg }}>
            ₵{subAgent.wallet?.balance || '0.00'}
          </div>
        </div>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          padding: '14px 16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '12px', color: colors.secondaryText }}>Total Orders</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#3B82F6' }}>
            {orderSummary?.total_orders || 0}
          </div>
        </div>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          padding: '14px 16px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: '12px', color: colors.secondaryText }}>Total Revenue</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: colors.btnBg }}>
            ₵{orderSummary?.total_revenue || '0.00'}
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
            ₵{orderSummary?.total_profit || '0.00'}
          </div>
        </div>
      </div>

      
      {orders.length > 0 && (
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          padding: '16px 20px',
          marginBottom: '28px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.heading,
            margin: '0 0 12px 0',
          }}>
            Recent Orders
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.5fr 1fr 0.8fr',
              padding: '8px 0',
              borderBottom: `1px solid ${colors.border}`,
              fontSize: '12px',
              fontWeight: '600',
              color: colors.secondaryText,
              textTransform: 'uppercase',
              minWidth: '400px',
            }}>
              <span>Order ID</span>
              <span>Package</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr 1fr 0.8fr',
                  padding: '10px 0',
                  borderBottom: `1px solid ${colors.border}`,
                  alignItems: 'center',
                  fontSize: '14px',
                  minWidth: '400px',
                }}
              >
                <span style={{ fontWeight: '500', color: colors.heading, fontSize: '13px' }}>
                  {order.id?.slice(0, 8) || 'N/A'}
                </span>
                <span style={{ color: colors.text }}>
                  {order.package?.network || order.package_name || 'N/A'} {order.package?.size_gb || order.package_size || ''}GB
                </span>
                <span style={{ fontWeight: '600', color: colors.btnBg }}>
                  ₵{order.customer_price || '0.00'}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: getStatusColor(order.status),
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}>
                  {getStatusIcon(order.status)}
                  {order.status?.toLowerCase() || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      
      <div style={{
        marginBottom: '32px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <Package size={22} style={{ color: colors.btnBg }} />
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: colors.heading,
              margin: 0,
            }}>
              Packages & Pricing
            </h2>
            <span style={{
              fontSize: '12px',
              color: colors.secondaryText,
              background: colors.border,
              padding: '2px 10px',
              borderRadius: '12px',
            }}>
              {packages.length} packages
            </span>
          </div>
        </div>

        
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            flex: 1,
            position: 'relative',
            minWidth: '180px',
          }}>
            <Search
              size={16}
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
              placeholder="Search packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: `1.5px solid ${colors.border}`,
                backgroundColor: colors.raisedBg,
                color: colors.text,
                fontSize: '13px',
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
          </div>

          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            backgroundColor: colors.raisedBg,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
          }}>
            {networks.map((network) => (
              <button
                key={network}
                onClick={() => setSelectedNetwork(network)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: selectedNetwork === network ? colors.btnBg : 'transparent',
                  color: selectedNetwork === network ? colors.btnText : colors.secondaryText,
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: selectedNetwork === network ? '600' : '500',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {network.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '12px',
        }}>
          {filteredPackages.map((pkg) => {
            const badge = getPriceSourceBadge(pkg.priceSource);
            const hasCustomPrice = pkg.hasCustomPrice || pkg.agentSubCustomPrice !== null;

            return (
              <div
                key={pkg.id}
                style={{
                  backgroundColor: getNetworkBgColor(pkg.network),
                  borderRadius: '12px',
                  padding: '16px 18px',
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 16px ${colors.shadow}`;
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
                }}>
                  <div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: getNetworkColor(pkg.network),
                      textTransform: 'uppercase',
                    }}>
                      {pkg.network}
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: colors.heading,
                    }}>
                      {pkg.size}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Info size={10} />
                    {badge.label}
                  </span>
                </div>

                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  paddingTop: '8px',
                  borderTop: `1px solid ${colors.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: '9px', color: colors.secondaryText, textTransform: 'uppercase' }}>
                      Admin Base
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: colors.text }}>
                      ₵{pkg.basePriceAgent}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: colors.secondaryText, textTransform: 'uppercase' }}>
                      Agent Base (for Sub)
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: pkg.agentSubBasePrice ? '#8B5CF6' : colors.secondaryText,
                    }}>
                      {pkg.agentSubBasePrice ? `₵${pkg.agentSubBasePrice}` : 'Not Set'}
                    </div>
                  </div>
                </div>

                
                <div style={{
                  padding: '8px 10px',
                  backgroundColor: hasCustomPrice ? `${colors.btnBg}08` : 'transparent',
                  borderRadius: '6px',
                  border: hasCustomPrice ? `1px solid ${colors.btnBg}30` : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '9px', color: colors.secondaryText, textTransform: 'uppercase' }}>
                      {hasCustomPrice ? 'Custom Price (You Set)' : 'Custom Price'}
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: hasCustomPrice ? colors.btnBg : colors.secondaryText,
                    }}>
                      {hasCustomPrice ? `₵${pkg.agentSubCustomPrice}` : '— Uses Base'}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                  }}>
                    {hasCustomPrice && (
                      <button
                        onClick={() => handleRemoveCustomPrice(pkg)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: `1px solid #EF4444`,
                          backgroundColor: 'transparent',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#EF4444';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#EF4444';
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditPrice(pkg, 'custom')}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${hasCustomPrice ? colors.btnBg : colors.border}`,
                        backgroundColor: 'transparent',
                        color: hasCustomPrice ? colors.btnBg : colors.secondaryText,
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (hasCustomPrice) {
                          e.currentTarget.style.background = colors.btnBg;
                          e.currentTarget.style.color = colors.btnText;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (hasCustomPrice) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = colors.btnBg;
                        }
                      }}
                    >
                      <Edit2 size={12} />
                      {hasCustomPrice ? 'Edit' : 'Set Custom'}
                    </button>
                  </div>
                </div>

                
                {pkg.subAgentCustomerPrice && (
                  <div style={{
                    padding: '4px 10px',
                    backgroundColor: '#8B5CF608',
                    borderRadius: '4px',
                    border: `1px dashed #8B5CF630`,
                    fontSize: '12px',
                    color: '#8B5CF6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>Sub-Agent's Own Price</span>
                    <span style={{ fontWeight: '600' }}>₵{pkg.subAgentCustomerPrice}</span>
                  </div>
                )}

                
                <button
                  onClick={() => navigate('/agent/dashboard')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: `1px solid #8B5CF6`,
                    backgroundColor: 'transparent',
                    color: '#8B5CF6',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                    marginTop: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#8B5CF6';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#8B5CF6';
                  }}
                >
                  <Edit2 size={14} />
                  Manage Global Base
                </button>
              </div>
            );
          })}
        </div>

        {filteredPackages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '30px 20px',
            color: colors.secondaryText,
          }}>
            No packages found matching your criteria
          </div>
        )}
      </div>

      
      {showEditModal && editingPackage && (
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
              setShowEditModal(false);
              setEditingPackage(null);
              setNewPrice('');
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
              }}>
                {editingType === 'custom' ? 'Edit Sub-Agent Custom Price' : 'Edit Sub-Agent Base Price'}
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPackage(null);
                  setNewPrice('');
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

            <div style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: getNetworkColor(editingPackage.network),
                  textTransform: 'uppercase',
                }}>
                  {editingPackage.network}
                </span>
                <span style={{ color: colors.secondaryText }}>•</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: colors.heading }}>
                  {editingPackage.size}
                </span>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '13px',
                color: colors.secondaryText,
              }}>
                <span>Current {editingType === 'custom' ? 'Custom Price' : 'Base Price'}: <strong style={{ color: editingType === 'custom' ? colors.btnBg : '#8B5CF6' }}>
                  ₵{editingType === 'custom' ? (editingPackage.agentSubCustomPrice || 'Not Set') : (editingPackage.agentSubBasePrice || editingPackage.basePriceAgent)}
                </strong></span>
                <span>Admin Base: <strong style={{ color: colors.text }}>₵{editingPackage.basePriceAgent}</strong></span>
                {editingType === 'custom' && editingPackage.agentSubBasePrice && (
                  <span>Sub-Agent Base: <strong style={{ color: '#8B5CF6' }}>₵{editingPackage.agentSubBasePrice}</strong></span>
                )}
              </div>
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: colors.mainBg,
                fontSize: '12px',
                color: colors.secondaryText,
              }}>
                <strong>Note:</strong> Price cannot go below the Admin Base (₵{editingPackage.basePriceAgent})
                {editingType === 'custom' && editingPackage.agentSubBasePrice && (
                  <> or the Sub-Agent Base (₵{editingPackage.agentSubBasePrice})</>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.text,
                marginBottom: '6px',
              }}>
                New {editingType === 'custom' ? 'Custom' : 'Base'} Price
              </label>
              <div style={{
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.secondaryText,
                  fontWeight: '600',
                }}>
                  ₵
                </span>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  min={editingPackage.basePriceAgent}
                  step="0.01"
                  placeholder={`Minimum: ₵${editingPackage.basePriceAgent}`}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 32px',
                    borderRadius: '10px',
                    border: `1.5px solid ${colors.border}`,
                    backgroundColor: colors.raisedBg,
                    color: colors.text,
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = colors.btnBg}
                  onBlur={(e) => e.target.style.borderColor = colors.border}
                  autoFocus
                />
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.secondaryText,
                marginTop: '4px',
              }}>
                {editingType === 'custom' ? (
                  <>This overrides the sub-agent's base price for this package</>
                ) : (
                  <>This sets the base price for all sub-agents under you</>
                )}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPackage(null);
                  setNewPrice('');
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
                onClick={handleSavePrice}
                disabled={isSubmitting}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: editingType === 'custom' ? colors.btnBg : '#8B5CF6',
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
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.opacity = '1';
                  }
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Price
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
      `}</style>
    </div>
  );
};

export default SubAgentDetails;

