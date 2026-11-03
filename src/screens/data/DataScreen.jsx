import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { Search, X, Lock, UserPlus, TrendingUp, Clock, Award, Flame, Wifi, Zap, CheckCircle, ChevronDown, Filter, SortAsc, SortDesc, Grid, List, Eye, ArrowUpDown, ShieldCheck } from 'lucide-react';
import DataPackageCard from '../../components/DataPackageCard';

const DataScreen = () => {
    const { colors } = useTheme();
    const { isAuthenticated, authFetch } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNetwork, setSelectedNetwork] = useState('All');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('popular');
    const [sortOrder, setSortOrder] = useState('desc');
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const [priceRange, setPriceRange] = useState({ min: 0, max: 200 });
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [tempFilters, setTempFilters] = useState({
        network: 'All',
        priceRange: { min: 0, max: 200 },
        sizes: []
    });

    const sortDropdownRef = useRef(null);
    const networkDropdownRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const networks = [
        { id: 'All', name: 'All Networks', color: colors.secondaryText, icon: Wifi },
        { id: 'MTN_EXPRESS', name: 'MTN Express', color: '#FFD700', icon: Wifi },
        { id: 'MTN', name: 'MTN', color: '#FFD700', icon: Wifi },
        { id: 'Telecel', name: 'Telecel', color: '#ff0000', icon: Wifi },
        { id: 'AirtelTigo', name: 'AirtelTigo', color: '#4200f8', icon: Wifi },
    ];

    const sortOptions = [
        { id: 'popular', label: 'Most Popular', icon: Flame },
        { id: 'price', label: 'Price: Low to High', icon: TrendingUp },
        { id: 'price-desc', label: 'Price: High to Low', icon: TrendingUp },
        { id: 'network', label: 'Network', icon: Wifi },
        { id: 'size', label: 'Data Size', icon: ArrowUpDown },
    ];

    useEffect(() => {
        fetchPackages();
        loadFavorites();
        loadRecentlyViewed();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setIsSortDropdownOpen(false);
            }
            if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target)) {
                setIsNetworkDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await authFetch('/data/packages/');
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                const transformedPackages = data.data.map(pkg => ({
                    id: pkg.id,
                    network: pkg.network,
                    size: `${pkg.size_gb}GB`,
                    price: parseFloat(pkg.effective_price || pkg.base_price_customer),
                    priceDisplay: `₵${parseFloat(pkg.effective_price || pkg.base_price_customer).toFixed(2)}`,
                    originalPrice: pkg.base_price_customer ? parseFloat(pkg.base_price_customer) : null,
                    validity: '30 Days',
                    popular: pkg.is_popular || false,
                    price_source: pkg.price_source || 'base',
                    is_active: pkg.is_active,
                    network_color: networks.find(n => n.id === pkg.network)?.color || colors.linkColor,
                }));
                setPackages(transformedPackages);
            } else {
                showToast(data.message || 'Failed to fetch packages', 'error');
            }
        } catch (error) {
            console.error('Error fetching packages:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadFavorites = () => {
        try {
            const saved = localStorage.getItem('data_favorites');
            if (saved) setFavorites(JSON.parse(saved));
        } catch (e) {}
    };

    const loadRecentlyViewed = () => {
        try {
            const saved = localStorage.getItem('data_recently_viewed');
            if (saved) setRecentlyViewed(JSON.parse(saved));
        } catch (e) {}
    };

    const toggleFavorite = (pkgId) => {
        const newFavorites = favorites.includes(pkgId)
            ? favorites.filter(id => id !== pkgId)
            : [...favorites, pkgId];
        setFavorites(newFavorites);
        localStorage.setItem('data_favorites', JSON.stringify(newFavorites));
    };

    const addRecentlyViewed = (pkg) => {
        const updated = [pkg.id, ...recentlyViewed.filter(id => id !== pkg.id)].slice(0, 5);
        setRecentlyViewed(updated);
        localStorage.setItem('data_recently_viewed', JSON.stringify(updated));
    };

    const availableSizes = useMemo(() => {
        const sizes = new Set(packages.map(pkg => pkg.size));
        return Array.from(sizes).sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            return aNum - bNum;
        });
    }, [packages]);

    const filteredPackages = useMemo(() => {
        let filtered = packages.filter(pkg => {
            const matchesNetwork = selectedNetwork === 'All' || pkg.network === selectedNetwork;
            const matchesSearch = pkg.size.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pkg.network.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesPrice = pkg.price >= priceRange.min && pkg.price <= priceRange.max;
            const matchesSize = selectedSizes.length === 0 || selectedSizes.includes(pkg.size);
            return matchesNetwork && matchesSearch && matchesPrice && matchesSize;
        });

        switch (sortBy) {
            case 'popular':
                filtered.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
                break;
            case 'price':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'network':
                filtered.sort((a, b) => a.network.localeCompare(b.network));
                break;
            case 'size':
                filtered.sort((a, b) => {
                    const aNum = parseInt(a.size);
                    const bNum = parseInt(b.size);
                    return aNum - bNum;
                });
                break;
            default:
                break;
        }

        if (sortOrder === 'desc' && sortBy === 'price') {
            filtered.reverse();
        }

        return filtered;
    }, [packages, selectedNetwork, searchQuery, priceRange, selectedSizes, sortBy, sortOrder]);

    const handleApplyFilters = () => {
        setSelectedNetwork(tempFilters.network);
        setPriceRange(tempFilters.priceRange);
        setSelectedSizes(tempFilters.sizes);
        setIsFilterModalOpen(false);
    };

    const handleClearFilters = () => {
        setSelectedNetwork('All');
        setPriceRange({ min: 0, max: 200 });
        setSelectedSizes([]);
        setSearchQuery('');
        setSortBy('popular');
        setSortOrder('desc');
    };

    const handleSizeToggle = (size) => {
        setTempFilters(prev => ({
            ...prev,
            sizes: prev.sizes.includes(size)
                ? prev.sizes.filter(s => s !== size)
                : [...prev.sizes, size]
        }));
    };

    const handlePackageClick = (pkg) => {
        if (!isAuthenticated) {
            setSelectedPackage(pkg);
            setShowAuthModal(true);
            return;
        }
        addRecentlyViewed(pkg);
        navigate(`/data/purchase/${pkg.id}`);
    };

    const hasActiveFilters = selectedNetwork !== 'All' || selectedSizes.length > 0 ||
        priceRange.min > 0 || priceRange.max < 200 || searchQuery.length > 0;

    const activeFilterCount = [selectedNetwork !== 'All', selectedSizes.length > 0,
        priceRange.min > 0 || priceRange.max < 200, searchQuery.length > 0
    ].filter(Boolean).length;

    const getSortLabel = () => {
        const option = sortOptions.find(o => o.id === sortBy);
        return option ? option.label : 'Sort';
    };

    const getNetworkColor = (networkId) => {
        const network = networks.find(n => n.id === networkId);
        return network?.color || colors.secondaryText;
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '500px',
                gap: '20px',
            }}>
                <div className="spinner" style={{
                    width: '48px',
                    height: '48px',
                    border: `3px solid ${colors.border}`,
                    borderTop: `3px solid ${colors.btnBg}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <p style={{ color: colors.secondaryText, fontSize: '14px' }}>
                    Loading amazing data packages...
                </p>
            </div>
        );
    }

    return (
        <>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 12px 24px',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
            }}>
                
                <div style={{
                    background: `linear-gradient(135deg, ${colors.btnBg}15, ${colors.btnBg}05)`,
                    borderRadius: '20px',
                    padding: isMobile ? '16px 18px' : '24px 28px',
                    marginBottom: '20px',
                    border: `1px solid ${colors.btnBg}20`,
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: -80,
                        right: -80,
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${colors.btnBg}15 0%, transparent 70%)`,
                    }} />
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative',
                        zIndex: 1,
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                        }}>
                            <h1 style={{
                                fontSize: isMobile ? '22px' : 'clamp(24px, 3vw, 32px)',
                                fontWeight: '800',
                                color: colors.heading,
                                margin: 0,
                                letterSpacing: '-0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <Wifi size={isMobile ? 20 : 28} color={colors.btnBg} />
                                Data Packages
                            </h1>
                            <span style={{
                                fontSize: isMobile ? '10px' : '11px',
                                fontWeight: '600',
                                color: colors.btnText,
                                background: colors.btnBg,
                                padding: '2px 10px',
                                borderRadius: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}>
                                <Zap size={isMobile ? 10 : 12} />
                                {packages.length} Packages
                            </span>
                        </div>
                        <p style={{
                            color: colors.secondaryText,
                            margin: 0,
                            fontSize: isMobile ? '13px' : '14px',
                        }}>
                            Compare and buy data bundles from all major networks at the best prices
                        </p>
                    </div>
                </div>

                
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '10px',
                    marginBottom: '16px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    {[
                        { icon: <Wifi size={isMobile ? 14 : 16} color={colors.linkColor} />, label: 'Networks', value: '3+' },
                        { icon: <Clock size={isMobile ? 14 : 16} color={colors.warning} />, label: 'Instant Delivery', value: '24/7' },
                        { icon: <Award size={isMobile ? 14 : 16} color={colors.success} />, label: 'Best Price', value: 'Guaranteed' },
                        { icon: <CheckCircle size={isMobile ? 14 : 16} color={colors.success} />, label: 'Reliable', value: '100%' },
                    ].map((stat, idx) => (
                        <div key={idx} style={{
                            backgroundColor: colors.raisedBg,
                            padding: isMobile ? '10px 12px' : '12px 16px',
                            borderRadius: '12px',
                            border: `1px solid ${colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: 0,
                        }}>
                            {stat.icon}
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: isMobile ? '14px' : '13px', fontWeight: '600', color: colors.heading }}>
                                    {stat.value}
                                </div>
                                <div style={{ fontSize: isMobile ? '9px' : '10px', color: colors.secondaryText }}>
                                    {stat.label}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginBottom: '14px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        width: '100%',
                        boxSizing: 'border-box',
                        flexWrap: 'wrap',
                    }}>
                        
                        <div style={{
                            flex: isMobile ? '1 1 100%' : '1 1 0',
                            minWidth: isMobile ? '100%' : '180px',
                            position: 'relative',
                        }}>
                            <Search
                                size={isMobile ? 16 : 18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: colors.secondaryText,
                                    pointerEvents: 'none',
                                }}
                            />
                            <input
                                type="text"
                                placeholder={isMobile ? "Search packages..." : "Search packages by size, network..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: isMobile ? '8px 32px 8px 38px' : '10px 40px 10px 44px',
                                    borderRadius: '12px',
                                    border: `1.5px solid ${searchQuery ? colors.btnBg : colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    fontSize: isMobile ? '14px' : '14px',
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    boxSizing: 'border-box',
                                    minHeight: isMobile ? '40px' : '44px',
                                    boxShadow: searchQuery ? `0 0 0 3px ${colors.btnBg}20` : 'none',
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: colors.secondaryText,
                                        padding: '4px',
                                        borderRadius: '4px',
                                    }}
                                >
                                    <X size={isMobile ? 14 : 16} />
                                </button>
                            )}
                        </div>

                        
                        <button
                            onClick={() => setIsFilterModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: isMobile ? '8px 12px' : '10px 16px',
                                borderRadius: '12px',
                                border: `1.5px solid ${hasActiveFilters ? colors.btnBg : colors.border}`,
                                backgroundColor: hasActiveFilters ? colors.btnBg : colors.raisedBg,
                                color: hasActiveFilters ? colors.btnText : colors.text,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                fontSize: isMobile ? '12px' : '13px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                position: 'relative',
                                flexShrink: 0,
                                minHeight: isMobile ? '40px' : '44px',
                                boxShadow: hasActiveFilters ? `0 4px 12px ${colors.btnBg}33` : 'none',
                            }}
                        >
                            <Filter size={isMobile ? 16 : 18} />
                            {!isMobile && <span>Filter</span>}
                            {hasActiveFilters && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-6px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: colors.error,
                                    color: '#fff',
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        
                        <div style={{
                            display: 'flex',
                            borderRadius: '10px',
                            border: `1.5px solid ${colors.border}`,
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: isMobile ? '6px 10px' : '8px 12px',
                                    background: viewMode === 'grid' ? colors.btnBg : 'transparent',
                                    color: viewMode === 'grid' ? colors.btnText : colors.text,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    minHeight: isMobile ? '36px' : '40px',
                                }}
                            >
                                <Grid size={isMobile ? 16 : 18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: isMobile ? '6px 10px' : '8px 12px',
                                    background: viewMode === 'list' ? colors.btnBg : 'transparent',
                                    color: viewMode === 'list' ? colors.btnText : colors.text,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    minHeight: isMobile ? '36px' : '40px',
                                }}
                            >
                                <List size={isMobile ? 16 : 18} />
                            </button>
                        </div>
                    </div>

                    
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}>
                        
                        <div ref={networkDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                            <button
                                onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: isMobile ? '6px 12px' : '8px 14px',
                                    borderRadius: '10px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    cursor: 'pointer',
                                    fontSize: isMobile ? '12px' : '13px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    minHeight: isMobile ? '36px' : '40px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <Wifi size={isMobile ? 14 : 16} color={getNetworkColor(selectedNetwork)} />
                                {isMobile ? (selectedNetwork === 'All' ? 'All' : selectedNetwork) : (selectedNetwork === 'All' ? 'All Networks' : selectedNetwork)}
                                <ChevronDown size={isMobile ? 12 : 14} style={{
                                    transition: 'transform 0.3s ease',
                                    transform: isNetworkDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                }} />
                            </button>

                            {isNetworkDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: 0,
                                    minWidth: isMobile ? '140px' : '180px',
                                    backgroundColor: colors.raisedBg,
                                    borderRadius: '12px',
                                    border: `1px solid ${colors.border}`,
                                    boxShadow: `0 8px 32px ${colors.shadow}`,
                                    padding: '6px',
                                    zIndex: 50,
                                }}>
                                    {networks.map((network) => {
                                        const Icon = network.icon;
                                        const isActive = selectedNetwork === network.id;
                                        return (
                                            <button
                                                key={network.id}
                                                onClick={() => {
                                                    setSelectedNetwork(network.id);
                                                    setIsNetworkDropdownOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: isMobile ? '6px 12px' : '8px 14px',
                                                    borderRadius: '8px',
                                                    background: isActive ? `${colors.btnBg}15` : 'transparent',
                                                    color: isActive ? colors.btnBg : colors.text,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: isMobile ? '12px' : '13px',
                                                    fontWeight: isActive ? '600' : '500',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) e.currentTarget.style.background = colors.hoverBg;
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <Icon size={isMobile ? 14 : 16} color={network.color} />
                                                {isMobile ? network.name.replace(' Networks', '') : network.name}
                                                {isActive && <CheckCircle size={isMobile ? 12 : 14} style={{ marginLeft: 'auto' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        
                        <div ref={sortDropdownRef} style={{ position: 'relative', flexShrink: 0, marginLeft: 'auto' }}>
                            <button
                                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: isMobile ? '6px 12px' : '8px 14px',
                                    borderRadius: '10px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    cursor: 'pointer',
                                    fontSize: isMobile ? '12px' : '13px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                    minHeight: isMobile ? '36px' : '40px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <ArrowUpDown size={isMobile ? 14 : 16} />
                                {isMobile ? (
                                    <span>{getSortLabel().split(':')[0]}</span>
                                ) : (
                                    <span>{getSortLabel()}</span>
                                )}
                                <ChevronDown size={isMobile ? 12 : 14} style={{
                                    transition: 'transform 0.3s ease',
                                    transform: isSortDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                }} />
                            </button>

                            {isSortDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    right: 0,
                                    minWidth: isMobile ? '160px' : '200px',
                                    backgroundColor: colors.raisedBg,
                                    borderRadius: '12px',
                                    border: `1px solid ${colors.border}`,
                                    boxShadow: `0 8px 32px ${colors.shadow}`,
                                    padding: '6px',
                                    zIndex: 50,
                                }}>
                                    {sortOptions.map((option) => {
                                        const Icon = option.icon;
                                        const isActive = sortBy === option.id;
                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => {
                                                    setSortBy(option.id);
                                                    if (option.id === 'price') {
                                                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                    }
                                                    setIsSortDropdownOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: isMobile ? '6px 12px' : '8px 14px',
                                                    borderRadius: '8px',
                                                    background: isActive ? `${colors.btnBg}15` : 'transparent',
                                                    color: isActive ? colors.btnBg : colors.text,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: isMobile ? '12px' : '13px',
                                                    fontWeight: isActive ? '600' : '500',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) e.currentTarget.style.background = colors.hoverBg;
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <Icon size={isMobile ? 14 : 16} />
                                                {isMobile ? option.label.split(':')[0] : option.label}
                                                {isActive && (
                                                    <span style={{ marginLeft: 'auto' }}>
                                                        {sortOrder === 'asc' ? <SortAsc size={isMobile ? 12 : 14} /> : <SortDesc size={isMobile ? 12 : 14} />}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '6px',
                }}>
                    <span style={{
                        fontSize: isMobile ? '12px' : '14px',
                        color: colors.secondaryText,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <Eye size={isMobile ? 14 : 16} />
                        Showing <strong style={{ color: colors.text }}>{filteredPackages.length}</strong> package{filteredPackages.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {recentlyViewed.length > 0 && !isMobile && (
                            <span style={{
                                fontSize: '11px',
                                color: colors.secondaryText,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}>
                                <Clock size={12} />
                                Recently viewed: {recentlyViewed.length}
                            </span>
                        )}
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                style={{
                                    fontSize: isMobile ? '11px' : '13px',
                                    color: colors.btnBg,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = `${colors.btnBg}15`}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                
                {filteredPackages.length > 0 ? (
                    <div style={{
                        display: viewMode === 'grid'
                            ? 'grid'
                            : 'flex',
                        gridTemplateColumns: viewMode === 'grid'
                            ? `repeat(auto-fill, minmax(${isMobile ? '140px' : '160px'}, 1fr))`
                            : 'none',
                        flexDirection: viewMode === 'list' ? 'column' : 'none',
                        gap: viewMode === 'grid' ? '12px' : '10px',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}>
                        {filteredPackages.map((pkg) => (
                            <DataPackageCard
                                key={pkg.id}
                                package={pkg}
                                network={pkg.network}
                                onClick={() => handlePackageClick(pkg)}
                                showPriceSource={!!pkg.price_source && pkg.price_source !== 'base'}
                                isFavorite={favorites.includes(pkg.id)}
                                onToggleFavorite={() => toggleFavorite(pkg.id)}
                                viewMode={viewMode}
                            />
                        ))}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: isMobile ? '40px 16px' : '60px 20px',
                        backgroundColor: colors.raisedBg,
                        borderRadius: '16px',
                        border: `1px solid ${colors.border}`,
                        width: '100%',
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            fontSize: isMobile ? '40px' : '56px',
                            marginBottom: '12px',
                            opacity: 0.5,
                        }}>
                            📡
                        </div>
                        <h3 style={{
                            fontSize: isMobile ? '18px' : '20px',
                            fontWeight: '600',
                            color: colors.heading,
                            margin: '0 0 6px 0',
                        }}>
                            No packages found
                        </h3>
                        <p style={{
                            margin: '0 0 16px 0',
                            fontSize: isMobile ? '13px' : '14px',
                            color: colors.secondaryText,
                        }}>
                            Try adjusting your search or filter criteria
                        </p>
                        <button
                            onClick={handleClearFilters}
                            style={{
                                padding: isMobile ? '8px 20px' : '10px 28px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: colors.btnBg,
                                color: colors.btnText,
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: isMobile ? '13px' : '14px',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            
            {showAuthModal && selectedPackage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1001,
                        padding: '16px',
                        animation: 'fadeIn 0.3s ease',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAuthModal(false);
                            setSelectedPackage(null);
                        }
                    }}
                >
                    <div style={{
                        backgroundColor: colors.raisedBg,
                        borderRadius: '24px',
                        maxWidth: '420px',
                        width: '100%',
                        padding: isMobile ? '28px 20px' : '36px 28px',
                        boxShadow: `0 24px 80px ${colors.shadow}`,
                        animation: 'slideUp 0.4s ease',
                        textAlign: 'center',
                        border: `1px solid ${colors.border}`,
                        boxSizing: 'border-box',
                    }}>
                        <div style={{
                            width: isMobile ? '64px' : '80px',
                            height: isMobile ? '64px' : '80px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${colors.btnBg}20, ${colors.btnBg}10)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            color: colors.btnBg,
                        }}>
                            <Lock size={isMobile ? 28 : 36} />
                        </div>

                        <h2 style={{
                            fontSize: isMobile ? '20px' : '22px',
                            fontWeight: '700',
                            color: colors.heading,
                            margin: '0 0 6px 0',
                        }}>
                            Sign in to Purchase
                        </h2>
                        <p style={{
                            fontSize: isMobile ? '13px' : '14px',
                            color: colors.secondaryText,
                            margin: '0 0 4px 0',
                            lineHeight: '1.6',
                        }}>
                            To purchase <strong style={{ color: colors.text }}>{selectedPackage.size}</strong> from <strong style={{ color: colors.text }}>{selectedPackage.network}</strong>
                        </p>
                        <p style={{
                            fontSize: isMobile ? '18px' : '20px',
                            fontWeight: '700',
                            color: colors.btnBg,
                            margin: '6px 0 16px 0',
                        }}>
                            {selectedPackage.priceDisplay}
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                        }}>
                            <button
                                onClick={() => {
                                    setShowAuthModal(false);
                                    setSelectedPackage(null);
                                    navigate('/login', { state: { from: '/data', packageId: selectedPackage.id } });
                                }}
                                style={{
                                    width: '100%',
                                    padding: isMobile ? '12px' : '14px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: `linear-gradient(135deg, ${colors.btnBg}, ${colors.btnBg}88)`,
                                    color: '#fff',
                                    fontSize: isMobile ? '15px' : '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: `0 4px 16px ${colors.btnBg}44`,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <UserPlus size={isMobile ? 18 : 20} />
                                Sign In / Create Account
                            </button>

                            <button
                                onClick={() => {
                                    setShowAuthModal(false);
                                    setSelectedPackage(null);
                                }}
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
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Continue Browsing
                            </button>
                        </div>

                        <div style={{
                            marginTop: '14px',
                            fontSize: isMobile ? '11px' : '12px',
                            color: colors.secondaryText,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                        }}>
                            <ShieldCheck size={isMobile ? 12 : 14} />
                            Secure checkout • Instant delivery
                        </div>
                    </div>
                </div>
            )}

            
            {isFilterModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.2s ease',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsFilterModalOpen(false);
                        }
                    }}
                >
                    <div
                        style={{
                            backgroundColor: colors.raisedBg,
                            borderRadius: '24px 24px 0 0',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            padding: isMobile ? '20px 16px 24px' : '24px 24px 32px',
                            boxShadow: `0 -20px 60px ${colors.shadow}`,
                            animation: 'slideUpBottom 0.35s ease',
                            boxSizing: 'border-box',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                        }}>
                            <h2 style={{
                                fontSize: isMobile ? '18px' : '20px',
                                fontWeight: '700',
                                color: colors.heading,
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <Filter size={isMobile ? 18 : 20} color={colors.btnBg} />
                                Filter Packages
                            </h2>
                            <button
                                onClick={() => setIsFilterModalOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: colors.secondaryText,
                                    padding: '6px',
                                    borderRadius: '8px',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <X size={isMobile ? 18 : 20} />
                            </button>
                        </div>

                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: isMobile ? '13px' : '14px',
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: '6px',
                            }}>
                                Network
                            </label>
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                flexWrap: 'wrap',
                            }}>
                                {networks.map((network) => {
                                    const Icon = network.icon;
                                    const isActive = tempFilters.network === network.id;
                                    return (
                                        <button
                                            key={network.id}
                                            onClick={() => setTempFilters(prev => ({
                                                ...prev,
                                                network: network.id
                                            }))}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: isMobile ? '6px 12px' : '8px 16px',
                                                borderRadius: '10px',
                                                border: `2px solid ${isActive ? colors.btnBg : colors.border}`,
                                                backgroundColor: isActive ? colors.btnBg : 'transparent',
                                                color: isActive ? colors.btnText : colors.text,
                                                cursor: 'pointer',
                                                fontSize: isMobile ? '12px' : '13px',
                                                fontWeight: isActive ? '600' : '500',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <Icon size={isMobile ? 12 : 14} color={isActive ? colors.btnText : network.color} />
                                            {isMobile ? network.name.replace(' Networks', '') : network.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px',
                            }}>
                                <label style={{
                                    fontSize: isMobile ? '13px' : '14px',
                                    fontWeight: '600',
                                    color: colors.text,
                                }}>
                                    Price Range
                                </label>
                                <span style={{
                                    fontSize: isMobile ? '12px' : '13px',
                                    fontWeight: '600',
                                    color: colors.btnBg,
                                }}>
                                    ₵{tempFilters.priceRange.min} - ₵{tempFilters.priceRange.max}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'center',
                                padding: '4px 0',
                            }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={tempFilters.priceRange.min}
                                    onChange={(e) => setTempFilters(prev => ({
                                        ...prev,
                                        priceRange: {
                                            ...prev.priceRange,
                                            min: parseInt(e.target.value)
                                        }
                                    }))}
                                    style={{
                                        flex: 1,
                                        height: '4px',
                                        borderRadius: '2px',
                                        backgroundColor: colors.border,
                                        outline: 'none',
                                        WebkitAppearance: 'none',
                                    }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={tempFilters.priceRange.max}
                                    onChange={(e) => setTempFilters(prev => ({
                                        ...prev,
                                        priceRange: {
                                            ...prev.priceRange,
                                            max: parseInt(e.target.value)
                                        }
                                    }))}
                                    style={{
                                        flex: 1,
                                        height: '4px',
                                        borderRadius: '2px',
                                        backgroundColor: colors.border,
                                        outline: 'none',
                                        WebkitAppearance: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: isMobile ? '13px' : '14px',
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: '6px',
                            }}>
                                Data Size
                            </label>
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                flexWrap: 'wrap',
                            }}>
                                {availableSizes.map((size) => {
                                    const isActive = tempFilters.sizes.includes(size);
                                    return (
                                        <button
                                            key={size}
                                            onClick={() => handleSizeToggle(size)}
                                            style={{
                                                padding: isMobile ? '6px 12px' : '8px 16px',
                                                borderRadius: '10px',
                                                border: `2px solid ${isActive ? colors.btnBg : colors.border}`,
                                                backgroundColor: isActive ? colors.btnBg : 'transparent',
                                                color: isActive ? colors.btnText : colors.text,
                                                cursor: 'pointer',
                                                fontSize: isMobile ? '12px' : '13px',
                                                fontWeight: isActive ? '600' : '500',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {size}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        
                        <div style={{
                            marginBottom: '16px',
                            padding: '10px 14px',
                            backgroundColor: `${colors.btnBg}10`,
                            borderRadius: '10px',
                            border: `1px solid ${colors.btnBg}20`,
                        }}>
                            <div style={{
                                fontSize: isMobile ? '11px' : '12px',
                                fontWeight: '600',
                                color: colors.secondaryText,
                                marginBottom: '4px',
                            }}>
                                Active Filters
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '4px',
                                flexWrap: 'wrap',
                            }}>
                                {tempFilters.network !== 'All' && (
                                    <span style={{
                                        fontSize: isMobile ? '10px' : '11px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: colors.btnBg,
                                        color: colors.btnText,
                                    }}>
                                        {tempFilters.network}
                                    </span>
                                )}
                                {tempFilters.sizes.map(size => (
                                    <span key={size} style={{
                                        fontSize: isMobile ? '10px' : '11px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: colors.btnBg,
                                        color: colors.btnText,
                                    }}>
                                        {size}
                                    </span>
                                ))}
                                {(tempFilters.priceRange.min > 0 || tempFilters.priceRange.max < 200) && (
                                    <span style={{
                                        fontSize: isMobile ? '10px' : '11px',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        backgroundColor: colors.btnBg,
                                        color: colors.btnText,
                                    }}>
                                        ₵{tempFilters.priceRange.min}-₵{tempFilters.priceRange.max}
                                    </span>
                                )}
                                {tempFilters.network === 'All' && tempFilters.sizes.length === 0 &&
                                    tempFilters.priceRange.min === 0 && tempFilters.priceRange.max === 200 && (
                                        <span style={{
                                            fontSize: isMobile ? '10px' : '11px',
                                            color: colors.secondaryText,
                                        }}>
                                            No filters applied
                                        </span>
                                    )}
                            </div>
                        </div>

                        
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            borderTop: `1px solid ${colors.border}`,
                            paddingTop: '16px',
                            flexWrap: 'wrap',
                        }}>
                            <button
                                onClick={() => {
                                    setTempFilters({
                                        network: 'All',
                                        priceRange: { min: 0, max: 200 },
                                        sizes: []
                                    });
                                }}
                                style={{
                                    flex: 1,
                                    padding: isMobile ? '10px' : '12px',
                                    borderRadius: '12px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: 'transparent',
                                    color: colors.text,
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: isMobile ? '13px' : '14px',
                                    transition: 'all 0.2s ease',
                                    minWidth: isMobile ? '80px' : 'auto',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Reset All
                            </button>
                            <button
                                onClick={handleApplyFilters}
                                style={{
                                    flex: 2,
                                    padding: isMobile ? '10px' : '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: `linear-gradient(135deg, ${colors.btnBg}, ${colors.btnBg}88)`,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: isMobile ? '13px' : '14px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: `0 4px 12px ${colors.btnBg}33`,
                                    minWidth: isMobile ? '100px' : 'auto',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Apply {activeFilterCount > 0 && `(${activeFilterCount})`}
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
                @keyframes slideUpBottom {
                    from { 
                        opacity: 0;
                        transform: translateY(40px);
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
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: ${colors.btnBg};
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
                input[type="range"]::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: ${colors.btnBg};
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }
                input[type="range"]::-webkit-slider-runnable-track {
                    height: 4px;
                    border-radius: 2px;
                    background: ${colors.border};
                }
                input[type="range"]::-moz-range-track {
                    height: 4px;
                    border-radius: 2px;
                    background: ${colors.border};
                }
                
                ::-webkit-scrollbar {
                    width: 4px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: ${colors.border};
                    border-radius: 2px;
                }
                * {
                    box-sizing: border-box;
                }
            `}</style>
        </>
    );
};

export default DataScreen;



