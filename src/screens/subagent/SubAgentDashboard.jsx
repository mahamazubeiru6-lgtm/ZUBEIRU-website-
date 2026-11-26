import React, {
    useEffect,
    useState,
} from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, ShoppingBag, Edit2, Save, X, DollarSign, Package, Users, BarChart3, Clock, CheckCircle, Activity, Zap, ArrowUp, ArrowDown, RefreshCw, Search, AlertCircle, ChevronRight, Trash2, Info, Loader2, Crown, Sparkles } from 'lucide-react';

const SubAgentDashboard = () => {
    const { colors } = useTheme();
    const { user, authFetch } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [packages, setPackages] = useState([]);
    const [editingPackage, setEditingPackage] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const [recentOrders, setRecentOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNetwork, setSelectedNetwork] = useState('ALL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeChartTab, setActiveChartTab] = useState('revenue');
    const [chartData, setChartData] = useState(null);
    const [animating, setAnimating] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [removingPrice, setRemovingPrice] = useState(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setAnimating(false);

            const [statsResponse, ordersResponse, packagesResponse] = await Promise.all([
                authFetch('/accounts/dashboard/stats/'),
                authFetch('/data/orders/?page_size=5&ordering=-created_at'),
                authFetch('/data/packages/'),
            ]);
            const [statsData, ordersData, packagesData] = await Promise.all([
                statsResponse.json(),
                ordersResponse.json(),
                packagesResponse.json(),
            ]);

            if (statsResponse.ok && statsData.status === 'success') {
                setDashboardData(statsData.data);
                setWalletBalance(parseFloat(statsData.data.wallet_balance || 0));

                const weeklyData = statsData.data.sub_agent?.weekly;
                if (weeklyData) {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const revenueData = days.map(day => {
                        const found = weeklyData.revenue?.find(r => r.day === day);
                        return found ? found.value : 0;
                    });
                    const ordersData = days.map(day => {
                        const found = weeklyData.orders?.find(r => r.day === day);
                        return found ? found.value : 0;
                    });

                    setChartData({
                        labels: days,
                        revenue: revenueData,
                        profit: days.map(day => weeklyData.profit?.find(row => row.day === day)?.value || 0),
                        orders: ordersData,
                        summary: weeklyData.summary || {}
                    });

                    setTimeout(() => setAnimating(true), 300);
                }
            }

            if (ordersResponse.ok && ordersData.status === 'success') {
                setRecentOrders(ordersData.data || []);
            }

            if (packagesResponse.ok && packagesData.status === 'success') {
                const transformedPackages = packagesData.data.map(pkg => ({
                    id: pkg.id,
                    network: pkg.network,
                    size: `${pkg.size_gb}GB`,
                    basePriceAgent: parseFloat(pkg.base_price_agent || 0),
                    agentSubBasePrice: pkg.agent_sub_base_price ? parseFloat(pkg.agent_sub_base_price) : null,
                    agentSubCustomPrice: pkg.agent_sub_custom_price ? parseFloat(pkg.agent_sub_custom_price) : null,
                    subAgentCustomerPrice: pkg.sub_agent_customer_price ? parseFloat(pkg.sub_agent_customer_price) : null,
                    effectivePrice: parseFloat(pkg.effective_price || 0),
                    priceSource: pkg.price_source || 'base',
                    hasCustomPrice: pkg.has_custom_price || false,
                    canEdit: pkg.can_edit !== undefined ? pkg.can_edit : true,
                    isActive: pkg.is_active,
                    salesCount: pkg.sales_count || 0,
                    pricingId: pkg.pricing_id || null,
                }));
                setPackages(transformedPackages);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showToast('Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateProfit = (pkg) => {
        if (pkg.subAgentCustomerPrice) {
            const agentPrice = pkg.agentSubCustomPrice ||
                pkg.agentSubBasePrice ||
                pkg.basePriceAgent ||
                0;
            return pkg.subAgentCustomerPrice - agentPrice;
        }
        return 0;
    };

    const isUsingOwnPrice = (pkg) => {
        return pkg.priceSource === 'sub_agent_custom' || pkg.hasCustomPrice;
    };

    const getAgentEffectivePrice = (pkg) => {
        return pkg.agentSubCustomPrice ||
            pkg.agentSubBasePrice ||
            pkg.basePriceAgent ||
            0;
    };

    const handleEditPrice = (pkg) => {
        setEditingPackage(pkg);
        setNewPrice(String(pkg.subAgentCustomerPrice || pkg.effectivePrice || pkg.basePriceAgent));
        setShowEditModal(true);
    };

    const handleSavePrice = async () => {
        if (!newPrice || isNaN(newPrice) || Number(newPrice) <= 0) {
            showToast('Please enter a valid price', 'error');
            return;
        }

        const agentPrice = getAgentEffectivePrice(editingPackage);
        if (Number(newPrice) < agentPrice) {
            showToast(`Price cannot be below your agent's effective price (₵${agentPrice.toFixed(2)})`, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                package: editingPackage.id,
                user: user.id,
                price_type: 'SUB_AGENT_CUSTOMER_PRICE',
                price: newPrice,
                notes: `Customer price for ${editingPackage.network} ${editingPackage.size}`,
            };

            let response;
            if (editingPackage.pricingId) {
                response = await authFetch(`/data/pricing/${editingPackage.pricingId}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        price: newPrice,
                        notes: `Updated customer price for ${editingPackage.network} ${editingPackage.size}`,
                    }),
                });
            } else {
                response = await authFetch('/data/pricing/create/', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                showToast('Package price updated successfully', 'success');
                const price = Number(newPrice);
                setPackages((current) => current.map((pkg) => (
                    pkg.id === editingPackage.id
                        ? {
                            ...pkg,
                            subAgentCustomerPrice: price,
                            effectivePrice: price,
                            priceSource: 'sub_agent_custom',
                            hasCustomPrice: true,
                            pricingId: data.data?.id || pkg.pricingId,
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
                    showToast(data.message || 'Failed to update price', 'error');
                }
            }
        } catch (error) {
            console.error('Error updating price:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveCustomPrice = async (pkg) => {
        if (!window.confirm(`Remove custom price for ${pkg.network} ${pkg.size}? This will revert to your agent's price.`)) {
            return;
        }

        setRemovingPrice(pkg.id);
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
                            subAgentCustomerPrice: null,
                            effectivePrice: getAgentEffectivePrice(item),
                            priceSource: item.agentSubCustomPrice
                                ? 'agent_sub_custom'
                                : item.agentSubBasePrice
                                    ? 'agent_sub_base'
                                    : 'base',
                            hasCustomPrice: false,
                            pricingId: null,
                        }
                        : item
                )));
            } else {
                showToast(data.message || 'Failed to remove custom price', 'error');
            }
        } catch (error) {
            console.error('Error removing price:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            setRemovingPrice(null);
        }
    };

    const getNetworkColor = (network) => {
        const colors = {
            'MTN': '#FFD700',
            'MTN_EXPRESS': '#FFD700',
            'Telecel': '#FF0000',
            'AirtelTigo': '#1A73E8',
            'AT_BIGTIME': '#1A73E8',
        };
        return colors[network] || colors.btnBg;
    };

    const getNetworkBgColor = (network) => {
        const colors = {
            'MTN': '#FFFDE7',
            'MTN_EXPRESS': '#FFFDE7',
            'Telecel': '#FFEBEE',
            'AirtelTigo': '#E8F0FE',
            'AT_BIGTIME': '#E8F0FE',
        };
        return colors[network] || '#F3F4F6';
    };

    const getPriceSourceBadge = (source, isUsingOwn) => {
        if (isUsingOwn) {
            return { label: 'Your Price', color: '#10B981', bg: '#10B98120' };
        }
        const badges = {
            'agent_sub_custom': { label: 'Agent Custom', color: '#8B5CF6', bg: '#8B5CF620' },
            'agent_base': { label: 'Agent Base', color: '#3B82F6', bg: '#3B82F620' },
            'base': { label: 'Base Price', color: '#6B7280', bg: '#6B728020' },
        };
        return badges[source] || badges['base'];
    };

    const getStatusColor = (status) => {
        const colors = {
            'COMPLETED': '#10B981',
            'PENDING': '#F59E0B',
            'PROCESSING': '#3B82F6',
            'FAILED': '#EF4444',
            'CANCELLED': '#6B7280',
        };
        return colors[status] || '#6B7280';
    };

    const getStatusIcon = (status) => {
        const icons = {
            'COMPLETED': <CheckCircle size={14} />,
            'PENDING': <Clock size={14} />,
            'PROCESSING': <RefreshCw size={14} />,
            'FAILED': <AlertCircle size={14} />,
            'CANCELLED': <AlertCircle size={14} />,
        };
        return icons[status] || null;
    };

    const getStatusLabel = (status) => {
        if (!status) return 'N/A';
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    };

    const networks = ['ALL', 'MTN', 'Telecel', 'AirtelTigo'];

    const filteredPackages = packages.filter(pkg => {
        const matchesSearch = pkg.network.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pkg.size.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesNetwork = selectedNetwork === 'ALL' || pkg.network === selectedNetwork;
        return matchesSearch && matchesNetwork && pkg.isActive;
    });

    const sellerStats = dashboardData?.sub_agent || {};
    const totalRevenue = parseFloat(sellerStats.total_revenue || 0);
    const totalProfit = parseFloat(sellerStats.total_profit || 0);
    const totalOrders = sellerStats.total_orders || 0;
    const pendingOrders = sellerStats.pending_orders || 0;
    const completedOrders = sellerStats.completed_orders || 0;
    const shopName = sellerStats.shop_name || 'My Store';

    const renderChart = () => {
        if (!chartData) return null;

        const dataMap = {
            revenue: { data: chartData.revenue, color: colors.btnBg, label: 'Revenue' },
            profit: { data: chartData.profit, color: colors.success, label: 'Profit' },
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
                    Loading dashboard...
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
                        fontSize: isMobile ? 'clamp(18px, 5vw, 22px)' : 'clamp(20px, 2.5vw, 28px)',
                        fontWeight: '700',
                        color: colors.heading,
                        margin: '0 0 2px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                    }}>
                        <Activity size={isMobile ? 20 : 24} style={{ color: colors.btnBg }} />
                        Sub-Agent Dashboard
                        {shopName && !isMobile && (
                            <span style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: colors.secondaryText,
                                background: colors.border,
                                padding: '2px 12px',
                                borderRadius: '12px',
                            }}>
                                {shopName}
                            </span>
                        )}
                    </h1>
                    <p style={{
                        color: colors.secondaryText,
                        margin: 0,
                        fontSize: isMobile ? '12px' : '13px',
                    }}>
                        Welcome back, {user?.first_name || user?.username || 'Sub-Agent'}
                        {sellerStats.parent_agent && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontSize: '12px' }}>
                                <Crown size={14} color={colors.warning} />
                                Agent: {sellerStats.parent_agent}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '4px' : '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={fetchDashboardData}
                        style={{
                            padding: isMobile ? '4px 10px' : '6px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.raisedBg,
                            color: colors.text,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: isMobile ? '10px' : '12px',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                        onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
                    >
                        <RefreshCw size={isMobile ? 12 : 14} />
                        {!isMobile && 'Refresh'}
                    </button>
                </div>
            </div>

            
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: isMobile ? '6px' : '10px',
                marginBottom: isMobile ? '12px' : '20px',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <StatCard
                    icon={<TrendingUp size={isMobile ? 16 : 18} />}
                    label="Revenue"
                    value={`₵${totalRevenue.toFixed(2)}`}
                    change="Completed data orders"
                    positive={true}
                    color={colors.btnBg}
                    colors={colors}
                    isMobile={isMobile}
                />
                <StatCard
                    icon={<DollarSign size={isMobile ? 16 : 18} />}
                    label="Profit"
                    value={`₵${totalProfit.toFixed(2)}`}
                    change="Your completed-order margin"
                    positive={true}
                    color="#10B981"
                    colors={colors}
                    isMobile={isMobile}
                />
                <StatCard
                    icon={<ShoppingBag size={isMobile ? 16 : 18} />}
                    label="Orders"
                    value={totalOrders}
                    change={`${pendingOrders} pending`}
                    positive={true}
                    color="#F59E0B"
                    colors={colors}
                    isMobile={isMobile}
                />
                <StatCard
                    icon={<Users size={isMobile ? 16 : 18} />}
                    label="Completed"
                    value={completedOrders}
                    change="Successful data orders"
                    positive={true}
                    color="#8B5CF6"
                    colors={colors}
                    isMobile={isMobile}
                />
            </div>

            
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: isMobile ? '4px' : '8px',
                marginBottom: isMobile ? '10px' : '20px',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <QuickStat
                    label="Wallet"
                    value={`₵${walletBalance.toFixed(2)}`}
                    icon={<Wallet size={isMobile ? 14 : 16} />}
                    color="#8B5CF6"
                    colors={colors}
                    isMobile={isMobile}
                />
                <QuickStat
                    label="Completed"
                    value={completedOrders}
                    icon={<CheckCircle size={isMobile ? 14 : 16} />}
                    color="#10B981"
                    colors={colors}
                    isMobile={isMobile}
                />
                <QuickStat
                    label="Pending"
                    value={pendingOrders}
                    icon={<Clock size={isMobile ? 14 : 16} />}
                    color="#F59E0B"
                    colors={colors}
                    isMobile={isMobile}
                />
                <QuickStat
                    label="Revenue"
                    value={`₵${totalRevenue.toFixed(2)}`}
                    icon={<BarChart3 size={isMobile ? 14 : 16} />}
                    color={colors.btnBg}
                    colors={colors}
                    isMobile={isMobile}
                />
            </div>

            
            <div style={{
                backgroundColor: colors.raisedBg,
                borderRadius: isMobile ? '10px' : '14px',
                border: `1px solid ${colors.border}`,
                padding: isMobile ? '10px 12px' : '14px 16px',
                marginBottom: isMobile ? '12px' : '20px',
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
                    gap: isMobile ? '4px' : '8px',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '4px' : '8px',
                    }}>
                        <BarChart3 size={isMobile ? 14 : 18} style={{ color: colors.btnBg }} />
                        <span style={{
                            fontWeight: '600',
                            fontSize: isMobile ? '12px' : '14px',
                            color: colors.heading,
                        }}>
                            Performance Analytics
                        </span>
                    </div>
                    {chartData?.summary && (
                        <div style={{
                            display: 'flex',
                            gap: isMobile ? '6px' : '10px',
                            fontSize: isMobile ? '8px' : '10px',
                            color: colors.secondaryText,
                            flexWrap: 'wrap',
                        }}>
                            <span>Orders: <strong style={{ color: colors.text }}>{chartData.summary.total_orders || 0}</strong></span>
                            <span>Revenue: <strong style={{ color: colors.text }}>₵{Number(chartData.summary.total_revenue || 0).toFixed(2)}</strong></span>
                        </div>
                    )}
                </div>
                <div style={{
                    width: '100%',
                    minHeight: isMobile ? '140px' : '190px',
                }}>
                    {renderChart()}
                </div>
            </div>

            
            {recentOrders && recentOrders.length > 0 && (
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '10px' : '14px',
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    marginBottom: isMobile ? '12px' : '20px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        borderBottom: `1px solid ${colors.border}`,
                        flexWrap: 'wrap',
                        gap: '4px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            <Clock size={isMobile ? 14 : 16} style={{ color: colors.btnBg }} />
                            <span style={{
                                fontWeight: '600',
                                fontSize: isMobile ? '12px' : '14px',
                                color: colors.heading,
                            }}>
                                Recent Orders
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/orders')}
                            style={{
                                fontSize: isMobile ? '10px' : '12px',
                                color: colors.btnBg,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontWeight: '500',
                            }}
                        >
                            View All <ChevronRight size={isMobile ? 12 : 14} />
                        </button>
                    </div>
                    <div style={{
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '0.7fr 1fr 0.7fr 0.7fr' : '0.8fr 1.2fr 0.8fr 0.8fr',
                            padding: isMobile ? '6px 12px' : '8px 16px',
                            borderBottom: `1px solid ${colors.border}`,
                            fontSize: isMobile ? '8px' : '10px',
                            fontWeight: '600',
                            color: colors.secondaryText,
                            textTransform: 'uppercase',
                            minWidth: isMobile ? '280px' : '320px',
                        }}>
                            <span>Order</span>
                            <span>Package</span>
                            <span>Amount</span>
                            <span>Status</span>
                        </div>
                        {recentOrders.slice(0, 5).map((order) => (
                            <div
                                key={order.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '0.7fr 1fr 0.7fr 0.7fr' : '0.8fr 1.2fr 0.8fr 0.8fr',
                                    padding: isMobile ? '6px 12px' : '8px 16px',
                                    borderBottom: `1px solid ${colors.border}`,
                                    alignItems: 'center',
                                    fontSize: isMobile ? '10px' : '12px',
                                    minWidth: isMobile ? '280px' : '320px',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{
                                    fontWeight: '500',
                                    color: colors.heading,
                                    fontSize: isMobile ? '9px' : '11px',
                                }}>
                                    {order.id?.slice(0, 8) || 'N/A'}
                                </span>
                                <span style={{
                                    color: colors.text,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: isMobile ? '9px' : '12px',
                                }}>
                                    {order.package_name || order.package?.network || 'N/A'}
                                </span>
                                <span style={{
                                    fontWeight: '600',
                                    color: colors.btnBg,
                                    fontSize: isMobile ? '10px' : '12px',
                                }}>
                                    ₵{order.customer_price || '0.00'}
                                </span>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    color: getStatusColor(order.status),
                                    fontSize: isMobile ? '8px' : '10px',
                                    fontWeight: '600',
                                    textTransform: 'capitalize',
                                }}>
                                    {getStatusIcon(order.status)}
                                    {isMobile ? getStatusLabel(order.status).slice(0, 3) : getStatusLabel(order.status)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            
            <div style={{
                marginBottom: '24px',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: isMobile ? '10px' : '12px',
                    flexWrap: 'wrap',
                    gap: '8px',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}>
                        <Package size={isMobile ? 16 : 20} style={{ color: colors.btnBg }} />
                        <h2 style={{
                            fontSize: isMobile ? '16px' : '18px',
                            fontWeight: '700',
                            color: colors.heading,
                            margin: 0,
                        }}>
                            My Packages
                        </h2>
                        <span style={{
                            fontSize: isMobile ? '9px' : '11px',
                            color: colors.secondaryText,
                            background: colors.border,
                            padding: '1px 8px',
                            borderRadius: '8px',
                        }}>
                            {packages.length}
                        </span>
                    </div>
                </div>

                
                <div style={{
                    display: 'flex',
                    gap: isMobile ? '4px' : '8px',
                    marginBottom: isMobile ? '8px' : '12px',
                    flexWrap: 'wrap',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        minWidth: isMobile ? '100px' : '160px',
                    }}>
                        <Search
                            size={isMobile ? 12 : 15}
                            style={{
                                position: 'absolute',
                                left: isMobile ? '8px' : '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: colors.secondaryText,
                            }}
                        />
                        <input
                            type="text"
                            placeholder={isMobile ? "Search..." : "Search packages..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: isMobile ? '5px 8px 5px 28px' : '7px 10px 7px 32px',
                                borderRadius: '8px',
                                border: `1.5px solid ${searchQuery ? colors.btnBg : colors.border}`,
                                backgroundColor: colors.raisedBg,
                                color: colors.text,
                                fontSize: isMobile ? '11px' : '12px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                minHeight: isMobile ? '32px' : '36px',
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
                                    right: isMobile ? '4px' : '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: colors.secondaryText,
                                }}
                            >
                                <X size={isMobile ? 12 : 14} />
                            </button>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '2px',
                        padding: '2px',
                        backgroundColor: colors.raisedBg,
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`,
                    }}>
                        {networks.map((network) => (
                            <button
                                key={network}
                                onClick={() => setSelectedNetwork(network)}
                                style={{
                                    padding: isMobile ? '2px 8px' : '3px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: selectedNetwork === network ? colors.btnBg : 'transparent',
                                    color: selectedNetwork === network ? colors.btnText : colors.secondaryText,
                                    cursor: 'pointer',
                                    fontSize: isMobile ? '8px' : '10px',
                                    fontWeight: selectedNetwork === network ? '600' : '500',
                                    transition: 'all 0.2s',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {isMobile ? network.substring(0, 3) : network.toLowerCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: isMobile ? '8px' : '10px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    {filteredPackages.map((pkg) => {
                        const networkColor = getNetworkColor(pkg.network);
                        const networkBg = getNetworkBgColor(pkg.network);
                        const isOwnPrice = isUsingOwnPrice(pkg);
                        const profit = calculateProfit(pkg);
                        const hasProfit = profit > 0;
                        const agentPrice = getAgentEffectivePrice(pkg);
                        const badge = getPriceSourceBadge(pkg.priceSource, isOwnPrice);

                        return (
                            <div
                                key={pkg.id}
                                style={{
                                    backgroundColor: networkBg,
                                    borderRadius: isMobile ? '10px' : '12px',
                                    padding: isMobile ? '10px 12px' : '14px 16px',
                                    border: `1px solid ${isOwnPrice ? colors.btnBg : colors.border}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isMobile ? '4px' : '6px',
                                    transition: 'all 0.3s ease',
                                    width: '100%',
                                    boxSizing: 'border-box',
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
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                }}>
                                    <div>
                                        <div style={{
                                            fontSize: isMobile ? '9px' : '10px',
                                            fontWeight: '600',
                                            color: networkColor,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}>
                                            {pkg.network}
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? '15px' : '17px',
                                            fontWeight: '700',
                                            color: colors.heading,
                                        }}>
                                            {pkg.size}
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        flexWrap: 'wrap',
                                    }}>
                                        {pkg.salesCount > 0 && (
                                            <span style={{
                                                fontSize: isMobile ? '7px' : '8px',
                                                padding: isMobile ? '1px 6px' : '2px 8px',
                                                borderRadius: '8px',
                                                backgroundColor: `${colors.btnBg}15`,
                                                color: colors.btnBg,
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                            }}>
                                                <Zap size={isMobile ? 8 : 10} />
                                                {pkg.salesCount}
                                            </span>
                                        )}
                                        {isOwnPrice && (
                                            <span style={{
                                                fontSize: isMobile ? '7px' : '8px',
                                                padding: isMobile ? '1px 6px' : '2px 8px',
                                                borderRadius: '8px',
                                                backgroundColor: '#10B98120',
                                                color: '#10B981',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                            }}>
                                                <Sparkles size={isMobile ? 8 : 10} />
                                                Your Price
                                            </span>
                                        )}
                                    </div>
                                </div>

                                
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: isMobile ? '2px 6px' : '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: `${badge.color}15`,
                                    border: `1px solid ${badge.color}30`,
                                    width: 'fit-content',
                                }}>
                                    <Info size={isMobile ? 8 : 10} color={badge.color} />
                                    <span style={{
                                        fontSize: isMobile ? '8px' : '9px',
                                        color: badge.color,
                                        fontWeight: '500',
                                    }}>
                                        {badge.label}
                                    </span>
                                </div>

                                
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                                    gap: isMobile ? '2px' : '4px',
                                    paddingTop: isMobile ? '4px' : '6px',
                                    borderTop: `1px solid ${colors.border}`,
                                }}>
                                    <div>
                                        <div style={{
                                            fontSize: isMobile ? '7px' : '8px',
                                            color: colors.secondaryText,
                                            textTransform: 'uppercase',
                                        }}>
                                            Your Price
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? '13px' : '15px',
                                            fontWeight: '700',
                                            color: isOwnPrice ? colors.btnBg : colors.secondaryText,
                                        }}>
                                            ₵{(pkg.subAgentCustomerPrice || pkg.effectivePrice || pkg.basePriceAgent).toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{
                                            fontSize: isMobile ? '7px' : '8px',
                                            color: colors.secondaryText,
                                            textTransform: 'uppercase',
                                        }}>
                                            Agent Price
                                        </div>
                                        <div style={{
                                            fontSize: isMobile ? '11px' : '13px',
                                            fontWeight: '500',
                                            color: colors.text,
                                        }}>
                                            ₵{agentPrice.toFixed(2)}
                                        </div>
                                    </div>
                                    {!isMobile && (
                                        <div>
                                            <div style={{
                                                fontSize: isMobile ? '7px' : '8px',
                                                color: colors.secondaryText,
                                                textTransform: 'uppercase',
                                            }}>
                                                Your Profit
                                            </div>
                                            <div style={{
                                                fontSize: isMobile ? '12px' : '14px',
                                                fontWeight: '700',
                                                color: hasProfit ? '#10B981' : colors.secondaryText,
                                            }}>
                                                {isOwnPrice ? (
                                                    hasProfit ? `₵${profit.toFixed(2)}` : '₵0.00'
                                                ) : (
                                                    <span style={{ opacity: 0.5 }}>—</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isOwnPrice ? '1fr 1fr' : '1fr',
                                    gap: isMobile ? '4px' : '6px',
                                    marginTop: '2px',
                                }}>
                                    <button
                                        onClick={() => handleEditPrice(pkg)}
                                        disabled={!pkg.canEdit}
                                        style={{
                                            padding: isMobile ? '4px 8px' : '5px 10px',
                                            borderRadius: '6px',
                                            border: `1px solid ${pkg.canEdit ? colors.btnBg : colors.border}`,
                                            backgroundColor: 'transparent',
                                            color: pkg.canEdit ? colors.btnBg : colors.secondaryText,
                                            cursor: pkg.canEdit ? 'pointer' : 'not-allowed',
                                            fontSize: isMobile ? '9px' : '11px',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '3px',
                                            transition: 'all 0.2s',
                                            opacity: pkg.canEdit ? 1 : 0.6,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (pkg.canEdit) {
                                                e.currentTarget.style.background = colors.btnBg;
                                                e.currentTarget.style.color = colors.btnText;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (pkg.canEdit) {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = colors.btnBg;
                                            }
                                        }}
                                    >
                                        <Edit2 size={isMobile ? 11 : 13} />
                                        {isOwnPrice ? 'Edit Price' : 'Set Price'}
                                    </button>

                                    {isOwnPrice && pkg.pricingId && (
                                        <button
                                            onClick={() => handleRemoveCustomPrice(pkg)}
                                            disabled={removingPrice === pkg.id}
                                            style={{
                                                padding: isMobile ? '4px 8px' : '5px 10px',
                                                borderRadius: '6px',
                                                border: `1px solid ${colors.error}`,
                                                backgroundColor: 'transparent',
                                                color: colors.error,
                                                cursor: removingPrice === pkg.id ? 'not-allowed' : 'pointer',
                                                fontSize: isMobile ? '9px' : '11px',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '3px',
                                                transition: 'all 0.2s',
                                                opacity: removingPrice === pkg.id ? 0.6 : 1,
                                            }}
                                            onMouseEnter={(e) => {
                                                if (removingPrice !== pkg.id) {
                                                    e.currentTarget.style.background = colors.error;
                                                    e.currentTarget.style.color = '#fff';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (removingPrice !== pkg.id) {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = colors.error;
                                                }
                                            }}
                                        >
                                            {removingPrice === pkg.id ? (
                                                <>
                                                    <Loader2 size={isMobile ? 10 : 12} style={{ animation: 'spin 1s linear infinite' }} />
                                                    Removing...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={isMobile ? 11 : 13} />
                                                    Remove
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                
                                {isMobile && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        paddingTop: isMobile ? '4px' : '6px',
                                        borderTop: `1px solid ${colors.border}`,
                                        fontSize: isMobile ? '10px' : '12px',
                                    }}>
                                        <span style={{ color: colors.secondaryText }}>Your Profit</span>
                                        <span style={{
                                            fontWeight: '700',
                                            color: hasProfit && isOwnPrice ? '#10B981' : colors.secondaryText,
                                        }}>
                                            {isOwnPrice ? (
                                                hasProfit ? `₵${profit.toFixed(2)}` : '₵0.00'
                                            ) : (
                                                <span style={{ opacity: 0.5 }}>N/A</span>
                                            )}
                                        </span>
                                    </div>
                                )}

                                
                                {!isOwnPrice && (
                                    <div style={{
                                        fontSize: isMobile ? '8px' : '9px',
                                        color: colors.secondaryText,
                                        opacity: 0.6,
                                        borderTop: `1px solid ${colors.border}`,
                                        marginTop: '2px',
                                        paddingTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}>
                                        <Info size={isMobile ? 10 : 12} />
                                        Using agent's price • Set your own price to earn profit
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filteredPackages.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: isMobile ? '20px 16px' : '30px 20px',
                        color: colors.secondaryText,
                        backgroundColor: colors.raisedBg,
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`,
                    }}>
                        <Package size={isMobile ? 24 : 32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                        <div style={{ fontSize: isMobile ? '13px' : '14px' }}>No packages found matching your criteria</div>
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
                        borderRadius: isMobile ? '14px' : '16px',
                        maxWidth: '400px',
                        width: '100%',
                        padding: isMobile ? '16px 18px 20px' : '20px 24px 24px',
                        boxShadow: `0 20px 60px ${colors.shadow}`,
                        animation: 'slideUp 0.25s ease',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: isMobile ? '12px' : '16px',
                        }}>
                            <h3 style={{
                                fontSize: isMobile ? '15px' : '17px',
                                fontWeight: '700',
                                color: colors.heading,
                                margin: 0,
                            }}>
                                {editingPackage.hasCustomPrice ? 'Edit Your Price' : 'Set Your Price'}
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
                                <X size={isMobile ? 18 : 20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: isMobile ? '10px' : '14px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px',
                                flexWrap: 'wrap',
                            }}>
                                <span style={{
                                    fontSize: isMobile ? '10px' : '12px',
                                    fontWeight: '600',
                                    color: getNetworkColor(editingPackage.network),
                                    textTransform: 'uppercase',
                                }}>
                                    {editingPackage.network}
                                </span>
                                <span style={{ color: colors.secondaryText }}>•</span>
                                <span style={{
                                    fontSize: isMobile ? '13px' : '15px',
                                    fontWeight: '700',
                                    color: colors.heading,
                                }}>
                                    {editingPackage.size}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                fontSize: isMobile ? '10px' : '12px',
                                color: colors.secondaryText,
                            }}>
                                <span>Agent Effective Price: <strong style={{ color: colors.text }}>₵{getAgentEffectivePrice(editingPackage).toFixed(2)}</strong></span>
                                {editingPackage.agentSubCustomPrice && (
                                    <span>Agent Custom Price: <strong style={{ color: '#8B5CF6' }}>₵{editingPackage.agentSubCustomPrice.toFixed(2)}</strong></span>
                                )}
                                {editingPackage.agentSubBasePrice && (
                                    <span>Agent Base Price: <strong style={{ color: '#3B82F6' }}>₵{editingPackage.agentSubBasePrice.toFixed(2)}</strong></span>
                                )}
                                {editingPackage.hasCustomPrice && (
                                    <span>Current Your Price: <strong style={{ color: colors.btnBg }}>₵{editingPackage.subAgentCustomerPrice.toFixed(2)}</strong></span>
                                )}
                            </div>
                            <div style={{
                                marginTop: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                backgroundColor: colors.mainBg,
                                fontSize: isMobile ? '9px' : '11px',
                                color: colors.secondaryText,
                            }}>
                                <strong>Min Price:</strong> ₵{getAgentEffectivePrice(editingPackage).toFixed(2)}
                                {!editingPackage.hasCustomPrice && (
                                    <span style={{ display: 'block', marginTop: '2px', color: '#10B981', fontSize: isMobile ? '8px' : '10px' }}>
                                        💡 Set your own price to earn profit on each sale
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: isMobile ? '12px' : '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: isMobile ? '11px' : '13px',
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: '4px',
                            }}>
                                Your Selling Price
                            </label>
                            <div style={{
                                position: 'relative',
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    left: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: colors.secondaryText,
                                    fontWeight: '600',
                                    fontSize: isMobile ? '13px' : '15px',
                                }}>
                                    ₵
                                </span>
                                <input
                                    type="number"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value)}
                                    min={getAgentEffectivePrice(editingPackage)}
                                    step="0.01"
                                    placeholder={`Min: ₵${getAgentEffectivePrice(editingPackage).toFixed(2)}`}
                                    style={{
                                        width: '100%',
                                        padding: isMobile ? '7px 10px 7px 26px' : '9px 12px 9px 30px',
                                        borderRadius: '8px',
                                        border: `1.5px solid ${colors.border}`,
                                        backgroundColor: colors.raisedBg,
                                        color: colors.text,
                                        fontSize: isMobile ? '13px' : '15px',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        boxSizing: 'border-box',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = colors.btnBg}
                                    onBlur={(e) => e.target.style.borderColor = colors.border}
                                    autoFocus
                                />
                            </div>
                            <div style={{
                                fontSize: isMobile ? '9px' : '11px',
                                color: colors.secondaryText,
                                marginTop: '2px',
                            }}>
                                {editingPackage.hasCustomPrice ? (
                                    <>Your profit per sale: ₵{newPrice ? (Number(newPrice) - getAgentEffectivePrice(editingPackage)).toFixed(2) : '0.00'}</>
                                ) : (
                                    <>Set your price to earn profit • Current: ₵0.00 profit</>
                                )}
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1.5fr',
                            gap: isMobile ? '6px' : '10px',
                        }}>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingPackage(null);
                                    setNewPrice('');
                                }}
                                style={{
                                    padding: isMobile ? '7px' : '9px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: 'transparent',
                                    color: colors.text,
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: isMobile ? '11px' : '13px',
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
                                    padding: isMobile ? '7px' : '9px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: colors.btnBg,
                                    color: '#fff',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: isMobile ? '11px' : '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s',
                                    opacity: isSubmitting ? 0.7 : 1,
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="spinner-small" style={{
                                            width: '12px',
                                            height: '12px',
                                            border: `2px solid #fff40`,
                                            borderTop: `2px solid #fff`,
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                        }} />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={isMobile ? 14 : 16} />
                                        {editingPackage.hasCustomPrice ? 'Update Price' : 'Set Price'}
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

const StatCard = ({ icon, label, value, change, positive, color, colors, isMobile }) => (
    <div style={{
        backgroundColor: colors.raisedBg,
        borderRadius: isMobile ? '8px' : '12px',
        padding: isMobile ? '8px 10px' : '14px 16px',
        border: `1px solid ${colors.border}`,
        transition: 'all 0.3s ease',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    }}
    onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 6px 20px ${colors.shadow}`;
    }}
    onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
    }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isMobile ? '2px' : '3px',
            width: '100%',
        }}>
            <span style={{
                fontSize: isMobile ? '8px' : '11px',
                color: colors.secondaryText,
                fontWeight: '500',
                whiteSpace: 'nowrap',
            }}>
                {label}
            </span>
            <span style={{
                color: color,
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
            }}>
                {icon}
            </span>
        </div>
        <div style={{
            fontSize: isMobile ? 'clamp(14px, 4vw, 18px)' : 'clamp(18px, 2vw, 22px)',
            fontWeight: '700',
            color: colors.heading,
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        }}>
            {value}
        </div>
        {change && (
            <div style={{
                fontSize: isMobile ? '8px' : '10px',
                color: positive ? '#10B981' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                marginTop: isMobile ? '1px' : '2px',
            }}>
                {positive ? <ArrowUp size={isMobile ? 10 : 12} /> : <ArrowDown size={isMobile ? 10 : 12} />}
                {change}
            </div>
        )}
    </div>
);

const QuickStat = ({ label, value, icon, color, colors, isMobile }) => (
    <div style={{
        backgroundColor: colors.raisedBg,
        borderRadius: isMobile ? '6px' : '10px',
        padding: isMobile ? '5px 8px' : '10px 14px',
        border: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
    }}>
        <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
                fontSize: isMobile ? '7px' : '10px',
                color: colors.secondaryText,
                fontWeight: '500',
                whiteSpace: 'nowrap',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: isMobile ? 'clamp(12px, 3.5vw, 16px)' : '15px',
                fontWeight: '700',
                color: colors.heading,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {value}
            </div>
        </div>
        <span style={{
            color: color,
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            marginLeft: '8px',
        }}>
            {icon}
        </span>
    </div>
);

export default SubAgentDashboard;



