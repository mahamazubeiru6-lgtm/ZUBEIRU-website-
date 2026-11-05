import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { ArrowLeft, User, Mail, Phone, Calendar, Wallet, Store, ShoppingBag, CheckCircle, AlertCircle, Clock, Activity, Users, Edit2, RefreshCw, Download, DollarSign, FileText, CreditCard, ArrowUpDown, Plus, X, Save, BarChart3, Truck } from 'lucide-react';

const toPricingOverride = (pricing, packages = []) => {
  const pkg = packages.find((item) => item.id === pricing.package);
  return {
    id: pricing.package,
    network: pricing.package_name || pkg?.network,
    size_gb: pricing.package_size || pkg?.size_gb,
    base_price_agent: pkg?.base_price_agent || pricing.base_price_agent || 0,
    admin_custom_price: pricing.price,
    has_custom: true,
    pricing_id: pricing.id,
    price: pricing.price,
    notes: pricing.notes || '',
    price_type: pricing.price_type,
    created_at: pricing.created_at,
    updated_at: pricing.updated_at,
  };
};

const AdminUserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [subAgents, setSubAgents] = useState([]);
  const [pricingOverrides, setPricingOverrides] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [chartData, setChartData] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('revenue');

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceNotes, setPriceNotes] = useState('');

  const [showAddPricingModal, setShowAddPricingModal] = useState(false);
  const [selectedPackageForPricing, setSelectedPackageForPricing] = useState(null);
  const [customPriceValue, setCustomPriceValue] = useState('');
  const [customPriceNotes, setCustomPriceNotes] = useState('');
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  useEffect(() => {
    if (allPackages.length === 0) return;
    setPricingOverrides((current) => current.map((pricing) => ({
      ...pricing,
      base_price_agent: allPackages.find((pkg) => pkg.id === pricing.id)?.base_price_agent
        || pricing.base_price_agent,
    })));
  }, [allPackages]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setAnimating(false);
      setTransactions([]);
      setOrders([]);
      setTransactionCount(0);
      setOrderCount(0);
      setChartData(null);
      setSubAgents([]);
      setPricingOverrides([]);
      setAllPackages([]);

      const [userResponse, txResponse, orderResponse] = await Promise.all([
        authFetch(`/accounts/users/${userId}/`),
        authFetch(`/accounts/transactions/?user=${userId}&page_size=20`),
        authFetch(`/data/orders/?customer=${userId}&page_size=20`),
      ]);
      const [userPayload, txData, orderData] = await Promise.all([
        userResponse.json(),
        txResponse.json(),
        orderResponse.json(),
      ]);

      if (!userResponse.ok || userPayload.status !== 'success') {
        showToast(userPayload.message || 'Failed to fetch user details', 'error');
        navigate('/admin/users');
        return;
      }

      setUserData(userPayload.data);
      if (txResponse.ok && txData.status === 'success') {
        setTransactions(txData.data || []);
        setTransactionCount(txData.count || 0);
      }

      if (orderResponse.ok && orderData.status === 'success') {
        setOrders(orderData.data || []);
        setOrderCount(orderData.count || 0);
      }

      if (
        txResponse.ok && txData.status === 'success' &&
        orderResponse.ok && orderData.status === 'success' &&
        orderData.weekly?.data
      ) {
        const transactionDays = new Map(
          (txData.weekly?.data || []).map((day) => [day.date, day])
        );
        const days = orderData.weekly.data;
        const profit = days.map((day) => (
          parseFloat(transactionDays.get(day.date)?.commissions || 0)
        ));

        setChartData({
          labels: days.map((day) => day.day),
          revenue: days.map((day) => parseFloat(day.revenue || 0)),
          profit,
          orders: days.map((day) => day.count || 0),
          summary: {
            total_orders: orderData.weekly.total_orders || 0,
            total_revenue: parseFloat(orderData.weekly.total_revenue || 0),
            total_profit: profit.reduce((sum, value) => sum + value, 0),
          },
        });
        setTimeout(() => setAnimating(true), 300);
      }

      if (userPayload.data.role === 'AGENT') {
        await Promise.allSettled([
          authFetch(`/accounts/agents/${userId}/sub-agents/`)
            .then(async (response) => ({ response, data: await response.json() }))
            .then(({ response, data }) => {
              if (response.ok && data.status === 'success') {
                setSubAgents(data.data?.sub_agents || []);
              }
            }),
          fetchPricingOverrides(),
          fetchAllPackages(),
        ]);
      }

    } catch (error) {
      console.error('Error fetching user details:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPackages = async () => {
    try {
      const response = await authFetch('/data/packages/?is_active=true');
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setAllPackages((data.data || []).filter((pkg) => pkg.is_active));
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchPricingOverrides = async () => {
    try {
      const baseUrl = `/data/pricing/?user=${userId}&price_type=ADMIN_AGENT_CUSTOM&page_size=200`;
      const response = await authFetch(baseUrl);
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const remainingPages = Array.from(
          { length: Math.max(0, (data.total_pages || 1) - 1) },
          (_, index) => index + 2
        );
        const remainingResults = await Promise.all(remainingPages.map(async (page) => {
          const pageResponse = await authFetch(`${baseUrl}&page=${page}`);
          const pageData = await pageResponse.json();
          if (!pageResponse.ok || pageData.status !== 'success') {
            throw new Error(pageData.message || `Failed to load pricing page ${page}`);
          }
          return pageData.data || [];
        }));
        const transformedData = [data.data || [], ...remainingResults]
          .flat()
          .map((pricing) => toPricingOverride(pricing, allPackages));
        setPricingOverrides(transformedData);
      }
    } catch (error) {
      console.error('Error fetching pricing overrides:', error);
    }
  };

  const handleSavePrice = async (pkg) => {
    if (!newPrice || isNaN(newPrice) || Number(newPrice) <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }

    try {
      if (pkg.has_custom) {
        const response = await authFetch(`/data/pricing/${pkg.pricing_id}/`, {
          method: 'PATCH',
          body: JSON.stringify({
            price: newPrice,
            notes: priceNotes || `Custom price for ${pkg.network} ${pkg.size_gb}GB`,
          }),
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          showToast('Custom price updated successfully', 'success');
          setPricingOverrides((current) => current.map((pricing) => (
            pricing.pricing_id === data.data.id
              ? toPricingOverride(data.data, allPackages)
              : pricing
          )));
          setIsEditingPrice(false);
          setEditingPrice(null);
          setNewPrice('');
          setPriceNotes('');
        } else {
          showToast(data.message || 'Failed to update price', 'error');
        }
      } else {
        const response = await authFetch('/data/pricing/create/', {
          method: 'POST',
          body: JSON.stringify({
            package: pkg.id,
            user: userId,
            price_type: 'ADMIN_AGENT_CUSTOM',
            price: newPrice,
            notes: priceNotes || `Custom price for ${pkg.network} ${pkg.size_gb}GB`,
          }),
        });

        const data = await response.json();

        if (response.status === 201 && data.status === 'success') {
          showToast('Custom price set successfully', 'success');
          setPricingOverrides((current) => [
            toPricingOverride(data.data, allPackages),
            ...current,
          ]);
          setIsEditingPrice(false);
          setEditingPrice(null);
          setNewPrice('');
          setPriceNotes('');
        } else {
          if (data.errors) {
            const firstError = Object.values(data.errors)[0];
            showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
          } else {
            showToast(data.message || 'Failed to set custom price', 'error');
          }
        }
      }
    } catch (error) {
      console.error('Error saving price:', error);
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleRemovePrice = async (pkg) => {
    if (!window.confirm(`Remove custom price for ${pkg.network} ${pkg.size_gb}GB? This will revert to the base price.`)) {
      return;
    }

    try {
      const response = await authFetch(`/data/pricing/${pkg.pricing_id}/`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        showToast('Custom price removed successfully', 'success');
        setPricingOverrides((current) => current.filter((pricing) => (
          pricing.pricing_id !== pkg.pricing_id
        )));
      } else {
        showToast(data.message || 'Failed to remove custom price', 'error');
      }
    } catch (error) {
      console.error('Error removing price:', error);
      showToast('Network error. Please try again.', 'error');
    }
  };

  const handleSavePriceFromModal = async () => {
    if (!selectedPackageForPricing || !customPriceValue || isNaN(customPriceValue) || Number(customPriceValue) <= 0) {
      showToast('Please select a package and enter a valid price', 'error');
      return;
    }

    setIsSavingPricing(true);
    try {
      const response = await authFetch('/data/pricing/create/', {
        method: 'POST',
        body: JSON.stringify({
          package: selectedPackageForPricing.id,
          user: userId,
          price_type: 'ADMIN_AGENT_CUSTOM',
          price: customPriceValue,
          notes: customPriceNotes || `Custom price for ${selectedPackageForPricing.network} ${selectedPackageForPricing.size_gb}GB`,
        }),
      });

      const data = await response.json();

      if (response.status === 201 && data.status === 'success') {
        showToast('Custom price set successfully', 'success');
        setShowAddPricingModal(false);
        setSelectedPackageForPricing(null);
        setCustomPriceValue('');
        setCustomPriceNotes('');
        setPricingOverrides((current) => [
          toPricingOverride(data.data, allPackages),
          ...current,
        ]);
      } else {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0];
          showToast(Array.isArray(firstError) ? firstError[0] : firstError, 'error');
        } else {
          showToast(data.message || 'Failed to set custom price', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving price:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsSavingPricing(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'ADMIN': '#EF4444',
      'AGENT': '#3B82F6',
      'SUB_AGENT': '#8B5CF6',
      'CUSTOMER': '#10B981',
    };
    return colors[role] || '#6B7280';
  };

  const getRoleLabel = (role) => {
    const labels = {
      'ADMIN': 'Admin',
      'AGENT': 'Agent',
      'SUB_AGENT': 'Sub Agent',
      'CUSTOMER': 'Customer',
    };
    return labels[role] || role;
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': '#F59E0B',
      'PROCESSING': '#3B82F6',
      'DELIVERED': '#8B5CF6',
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
      'DELIVERED': <Truck size={14} />,
      'COMPLETED': <CheckCircle size={14} />,
      'FAILED': <AlertCircle size={14} />,
      'CANCELLED': <AlertCircle size={14} />,
    };
    return icons[status] || null;
  };

  const getStatusLabel = (status) => {
    if (!status) return 'N/A';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
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

  const getTransactionTypeColor = (type) => {
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

  const getTransactionTypeIcon = (type) => {
    const icons = {
      'DEPOSIT': <ArrowUpDown size={14} />,
      'WITHDRAWAL': <ArrowUpDown size={14} />,
      'PURCHASE': <ShoppingBag size={14} />,
      'REFUND': <CreditCard size={14} />,
      'COMMISSION': <DollarSign size={14} />,
      'TRANSFER': <ArrowUpDown size={14} />,
    };
    return icons[type] || null;
  };

  const renderChart = () => {
    if (!chartData) return null;

    const dataMap = {
      revenue: { data: chartData.revenue, color: colors.btnBg, label: 'Revenue' },
      profit: { data: chartData.profit, color: '#10B981', label: 'Profit' },
      orders: { data: chartData.orders, color: '#F59E0B', label: 'Orders' },
    };

    const current = dataMap[activeChartTab];
    const maxValue = Math.max(...current.data, 1);
    const labels = chartData.labels;

    return (
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: isMobile ? '140px' : '180px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
          flexWrap: 'wrap',
          gap: '4px',
        }}>
          <span style={{
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: '600',
            color: colors.secondaryText,
          }}>
            {current.label} Overview
          </span>
          <div style={{
            display: 'flex',
            gap: '2px',
          }}>
            {['revenue', 'profit', 'orders'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveChartTab(tab)}
                style={{
                  padding: isMobile ? '2px 8px' : '3px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: activeChartTab === tab ? colors.btnBg : 'transparent',
                  color: activeChartTab === tab ? colors.btnText : colors.secondaryText,
                  cursor: 'pointer',
                  fontSize: isMobile ? '7px' : '9px',
                  fontWeight: activeChartTab === tab ? '600' : '500',
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          height: isMobile ? '100px' : '140px',
          gap: isMobile ? '3px' : '5px',
          padding: '0 2px',
          position: 'relative',
        }}>
          {current.data.map((value, index) => {
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const barHeight = Math.max(percentage, 3);

            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div style={{
                  width: '100%',
                  maxWidth: isMobile ? '18px' : '28px',
                  height: `${animating ? barHeight : 0}%`,
                  minHeight: animating ? '3px' : '0',
                  background: `linear-gradient(180deg, ${current.color}, ${current.color}88)`,
                  borderRadius: '3px 3px 0 0',
                  transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  position: 'relative',
                  boxShadow: `0 2px 6px ${current.color}33`,
                }}>
                  {animating && value > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: isMobile ? '-12px' : '-16px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: isMobile ? '6px' : '8px',
                      fontWeight: '700',
                      color: current.color,
                      opacity: 0.8,
                      whiteSpace: 'nowrap',
                    }}>
                      {value}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: isMobile ? '6px' : '8px',
                  color: colors.secondaryText,
                  fontWeight: '500',
                }}>
                  {labels[index]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
          Loading user details...
        </span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: colors.secondaryText,
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: colors.heading }}>
          User not found
        </h3>
        <p style={{ margin: '0 0 20px 0' }}>The user you're looking for doesn't exist</p>
        <button
          onClick={() => navigate('/admin/users')}
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
          Back to Users
        </button>
      </div>
    );
  }

  const isAgent = userData.role === 'AGENT';

  const tabs = [
    { id: 'overview', label: isMobile ? 'Info' : 'Overview', icon: <User size={16} /> },
    { id: 'orders', label: isMobile ? 'Orders' : 'Orders', icon: <ShoppingBag size={16} />, count: orderCount },
    { id: 'transactions', label: isMobile ? 'Txns' : 'Transactions', icon: <Activity size={16} />, count: transactionCount },
    ...(isAgent ? [{ id: 'subagents', label: isMobile ? 'Sub Agents' : 'Sub Agents', icon: <Users size={16} />, count: subAgents.length }] : []),
    ...(isAgent ? [{ id: 'pricing', label: isMobile ? 'Pricing' : 'Pricing Overrides', icon: <DollarSign size={16} />, count: pricingOverrides.length }] : []),
    { id: 'profile', label: isMobile ? 'Profile' : 'Profile', icon: <FileText size={16} /> },
  ];

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
        alignItems: 'center',
        gap: isMobile ? '10px' : '16px',
        marginBottom: isMobile ? '16px' : '24px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => navigate('/admin/users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            color: colors.secondaryText,
            cursor: 'pointer',
            padding: isMobile ? '6px' : '8px',
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
          <ArrowLeft size={isMobile ? 18 : 20} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: isMobile ? 'clamp(18px, 5vw, 22px)' : 'clamp(24px, 3vw, 32px)',
            fontWeight: '700',
            color: colors.heading,
            margin: '0 0 2px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            User Details
            <span style={{
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: '500',
              color: colors.secondaryText,
              background: colors.border,
              padding: '2px 10px',
              borderRadius: '12px',
            }}>
              {getRoleLabel(userData.role)}
            </span>
          </h1>
          <p style={{
            color: colors.secondaryText,
            margin: 0,
            fontSize: isMobile ? '12px' : '14px',
          }}>
            Complete profile and activity information
          </p>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '4px' : '8px' }}>
          <button
            onClick={fetchUserDetails}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '4px' : '8px',
              padding: isMobile ? '6px 10px' : '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.raisedBg,
              color: colors.text,
              cursor: 'pointer',
              fontSize: isMobile ? '11px' : '13px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
          >
            <RefreshCw size={isMobile ? 14 : 16} />
            {!isMobile && 'Refresh'}
          </button>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '4px' : '8px',
              padding: isMobile ? '6px 10px' : '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.raisedBg,
              color: colors.text,
              cursor: 'pointer',
              fontSize: isMobile ? '11px' : '13px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
          >
            <Download size={isMobile ? 14 : 16} />
            {!isMobile && 'Export'}
          </button>
        </div>
      </div>

      
      <div style={{
        backgroundColor: colors.raisedBg,
        borderRadius: isMobile ? '12px' : '16px',
        border: `1px solid ${colors.border}`,
        padding: isMobile ? '16px' : '24px',
        marginBottom: isMobile ? '16px' : '24px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto',
        gap: isMobile ? '12px' : '20px',
        alignItems: 'center',
        textAlign: isMobile ? 'center' : 'left',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '4px' : '8px',
        }}>
          <div style={{
            width: isMobile ? '60px' : '80px',
            height: isMobile ? '60px' : '80px',
            borderRadius: '50%',
            backgroundColor: `${getRoleBadgeColor(userData.role)}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: getRoleBadgeColor(userData.role),
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: '700',
          }}>
            {(userData.first_name?.[0] || userData.username?.[0] || 'U').toUpperCase()}
          </div>
          <span style={{
            fontSize: isMobile ? '10px' : '12px',
            padding: isMobile ? '1px 10px' : '2px 12px',
            borderRadius: '10px',
            backgroundColor: `${getRoleBadgeColor(userData.role)}20`,
            color: getRoleBadgeColor(userData.role),
            fontWeight: '600',
            textTransform: 'uppercase',
          }}>
            {getRoleLabel(userData.role)}
          </span>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '12px',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            <h2 style={{
              fontSize: isMobile ? '18px' : '24px',
              fontWeight: '700',
              color: colors.heading,
              margin: 0,
            }}>
              {userData.first_name || userData.username}
              {userData.last_name && ` ${userData.last_name}`}
            </h2>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: '600',
              color: userData.is_active ? '#10B981' : '#EF4444',
            }}>
              {userData.is_active ? (
                <CheckCircle size={isMobile ? 14 : 16} />
              ) : (
                <AlertCircle size={isMobile ? 14 : 16} />
              )}
              {userData.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{
            display: 'flex',
            gap: isMobile ? '8px' : '16px',
            marginTop: isMobile ? '4px' : '8px',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '12px' : '14px', color: colors.text }}>
              <Mail size={isMobile ? 14 : 16} style={{ color: colors.secondaryText }} />
              <span style={{ wordBreak: 'break-all' }}>{userData.email}</span>
            </div>
            {userData.phone_number && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '12px' : '14px', color: colors.text }}>
                <Phone size={isMobile ? 14 : 16} style={{ color: colors.secondaryText }} />
                {userData.phone_number}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', color: colors.secondaryText }}>
              <Calendar size={isMobile ? 14 : 16} />
              Joined {formatDate(userData.date_joined)}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: isMobile ? '6px' : '8px',
          justifyContent: isMobile ? 'center' : 'flex-end',
        }}>
          <button
            style={{
              padding: isMobile ? '6px 12px' : '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.raisedBg,
              color: colors.text,
              cursor: 'pointer',
              fontSize: isMobile ? '11px' : '13px',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '4px' : '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
          >
            <Edit2 size={isMobile ? 14 : 16} />
            {!isMobile && 'Edit'}
          </button>
        </div>
      </div>

      
      {chartData && chartData.summary.total_orders > 0 && (
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: isMobile ? '10px' : '12px',
          border: `1px solid ${colors.border}`,
          padding: isMobile ? '10px 12px' : '14px 18px',
          marginBottom: isMobile ? '12px' : '16px',
          boxShadow: `0 2px 8px ${colors.shadow}`,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isMobile ? '6px' : '10px',
            flexWrap: 'wrap',
            gap: isMobile ? '4px' : '6px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '4px' : '6px',
            }}>
              <BarChart3 size={isMobile ? 14 : 16} style={{ color: colors.btnBg }} />
              <span style={{
                fontWeight: '600',
                fontSize: isMobile ? '12px' : '14px',
                color: colors.heading,
              }}>
                User Activity
              </span>
              <span style={{
                fontSize: isMobile ? '8px' : '10px',
                color: colors.secondaryText,
                background: colors.border,
                padding: isMobile ? '1px 6px' : '2px 10px',
                borderRadius: '8px',
              }}>
                {chartData.summary.total_orders} this week
              </span>
            </div>
            {chartData?.summary && (
              <div style={{
                display: 'flex',
                gap: isMobile ? '6px' : '12px',
                fontSize: isMobile ? '8px' : '10px',
                color: colors.secondaryText,
                flexWrap: 'wrap',
              }}>
                <span>Revenue: <strong style={{ color: colors.text }}>₵{(chartData.summary.total_revenue || 0).toFixed(2)}</strong></span>
                {!isMobile && (
                  <span>Profit: <strong style={{ color: colors.text }}>₵{(chartData.summary.total_profit || 0).toFixed(2)}</strong></span>
                )}
              </div>
            )}
          </div>
          <div style={{
            width: '100%',
            minHeight: isMobile ? '140px' : '180px',
          }}>
            {renderChart()}
          </div>
        </div>
      )}

      
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: isMobile ? '6px' : '10px',
        marginBottom: isMobile ? '12px' : '16px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: isMobile ? '8px' : '10px',
          padding: isMobile ? '8px 10px' : '10px 14px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: isMobile ? '9px' : '11px', color: colors.secondaryText }}>Wallet</div>
          <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: colors.btnBg }}>
            ₵{userData.wallet?.balance || '0.00'}
          </div>
        </div>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: isMobile ? '8px' : '10px',
          padding: isMobile ? '8px 10px' : '10px 14px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: isMobile ? '9px' : '11px', color: colors.secondaryText }}>Orders</div>
          <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#3B82F6' }}>
            {orderCount}
          </div>
        </div>
        <div style={{
          backgroundColor: colors.raisedBg,
          borderRadius: isMobile ? '8px' : '10px',
          padding: isMobile ? '8px 10px' : '10px 14px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: isMobile ? '9px' : '11px', color: colors.secondaryText }}>Transactions</div>
          <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#8B5CF6' }}>
            {transactionCount}
          </div>
        </div>
        {isAgent && (
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: isMobile ? '8px' : '10px',
            padding: isMobile ? '8px 10px' : '10px 14px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: isMobile ? '9px' : '11px', color: colors.secondaryText }}>Sub Agents</div>
            <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#F59E0B' }}>
              {subAgents.length}
            </div>
          </div>
        )}
      </div>

      
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: isMobile ? '12px' : '16px',
        padding: '3px',
        backgroundColor: colors.raisedBg,
        borderRadius: isMobile ? '8px' : '10px',
        border: `1px solid ${colors.border}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '3px' : '6px',
              padding: isMobile ? '5px 10px' : '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? colors.btnBg : 'transparent',
              color: activeTab === tab.id ? colors.btnText : colors.secondaryText,
              cursor: 'pointer',
              fontSize: isMobile ? '10px' : '13px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = colors.hoverBg;
                e.currentTarget.style.color = colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.secondaryText;
              }
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize: isMobile ? '8px' : '10px',
                padding: isMobile ? '0 6px' : '1px 8px',
                borderRadius: '8px',
                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : colors.border,
                color: activeTab === tab.id ? colors.btnText : colors.secondaryText,
                fontWeight: '600',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      
      <div>
        
        {activeTab === 'overview' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '16px' : '20px',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            
            <div style={{
              backgroundColor: colors.raisedBg,
              borderRadius: '12px',
              padding: isMobile ? '16px' : '20px',
              border: `1px solid ${colors.border}`,
              width: '100%',
              boxSizing: 'border-box',
            }}>
              <h4 style={{
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: '600',
                color: colors.heading,
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <User size={isMobile ? 16 : 18} style={{ color: colors.btnBg }} />
                User Information
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '8px' : '10px',
                width: '100%',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Username</span>
                  <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px', wordBreak: 'break-all' }}>{userData.username}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Email</span>
                  <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px', wordBreak: 'break-all' }}>{userData.email}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Phone</span>
                  <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px' }}>{userData.phone_number || 'N/A'}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                  alignItems: 'center',
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Role</span>
                  <span style={{
                    fontSize: isMobile ? '11px' : '13px',
                    padding: isMobile ? '2px 10px' : '2px 12px',
                    borderRadius: '10px',
                    backgroundColor: `${getRoleBadgeColor(userData.role)}20`,
                    color: getRoleBadgeColor(userData.role),
                    fontWeight: '600',
                  }}>
                    {getRoleLabel(userData.role)}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Status</span>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: userData.is_active ? '#10B981' : '#EF4444',
                    fontWeight: '600',
                    fontSize: isMobile ? '12px' : '13px',
                  }}>
                    {userData.is_active ? <CheckCircle size={isMobile ? 12 : 14} /> : <AlertCircle size={isMobile ? 12 : 14} />}
                    {userData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Joined</span>
                  <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px' }}>{formatDate(userData.date_joined)}</span>
                </div>
                {userData.last_login && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}>
                    <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Last Login</span>
                    <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px' }}>{formatDate(userData.last_login)}</span>
                  </div>
                )}
              </div>
            </div>

            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? '12px' : '16px',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              
              <div style={{
                backgroundColor: colors.raisedBg,
                borderRadius: '12px',
                padding: isMobile ? '16px' : '20px',
                border: `1px solid ${colors.border}`,
                width: '100%',
                boxSizing: 'border-box',
              }}>
                <h4 style={{
                  fontSize: isMobile ? '15px' : '16px',
                  fontWeight: '600',
                  color: colors.heading,
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Wallet size={isMobile ? 16 : 18} style={{ color: colors.btnBg }} />
                  Wallet
                </h4>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Balance</span>
                  <span style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: '700',
                    color: colors.btnBg,
                  }}>
                    ₵{userData.wallet?.balance || '0.00'}
                  </span>
                </div>
                <div style={{
                  fontSize: isMobile ? '11px' : '12px',
                  color: colors.secondaryText,
                  marginTop: '4px',
                }}>
                  Wallet ID: {userData.wallet?.id || 'N/A'}
                </div>
              </div>

              
              {isAgent && userData.agent_profile && (
                <div style={{
                  backgroundColor: colors.raisedBg,
                  borderRadius: '12px',
                  padding: isMobile ? '16px' : '20px',
                  border: `1px solid ${colors.border}`,
                  width: '100%',
                  boxSizing: 'border-box',
                }}>
                  <h4 style={{
                    fontSize: isMobile ? '15px' : '16px',
                    fontWeight: '600',
                    color: colors.heading,
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <Store size={isMobile ? 16 : 18} style={{ color: colors.btnBg }} />
                    Agent Profile
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '6px' : '8px',
                    width: '100%',
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}>
                      <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Shop Name</span>
                      <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px' }}>{userData.agent_profile.shop_name || 'N/A'}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}>
                      <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Store URL</span>
                      <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px', wordBreak: 'break-all' }}>{userData.agent_profile.store_url || 'N/A'}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}>
                      <span style={{ color: colors.secondaryText, fontSize: isMobile ? '12px' : '13px' }}>Parent Agent</span>
                      <span style={{ color: colors.text, fontWeight: '500', fontSize: isMobile ? '12px' : '13px' }}>{userData.agent_profile.parent_agent_name || 'None'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        
        {activeTab === 'orders' && (
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: '600', color: colors.heading }}>Order History</span>
              <span style={{ fontSize: '13px', color: colors.secondaryText }}>
                {orders.length} recent of {orderCount}
              </span>
            </div>
            {orders.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr 0.8fr',
                  padding: '10px 16px',
                  backgroundColor: colors.mainBg,
                  borderBottom: `1px solid ${colors.border}`,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.secondaryText,
                  textTransform: 'uppercase',
                  minWidth: '600px',
                }}>
                  <span>Order ID</span>
                  <span>Package</span>
                  <span>Amount</span>
                  <span>Profit</span>
                  <span>Date</span>
                  <span>Status</span>
                </div>
                {orders.map((order) => {
                  const profit = parseFloat(order.agent_profit || 0);
                  const hasProfit = profit > 0;

                  return (
                    <div
                      key={order.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.5fr 1fr 1fr 1fr 0.8fr',
                        padding: '10px 16px',
                        borderBottom: `1px solid ${colors.border}`,
                        alignItems: 'center',
                        fontSize: '14px',
                        minWidth: '600px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontWeight: '500', color: colors.heading }}>
                        {order.id?.slice(0, 8) || 'N/A'}
                      </span>
                      <span style={{ color: colors.text }}>
                        {order.package_name || order.package?.network || 'N/A'} {order.package_size || order.package?.size_gb || ''}GB
                      </span>
                      <span style={{ fontWeight: '600', color: colors.btnBg }}>
                        ₵{order.customer_price || order.amount || '0.00'}
                      </span>
                      <span style={{
                        fontWeight: '600',
                        color: hasProfit ? '#10B981' : colors.secondaryText,
                      }}>
                        ₵{profit.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '13px', color: colors.secondaryText }}>
                        {formatDate(order.created_at || order.date)}
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
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: colors.secondaryText,
              }}>
                No orders found for this user
              </div>
            )}
          </div>
        )}

        
        {activeTab === 'transactions' && (
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: '600', color: colors.heading }}>Transaction History</span>
              <span style={{ fontSize: '13px', color: colors.secondaryText }}>
                {transactions.length} recent of {transactionCount}
              </span>
            </div>
            {transactions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr',
                  padding: '10px 16px',
                  backgroundColor: colors.mainBg,
                  borderBottom: `1px solid ${colors.border}`,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.secondaryText,
                  textTransform: 'uppercase',
                  minWidth: '600px',
                }}>
                  <span>Reference</span>
                  <span>Type</span>
                  <span>Description</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr',
                      padding: '10px 16px',
                      borderBottom: `1px solid ${colors.border}`,
                      alignItems: 'center',
                      fontSize: '14px',
                      minWidth: '600px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: '500', color: colors.heading, fontSize: '12px' }}>
                      {txn.reference?.slice(0, 12) || 'N/A'}
                    </span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: getTransactionTypeColor(txn.transaction_type || txn.type),
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {getTransactionTypeIcon(txn.transaction_type || txn.type)}
                      {getStatusLabel(txn.transaction_type || txn.type)}
                    </span>
                    <span style={{ color: colors.text, fontSize: '13px' }}>
                      {txn.description || 'N/A'}
                    </span>
                    <span style={{
                      fontWeight: '600',
                      color: (txn.transaction_type === 'WITHDRAWAL' || txn.type === 'Refund') ? '#EF4444' : colors.btnBg,
                    }}>
                      {(txn.transaction_type === 'WITHDRAWAL' || txn.type === 'Refund') ? '-' : ''}
                      ₵{txn.amount || '0.00'}
                    </span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: getStatusColor(txn.status),
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}>
                      {getStatusIcon(txn.status)}
                      {getStatusLabel(txn.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: colors.secondaryText,
              }}>
                No transactions found for this user
              </div>
            )}
          </div>
        )}

        
        {activeTab === 'subagents' && isAgent && (
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: '600', color: colors.heading }}>Sub Agents</span>
              <span style={{ fontSize: '13px', color: colors.secondaryText }}>{subAgents.length} sub agents</span>
            </div>
            {subAgents.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr 1fr 1fr 0.8fr',
                  padding: '10px 16px',
                  backgroundColor: colors.mainBg,
                  borderBottom: `1px solid ${colors.border}`,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.secondaryText,
                  textTransform: 'uppercase',
                  minWidth: '500px',
                }}>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Sales</span>
                  <span>Profit</span>
                  <span>Status</span>
                </div>
                {subAgents.map((agent) => (
                  <div
                    key={agent.id || agent.user_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.5fr 1fr 1fr 0.8fr',
                      padding: '10px 16px',
                      borderBottom: `1px solid ${colors.border}`,
                      alignItems: 'center',
                      fontSize: '14px',
                      minWidth: '500px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: '500', color: colors.heading }}>
                      {agent.first_name || agent.username || 'N/A'}
                    </span>
                    <span style={{ color: colors.text, fontSize: '13px' }}>{agent.email || 'N/A'}</span>
                    <span style={{ fontWeight: '600', color: colors.btnBg }}>₵{agent.sales || '0'}</span>
                    <span style={{ fontWeight: '600', color: '#10B981' }}>₵{agent.profit || '0'}</span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: getStatusColor(agent.is_active ? 'active' : 'inactive'),
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {agent.is_active ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: colors.secondaryText,
              }}>
                No sub agents found for this agent
              </div>
            )}
          </div>
        )}

        
        {activeTab === 'pricing' && isAgent && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.heading,
                  margin: 0,
                }}>
                  Agent Pricing Overrides
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: colors.secondaryText,
                  margin: '4px 0 0 0',
                }}>
                  Set custom prices for this agent. These override the base agent prices.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddPricingModal(true);
                  setSelectedPackageForPricing(null);
                  setCustomPriceValue('');
                  setCustomPriceNotes('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.btnBg,
                  color: colors.btnText,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Plus size={16} />
                Add Custom Price
              </button>
            </div>

            <div style={{
              backgroundColor: colors.raisedBg,
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1.5fr',
                padding: '12px 16px',
                backgroundColor: colors.mainBg,
                borderBottom: `1px solid ${colors.border}`,
                fontSize: '12px',
                fontWeight: '600',
                color: colors.secondaryText,
                textTransform: 'uppercase',
                minWidth: '600px',
              }}>
                <span>Package</span>
                <span>Size</span>
                <span>Base Agent Price</span>
                <span>Custom Price</span>
                <span style={{ textAlign: 'center' }}>Actions</span>
              </div>

              {pricingOverrides.length > 0 ? (
                pricingOverrides.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr 1.5fr',
                      padding: '12px 16px',
                      borderBottom: `1px solid ${colors.border}`,
                      alignItems: 'center',
                      fontSize: '14px',
                      minWidth: '600px',
                      transition: 'background 0.2s',
                      backgroundColor: pkg.has_custom ? `${colors.btnBg}08` : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = pkg.has_custom ? `${colors.btnBg}15` : colors.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = pkg.has_custom ? `${colors.btnBg}08` : 'transparent'}
                  >
                    <span style={{
                      fontWeight: '500',
                      color: colors.heading,
                      textTransform: 'uppercase',
                    }}>
                      {pkg.network}
                    </span>
                    <span style={{ color: colors.text }}>{pkg.size_gb} GB</span>
                    <span style={{ color: colors.secondaryText }}>
                      ₵{pkg.base_price_agent || '0.00'}
                    </span>
                    <span style={{
                      fontWeight: '600',
                      color: pkg.has_custom ? colors.btnBg : colors.secondaryText,
                    }}>
                      {pkg.has_custom ? `₵${pkg.admin_custom_price}` : '—'}
                      {pkg.has_custom && (
                        <span style={{
                          fontSize: '10px',
                          marginLeft: '6px',
                          padding: '1px 8px',
                          borderRadius: '10px',
                          backgroundColor: `${colors.btnBg}20`,
                          color: colors.btnBg,
                          fontWeight: '600',
                        }}>
                          Custom
                        </span>
                      )}
                    </span>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '6px',
                    }}>
                      {isEditingPrice && editingPrice === pkg.id ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}>
                          <input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="New price"
                            step="0.01"
                            min="0"
                            style={{
                              width: '80px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: `1.5px solid ${colors.btnBg}`,
                              backgroundColor: colors.raisedBg,
                              color: colors.text,
                              fontSize: '13px',
                              outline: 'none',
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePrice(pkg)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: colors.btnBg,
                              color: colors.btnText,
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingPrice(false);
                              setEditingPrice(null);
                              setNewPrice('');
                              setPriceNotes('');
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: `1px solid ${colors.border}`,
                              backgroundColor: 'transparent',
                              color: colors.text,
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          {pkg.has_custom ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPrice(pkg.id);
                                  setNewPrice(pkg.admin_custom_price || '');
                                  setPriceNotes('');
                                  setIsEditingPrice(true);
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: `1px solid ${colors.border}`,
                                  backgroundColor: 'transparent',
                                  color: colors.secondaryText,
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
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
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemovePrice(pkg)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: `1px solid ${colors.border}`,
                                  backgroundColor: 'transparent',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#EF444415';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <X size={14} />
                                Remove
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPrice(pkg.id);
                                setNewPrice('');
                                setPriceNotes('');
                                setIsEditingPrice(true);
                              }}
                              style={{
                                padding: '4px 12px',
                                borderRadius: '6px',
                                border: `1px solid ${colors.btnBg}`,
                                backgroundColor: 'transparent',
                                color: colors.btnBg,
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
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
                              <Plus size={14} />
                              Set Custom
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: colors.secondaryText,
                }}>
                  No pricing overrides found for this agent
                </div>
              )}
            </div>
          </div>
        )}

        
        {activeTab === 'profile' && (
          <div style={{
            backgroundColor: colors.raisedBg,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.heading,
              margin: '0 0 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <FileText size={18} style={{ color: colors.btnBg }} />
              Complete Profile
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '12px' : '16px',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>User ID</div>
                <div style={{ fontSize: '14px', color: colors.text, wordBreak: 'break-all' }}>{userData.id}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Username</div>
                <div style={{ fontSize: '14px', color: colors.text }}>{userData.username}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>First Name</div>
                <div style={{ fontSize: '14px', color: colors.text }}>{userData.first_name || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Last Name</div>
                <div style={{ fontSize: '14px', color: colors.text }}>{userData.last_name || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '14px', color: colors.text, wordBreak: 'break-all' }}>{userData.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Phone</div>
                <div style={{ fontSize: '14px', color: colors.text }}>{userData.phone_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Role</div>
                <div style={{ fontSize: '14px', color: colors.text }}>{getRoleLabel(userData.role)}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Status</div>
                <div style={{ fontSize: '14px', color: userData.is_active ? '#10B981' : '#EF4444' }}>
                  {userData.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Date Joined</div>
                <div style={{ fontSize: '14px', color: colors.text }}>{formatDate(userData.date_joined)}</div>
              </div>
              {userData.last_login && (
                <div>
                  <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Last Login</div>
                  <div style={{ fontSize: '14px', color: colors.text }}>{formatDate(userData.last_login)}</div>
                </div>
              )}
              {userData.wallet && (
                <div>
                  <div style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '4px' }}>Wallet ID</div>
                  <div style={{ fontSize: '14px', color: colors.text, wordBreak: 'break-all' }}>{userData.wallet.id}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      
      {showAddPricingModal && (
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
              setShowAddPricingModal(false);
              setSelectedPackageForPricing(null);
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
                Set Custom Price
              </h3>
              <button
                onClick={() => {
                  setShowAddPricingModal(false);
                  setSelectedPackageForPricing(null);
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
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.text,
                display: 'block',
                marginBottom: '4px',
              }}>
                Select Package
              </label>
              <select
                value={selectedPackageForPricing?.id || ''}
                onChange={(e) => {
                  const pkg = allPackages.find(p => p.id === e.target.value);
                  setSelectedPackageForPricing(pkg || null);
                }}
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
              >
                <option value="">Select a package...</option>
                {allPackages
                  .filter((pkg) => !pricingOverrides.some((pricing) => pricing.id === pkg.id))
                  .map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.network} - {pkg.size_gb}GB (Base: ₵{pkg.base_price_agent})
                  </option>
                  ))}
              </select>
            </div>

            {selectedPackageForPricing && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.text,
                    display: 'block',
                    marginBottom: '4px',
                  }}>
                    Custom Price (₵)
                  </label>
                  <input
                    type="number"
                    value={customPriceValue}
                    onChange={(e) => setCustomPriceValue(e.target.value)}
                    placeholder={`Min: ₵${selectedPackageForPricing.base_price_agent}`}
                    step="0.01"
                    min={selectedPackageForPricing.base_price_agent}
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
                  <div style={{
                    fontSize: '12px',
                    color: colors.secondaryText,
                    marginTop: '4px',
                  }}>
                    Base agent price: ₵{selectedPackageForPricing.base_price_agent}
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
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={customPriceNotes}
                    onChange={(e) => setCustomPriceNotes(e.target.value)}
                    placeholder="Reason for custom price..."
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
              </>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={() => {
                  setShowAddPricingModal(false);
                  setSelectedPackageForPricing(null);
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
                onClick={handleSavePriceFromModal}
                disabled={isSavingPricing || !selectedPackageForPricing}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: colors.btnBg,
                  color: colors.btnText,
                  cursor: isSavingPricing || !selectedPackageForPricing ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  opacity: isSavingPricing || !selectedPackageForPricing ? 0.6 : 1,
                }}
              >
                {isSavingPricing ? (
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
                    Set Custom Price
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

export default AdminUserDetails;

