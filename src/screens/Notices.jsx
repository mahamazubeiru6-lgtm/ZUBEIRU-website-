import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { Bell, Search, X, ChevronDown, ChevronUp, AlertCircle, Info, Calendar, ExternalLink, Clock, RefreshCw, Users, Flame } from 'lucide-react';

const Notices = () => {
    const { colors } = useTheme();
    const { authFetch } = useAuth();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [notices, setNotices] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('ALL');
    const [selectedTarget, setSelectedTarget] = useState('ALL');
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [expandedNotices, setExpandedNotices] = useState({});

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            setLoading(true);
            const response = await authFetch('/accounts/notices/active/');
            const data = await response.json();

            if (response.ok && data.status === 'success') {
                setNotices(data.data || []);
            } else {
                showToast(data.message || 'Failed to fetch notices', 'error');
            }
        } catch (error) {
            console.error('Error fetching notices:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedNotices(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'URGENT': '#EF4444',
            'HIGH': '#F59E0B',
            'MEDIUM': '#3B82F6',
            'LOW': '#8B5CF6',
        };
        return colors[priority] || '#6B7280';
    };

    const getPriorityBgColor = (priority) => {
        const colors = {
            'URGENT': '#EF444420',
            'HIGH': '#F59E0B20',
            'MEDIUM': '#3B82F620',
            'LOW': '#8B5CF620',
        };
        return colors[priority] || '#6B728020';
    };

    const getPriorityIcon = (priority) => {
        const icons = {
            'URGENT': <Flame size={16} />,
            'HIGH': <AlertCircle size={16} />,
            'MEDIUM': <Info size={16} />,
            'LOW': <Bell size={16} />,
        };
        return icons[priority] || <Bell size={16} />;
    };

    const getPriorityLabel = (priority) => {
        const labels = {
            'URGENT': 'Urgent',
            'HIGH': 'High',
            'MEDIUM': 'Medium',
            'LOW': 'Low',
        };
        return labels[priority] || priority;
    };

    const getTargetLabel = (target) => {
        const labels = {
            'ALL': 'All Users',
            'AGENTS': 'Agents',
            'SUB_AGENTS': 'Sub-Agents',
            'CUSTOMERS': 'Customers',
            'AGENTS_AND_SUB': 'Agents & Sub-Agents',
        };
        return labels[target] || target;
    };

    const getTargetIcon = (target) => {
        const icons = {
            'ALL': <Users size={14} />,
            'AGENTS': <Users size={14} />,
            'SUB_AGENTS': <Users size={14} />,
            'CUSTOMERS': <Users size={14} />,
            'AGENTS_AND_SUB': <Users size={14} />,
        };
        return icons[target] || <Users size={14} />;
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

    const isExpired = (expiresAt) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    const filteredNotices = useMemo(() => {
        let filtered = notices;

        if (selectedPriority !== 'ALL') {
            filtered = filtered.filter(n => n.priority === selectedPriority);
        }

        if (selectedTarget !== 'ALL') {
            filtered = filtered.filter(n => n.target === selectedTarget);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(n =>
                n.title?.toLowerCase().includes(query) ||
                n.message?.toLowerCase().includes(query) ||
                n.priority_label?.toLowerCase().includes(query) ||
                n.target_label?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [notices, selectedPriority, selectedTarget, searchQuery]);

    const priorities = ['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    const targets = ['ALL', 'AGENTS', 'SUB_AGENTS', 'CUSTOMERS', 'AGENTS_AND_SUB'];

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedPriority('ALL');
        setSelectedTarget('ALL');
    };

    const hasActiveFilters = selectedPriority !== 'ALL' || selectedTarget !== 'ALL' || searchQuery;

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
                    Loading notices...
                </span>
            </div>
        );
    }

    return (
        <div style={{
            maxWidth: '1000px',
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
                        fontSize: isMobile ? 'clamp(20px, 5vw, 24px)' : 'clamp(24px, 3vw, 32px)',
                        fontWeight: '700',
                        color: colors.heading,
                        margin: '0 0 2px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                    }}>
                        <Bell size={isMobile ? 20 : 24} style={{ color: colors.btnBg }} />
                        Notices
                    </h1>
                    <p style={{
                        color: colors.secondaryText,
                        margin: 0,
                        fontSize: isMobile ? '12px' : '14px',
                    }}>
                        Stay updated with the latest announcements
                    </p>
                </div>
                <button
                    onClick={fetchNotices}
                    style={{
                        padding: isMobile ? '6px 10px' : '8px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.raisedBg,
                        color: colors.text,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '4px' : '8px',
                        fontSize: isMobile ? '11px' : '13px',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = colors.raisedBg}
                >
                    <RefreshCw size={isMobile ? 14 : 16} />
                    {!isMobile && 'Refresh'}
                </button>
            </div>

            
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: isMobile ? '6px' : '10px',
                marginBottom: isMobile ? '12px' : '16px',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Total</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: colors.heading }}>
                        {notices.length}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Urgent</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#EF4444' }}>
                        {notices.filter(n => n.priority === 'URGENT').length}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>High Priority</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#F59E0B' }}>
                        {notices.filter(n => n.priority === 'HIGH').length}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Expiring Soon</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#8B5CF6' }}>
                        {notices.filter(n => n.expires_at && !isExpired(n.expires_at) && new Date(n.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}
                    </div>
                </div>
            </div>

            
            <div style={{
                display: 'flex',
                gap: isMobile ? '6px' : '10px',
                marginBottom: isMobile ? '10px' : '16px',
                alignItems: 'center',
                flexWrap: 'wrap',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    flex: 1,
                    position: 'relative',
                    minWidth: isMobile ? '120px' : '200px',
                }}>
                    <Search
                        size={isMobile ? 14 : 16}
                        style={{
                            position: 'absolute',
                            left: isMobile ? '8px' : '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: colors.secondaryText,
                        }}
                    />
                    <input
                        type="text"
                        placeholder={isMobile ? "Search..." : "Search notices..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: isMobile ? '6px 32px 6px 32px' : '8px 40px 8px 40px',
                            borderRadius: isMobile ? '8px' : '10px',
                            border: `1.5px solid ${searchQuery ? colors.btnBg : colors.border}`,
                            backgroundColor: colors.raisedBg,
                            color: colors.text,
                            fontSize: isMobile ? '13px' : '14px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            minHeight: isMobile ? '36px' : '44px',
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
                                right: isMobile ? '6px' : '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: colors.secondaryText,
                                padding: '4px',
                            }}
                        >
                            <X size={isMobile ? 14 : 16} />
                        </button>
                    )}
                </div>

                
                {!isMobile && (
                    <>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '3px',
                            backgroundColor: colors.raisedBg,
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                        }}>
                            <select
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                                style={{
                                    padding: '4px 28px 4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: selectedPriority !== 'ALL' ? colors.btnBg : 'transparent',
                                    color: selectedPriority !== 'ALL' ? colors.btnText : colors.secondaryText,
                                    fontSize: '11px',
                                    fontWeight: selectedPriority !== 'ALL' ? '600' : '500',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${selectedPriority !== 'ALL' ? 'white' : colors.secondaryText}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 8px center',
                                    backgroundSize: '12px',
                                }}
                            >
                                {priorities.map(p => (
                                    <option key={p} value={p} style={{ color: colors.text, background: colors.raisedBg }}>
                                        {p === 'ALL' ? 'All Priority' : getPriorityLabel(p)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '3px',
                            backgroundColor: colors.raisedBg,
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                        }}>
                            <select
                                value={selectedTarget}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                                style={{
                                    padding: '4px 28px 4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: selectedTarget !== 'ALL' ? colors.btnBg : 'transparent',
                                    color: selectedTarget !== 'ALL' ? colors.btnText : colors.secondaryText,
                                    fontSize: '11px',
                                    fontWeight: selectedTarget !== 'ALL' ? '600' : '500',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${selectedTarget !== 'ALL' ? 'white' : colors.secondaryText}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 8px center',
                                    backgroundSize: '12px',
                                }}
                            >
                                {targets.map(t => (
                                    <option key={t} value={t} style={{ color: colors.text, background: colors.raisedBg }}>
                                        {t === 'ALL' ? 'All Targets' : getTargetLabel(t)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                style={{
                                    fontSize: '12px',
                                    color: colors.btnBg,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = `${colors.btnBg}15`}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Clear filters
                            </button>
                        )}
                    </>
                )}
            </div>

            
            <div style={{
                marginBottom: isMobile ? '10px' : '16px',
                fontSize: isMobile ? '12px' : '14px',
                color: colors.secondaryText,
            }}>
                Showing <strong style={{ color: colors.text }}>{filteredNotices.length}</strong> notice{filteredNotices.length !== 1 ? 's' : ''}
            </div>

            
            {filteredNotices.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: isMobile ? '12px' : '16px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    {filteredNotices.map((notice) => {
                        const priorityColor = getPriorityColor(notice.priority);
                        const priorityBg = getPriorityBgColor(notice.priority);
                        const expired = isExpired(notice.expires_at);
                        const isExpanded = expandedNotices[notice.id];

                        return (
                            <div
                                key={notice.id}
                                style={{
                                    backgroundColor: colors.raisedBg,
                                    borderRadius: isMobile ? '12px' : '14px',
                                    border: `1px solid ${expired ? colors.border : priorityColor}40`,
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    boxShadow: `0 2px 12px ${colors.shadow}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = `0 8px 30px ${colors.shadow}`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = `0 2px 12px ${colors.shadow}`;
                                }}
                            >
                                
                                <div style={{
                                    height: '4px',
                                    background: `linear-gradient(90deg, ${priorityColor}, ${priorityColor}80)`,
                                    width: '100%',
                                    flexShrink: 0,
                                }} />

                                <div style={{
                                    padding: isMobile ? '14px 16px' : '18px 20px',
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isMobile ? '8px' : '10px',
                                }}>
                                    
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexWrap: 'wrap',
                                                marginBottom: '4px',
                                            }}>
                                                <span style={{
                                                    fontSize: isMobile ? '14px' : '16px',
                                                    fontWeight: '600',
                                                    color: colors.heading,
                                                }}>
                                                    {notice.title}
                                                </span>
                                                {expired && (
                                                    <span style={{
                                                        fontSize: '8px',
                                                        padding: '1px 8px',
                                                        borderRadius: '10px',
                                                        backgroundColor: '#6B728020',
                                                        color: '#6B7280',
                                                        fontWeight: '600',
                                                        textTransform: 'uppercase',
                                                    }}>
                                                        Expired
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexWrap: 'wrap',
                                            }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 10px',
                                                    borderRadius: '10px',
                                                    backgroundColor: priorityBg,
                                                    color: priorityColor,
                                                    fontSize: isMobile ? '9px' : '10px',
                                                    fontWeight: '600',
                                                }}>
                                                    {getPriorityIcon(notice.priority)}
                                                    {getPriorityLabel(notice.priority)}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 10px',
                                                    borderRadius: '10px',
                                                    backgroundColor: `${colors.btnBg}15`,
                                                    color: colors.btnBg,
                                                    fontSize: isMobile ? '9px' : '10px',
                                                    fontWeight: '500',
                                                }}>
                                                    {getTargetIcon(notice.target)}
                                                    {getTargetLabel(notice.target)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    
                                    <div style={{
                                        fontSize: isMobile ? '13px' : '14px',
                                        color: colors.text,
                                        lineHeight: '1.5',
                                        display: '-webkit-box',
                                        WebkitLineClamp: isExpanded ? 'none' : 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}>
                                        {notice.message}
                                    </div>

                                    
                                    {notice.link_url && notice.link_text && (
                                        <a
                                            href={notice.link_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                color: colors.btnBg,
                                                textDecoration: 'none',
                                                fontSize: isMobile ? '12px' : '13px',
                                                fontWeight: '500',
                                                width: 'fit-content',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = `${colors.btnBg}15`}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {notice.link_text}
                                            <ExternalLink size={14} />
                                        </a>
                                    )}

                                    
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: 'auto',
                                        paddingTop: isMobile ? '8px' : '10px',
                                        borderTop: `1px solid ${colors.border}`,
                                        flexWrap: 'wrap',
                                        gap: '4px',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: isMobile ? '10px' : '11px',
                                            color: colors.secondaryText,
                                        }}>
                                            <Calendar size={isMobile ? 12 : 14} />
                                            {formatDate(notice.created_at)}
                                            {notice.expires_at && (
                                                <>
                                                    <span style={{ opacity: 0.3 }}>•</span>
                                                    <Clock size={isMobile ? 12 : 14} />
                                                    {expired ? 'Expired' : formatDate(notice.expires_at)}
                                                </>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => toggleExpand(notice.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                background: 'transparent',
                                                color: colors.secondaryText,
                                                cursor: 'pointer',
                                                fontSize: isMobile ? '10px' : '11px',
                                                fontWeight: '500',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {isExpanded ? 'Show Less' : 'Read More'}
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: isMobile ? '40px 16px' : '60px 20px',
                    backgroundColor: colors.raisedBg,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                }}>
                    <Bell size={isMobile ? 40 : 56} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <h3 style={{
                        fontSize: isMobile ? '16px' : '18px',
                        fontWeight: '600',
                        color: colors.heading,
                        margin: '0 0 8px 0',
                    }}>
                        {searchQuery || selectedPriority !== 'ALL' || selectedTarget !== 'ALL'
                            ? 'No matching notices found'
                            : 'No notices available'}
                    </h3>
                    <p style={{
                        fontSize: isMobile ? '13px' : '14px',
                        color: colors.secondaryText,
                        margin: 0,
                    }}>
                        {searchQuery || selectedPriority !== 'ALL' || selectedTarget !== 'ALL'
                            ? 'Try adjusting your search or filter criteria'
                            : 'Check back later for updates and announcements'}
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            style={{
                                marginTop: '16px',
                                padding: isMobile ? '8px 20px' : '10px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: colors.btnBg,
                                color: colors.btnText,
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: isMobile ? '13px' : '14px',
                            }}
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            )}

            <style>{`
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

export default Notices;

