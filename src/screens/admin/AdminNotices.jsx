import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Bell, Plus, Edit2, Trash2, Eye, EyeOff, RefreshCw, Search, X, AlertCircle, CheckCircle, Clock, Users, Tag, ChevronRight } from 'lucide-react';
import { useNotices } from '../../hooks/useNotices';
import NoticeFormModal from '../../components/NoticeFormModal';
import NoticeDeleteModal from '../../components/NoticeDeleteModal';

const AdminNotices = () => {
    const { colors } = useTheme();
    const { notices, loading, totalCount, fetchNotices, deleteNotice, toggleDisplay } = useNotices();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPriority, setSelectedPriority] = useState('ALL');
    const [selectedTarget, setSelectedTarget] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingNotice, setEditingNotice] = useState(null);
    const [deletingNotice, setDeletingNotice] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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

    const handleSearch = () => {
        fetchNotices({ search: searchQuery });
    };

    const handleFilterChange = () => {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (selectedPriority !== 'ALL') params.priority = selectedPriority;
        if (selectedTarget !== 'ALL') params.target = selectedTarget;
        if (selectedStatus !== 'ALL') params.status = selectedStatus;
        fetchNotices(params);
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedPriority('ALL');
        setSelectedTarget('ALL');
        setSelectedStatus('ALL');
        fetchNotices();
    };

    const handleToggleDisplay = async (id) => {
        await toggleDisplay(id);
    };

    const handleDelete = async (id) => {
        const success = await deleteNotice(id);
        if (success) {
            setDeletingNotice(null);
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'HIGH': { bg: '#EF444420', text: '#EF4444', label: 'High' },
            'MEDIUM': { bg: '#F59E0B20', text: '#F59E0B', label: 'Medium' },
            'LOW': { bg: '#3B82F620', text: '#3B82F6', label: 'Low' },
        };
        return colors[priority] || colors['LOW'];
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

    const priorities = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];
    const targets = ['ALL', 'ALL', 'AGENTS', 'SUB_AGENTS', 'CUSTOMERS', 'AGENTS_AND_SUB'];
    const statuses = ['ALL', 'ACTIVE', 'INACTIVE', 'EXPIRED'];

    if (loading && notices.length === 0) {
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
                gap: '10px',
            }}>
                <div>
                    <h1 style={{
                        fontSize: isMobile ? 'clamp(20px, 5vw, 24px)' : 'clamp(24px, 2.5vw, 32px)',
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
                        fontSize: isMobile ? '12px' : '13px',
                    }}>
                        Manage announcements and notifications for all users
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}>
                    <button
                        onClick={() => fetchNotices()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '4px' : '8px',
                            padding: isMobile ? '6px 12px' : '8px 16px',
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
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: isMobile ? '6px 14px' : '8px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: colors.btnBg,
                            color: colors.btnText,
                            cursor: 'pointer',
                            fontSize: isMobile ? '12px' : '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            boxShadow: `0 4px 12px ${colors.btnBg}44`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 8px 24px ${colors.btnBg}66`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${colors.btnBg}44`;
                        }}
                    >
                        <Plus size={isMobile ? 16 : 18} />
                        {!isMobile && 'New Notice'}
                    </button>
                </div>
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
                        {totalCount}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Active</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#10B981' }}>
                        {notices.filter(n => n.is_active && n.is_displayed && !isExpired(n.expires_at)).length}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Hidden</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#F59E0B' }}>
                        {notices.filter(n => !n.is_displayed).length}
                    </div>
                </div>
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: isMobile ? '8px' : '10px',
                    padding: isMobile ? '8px 10px' : '12px 14px',
                    border: `1px solid ${colors.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '8px' : '10px', color: colors.secondaryText }}>Expired</div>
                    <div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#EF4444' }}>
                        {notices.filter(n => isExpired(n.expires_at)).length}
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
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                            onClick={() => {
                                setSearchQuery('');
                                fetchNotices();
                            }}
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
                                onChange={(e) => {
                                    setSelectedPriority(e.target.value);
                                    handleFilterChange();
                                }}
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
                                        {p === 'ALL' ? 'All Priority' : p}
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
                                onChange={(e) => {
                                    setSelectedTarget(e.target.value);
                                    handleFilterChange();
                                }}
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

                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '3px',
                            backgroundColor: colors.raisedBg,
                            borderRadius: '8px',
                            border: `1px solid ${colors.border}`,
                        }}>
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    handleFilterChange();
                                }}
                                style={{
                                    padding: '4px 28px 4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: selectedStatus !== 'ALL' ? colors.btnBg : 'transparent',
                                    color: selectedStatus !== 'ALL' ? colors.btnText : colors.secondaryText,
                                    fontSize: '11px',
                                    fontWeight: selectedStatus !== 'ALL' ? '600' : '500',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${selectedStatus !== 'ALL' ? 'white' : colors.secondaryText}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 8px center',
                                    backgroundSize: '12px',
                                }}
                            >
                                {statuses.map(s => (
                                    <option key={s} value={s} style={{ color: colors.text, background: colors.raisedBg }}>
                                        {s === 'ALL' ? 'All Status' : s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(searchQuery || selectedPriority !== 'ALL' || selectedTarget !== 'ALL' || selectedStatus !== 'ALL') && (
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
                Showing <strong style={{ color: colors.text }}>{notices.length}</strong> notice{notices.length !== 1 ? 's' : ''}
                {totalCount > notices.length && ` of ${totalCount}`}
            </div>

            
            {!isMobile && (
                <div style={{
                    backgroundColor: colors.raisedBg,
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    overflow: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    <div style={{
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        width: '100%',
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 1fr',
                            padding: '10px 16px',
                            backgroundColor: colors.mainBg,
                            borderBottom: `1px solid ${colors.border}`,
                            fontSize: '11px',
                            fontWeight: '600',
                            color: colors.secondaryText,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            minWidth: '700px',
                        }}>
                            <span>Notice</span>
                            <span>Priority</span>
                            <span>Target</span>
                            <span>Status</span>
                            <span>Expires</span>
                            <span style={{ textAlign: 'center' }}>Actions</span>
                        </div>

                        {notices.length === 0 ? (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: colors.secondaryText,
                            }}>
                                <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                <p>No notices found</p>
                            </div>
                        ) : (
                            notices.map((notice) => {
                                const priorityColors = getPriorityColor(notice.priority);
                                const expired = isExpired(notice.expires_at);
                                const isActive = notice.is_active && notice.is_displayed && !expired;

                                return (
                                    <div
                                        key={notice.id}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr 1fr',
                                            padding: '10px 16px',
                                            borderBottom: `1px solid ${colors.border}`,
                                            alignItems: 'center',
                                            fontSize: '13px',
                                            transition: 'background 0.2s',
                                            minWidth: '700px',
                                            backgroundColor: !isActive ? `${colors.border}30` : 'transparent',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = colors.hoverBg}
                                        onMouseLeave={(e) => e.currentTarget.style.background = !isActive ? `${colors.border}30` : 'transparent'}
                                    >
                                        <div>
                                            <div style={{
                                                fontWeight: '600',
                                                color: colors.heading,
                                                fontSize: '14px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {notice.title}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: colors.secondaryText,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                marginTop: '2px',
                                            }}>
                                                {notice.message}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '3px 12px',
                                                borderRadius: '12px',
                                                backgroundColor: priorityColors.bg,
                                                color: priorityColors.text,
                                                fontSize: '11px',
                                                fontWeight: '600',
                                            }}>
                                                <Tag size={10} />
                                                {priorityColors.label}
                                            </span>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                            color: colors.secondaryText,
                                        }}>
                                            {getTargetIcon(notice.target)}
                                            {getTargetLabel(notice.target)}
                                        </div>

                                        <div>
                                            {expired ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#EF4444',
                                                }}>
                                                    <AlertCircle size={12} />
                                                    Expired
                                                </span>
                                            ) : !notice.is_active ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#6B7280',
                                                }}>
                                                    <X size={12} />
                                                    Inactive
                                                </span>
                                            ) : !notice.is_displayed ? (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#F59E0B',
                                                }}>
                                                    <EyeOff size={12} />
                                                    Hidden
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#10B981',
                                                }}>
                                                    <CheckCircle size={12} />
                                                    Active
                                                </span>
                                            )}
                                        </div>

                                        <div style={{
                                            fontSize: '11px',
                                            color: colors.secondaryText,
                                        }}>
                                            {notice.expires_at ? formatDate(notice.expires_at) : 'Never'}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: '4px',
                                        }}>
                                            <button
                                                onClick={() => setEditingNotice(notice)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: 'transparent',
                                                    color: colors.secondaryText,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
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
                                                onClick={() => handleToggleDisplay(notice.id)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: 'transparent',
                                                    color: notice.is_displayed ? colors.secondaryText : '#10B981',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = notice.is_displayed ? colors.hoverBg : '#10B98115';
                                                    e.currentTarget.style.borderColor = notice.is_displayed ? colors.border : '#10B981';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.borderColor = colors.border;
                                                }}
                                            >
                                                {notice.is_displayed ? <Eye size={14} /> : <EyeOff size={14} />}
                                                {notice.is_displayed ? 'Hide' : 'Show'}
                                            </button>
                                            <button
                                                onClick={() => setDeletingNotice(notice)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: 'transparent',
                                                    color: '#EF4444',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#EF444415';
                                                    e.currentTarget.style.borderColor = '#EF4444';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.borderColor = colors.border;
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            
            {isMobile && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%',
                    boxSizing: 'border-box',
                }}>
                    {notices.length === 0 ? (
                        <div style={{
                            backgroundColor: colors.raisedBg,
                            borderRadius: '10px',
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: colors.secondaryText,
                            border: `1px solid ${colors.border}`,
                        }}>
                            <Bell size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                            <p style={{ fontSize: '14px' }}>No notices found</p>
                        </div>
                    ) : (
                        notices.map((notice) => {
                            const priorityColors = getPriorityColor(notice.priority);
                            const expired = isExpired(notice.expires_at);
                            const isActive = notice.is_active && notice.is_displayed && !expired;

                            return (
                                <div
                                    key={notice.id}
                                    style={{
                                        backgroundColor: colors.raisedBg,
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        border: `1px solid ${colors.border}`,
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        opacity: isActive ? 1 : 0.6,
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '6px',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: colors.heading,
                                            }}>
                                                {notice.title}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginTop: '4px',
                                                flexWrap: 'wrap',
                                            }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '2px 10px',
                                                    borderRadius: '10px',
                                                    backgroundColor: priorityColors.bg,
                                                    color: priorityColors.text,
                                                    fontSize: '10px',
                                                    fontWeight: '600',
                                                }}>
                                                    <Tag size={10} />
                                                    {priorityColors.label}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '10px',
                                                    color: colors.secondaryText,
                                                }}>
                                                    {getTargetIcon(notice.target)}
                                                    {getTargetLabel(notice.target)}
                                                </span>
                                                {expired ? (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: '600',
                                                        color: '#EF4444',
                                                    }}>
                                                        Expired
                                                    </span>
                                                ) : !notice.is_active ? (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: '600',
                                                        color: '#6B7280',
                                                    }}>
                                                        Inactive
                                                    </span>
                                                ) : !notice.is_displayed ? (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: '600',
                                                        color: '#F59E0B',
                                                    }}>
                                                        Hidden
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        fontWeight: '600',
                                                        color: '#10B981',
                                                    }}>
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            gap: '4px',
                                            flexShrink: 0,
                                        }}>
                                            <button
                                                onClick={() => setEditingNotice(notice)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: 'transparent',
                                                    color: colors.secondaryText,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleDisplay(notice.id)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: 'transparent',
                                                    color: notice.is_displayed ? colors.secondaryText : '#10B981',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {notice.is_displayed ? <Eye size={14} /> : <EyeOff size={14} />}
                                            </button>
                                            <button
                                                onClick={() => setDeletingNotice(notice)}
                                                style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${colors.border}`,
                                                    backgroundColor: 'transparent',
                                                    color: '#EF4444',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{
                                        fontSize: '12px',
                                        color: colors.secondaryText,
                                        marginBottom: '4px',
                                    }}>
                                        {notice.message}
                                    </div>

                                    {notice.link_text && notice.link_url && (
                                        <a
                                            href={notice.link_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '12px',
                                                color: colors.btnBg,
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            {notice.link_text}
                                            <ChevronRight size={12} />
                                        </a>
                                    )}

                                    {notice.expires_at && (
                                        <div style={{
                                            fontSize: '10px',
                                            color: colors.secondaryText,
                                            marginTop: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <Clock size={12} />
                                            Expires: {formatDate(notice.expires_at)}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            
            <NoticeFormModal
                isOpen={showCreateModal || !!editingNotice}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingNotice(null);
                }}
                notice={editingNotice}
                onSave={() => {
                    setShowCreateModal(false);
                    setEditingNotice(null);
                    fetchNotices();
                }}
            />

            
            <NoticeDeleteModal
                isOpen={!!deletingNotice}
                onClose={() => setDeletingNotice(null)}
                onConfirm={() => handleDelete(deletingNotice?.id)}
                notice={deletingNotice}
            />

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

export default AdminNotices;

