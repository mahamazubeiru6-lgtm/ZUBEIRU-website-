import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../providers/ToastProvider';
import { useNotices } from '../hooks/useNotices';
import {
    X,
    Save,
    AlertCircle,
    Users,
    Tag,
    Calendar,
    Link2,
    Eye,
    EyeOff
} from 'lucide-react';

const NoticeFormModal = ({ isOpen, onClose, notice, onSave }) => {
    const { colors } = useTheme();
    const { createNotice, updateNotice } = useNotices();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        message: '',
        priority: 'MEDIUM',
        target: 'ALL',
        is_displayed: true,
        display_order: 1,
        link_text: '',
        link_url: '',
        expires_at: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (notice) {
            setFormData({
                title: notice.title || '',
                message: notice.message || '',
                priority: notice.priority || 'MEDIUM',
                target: notice.target || 'ALL',
                is_displayed: notice.is_displayed !== undefined ? notice.is_displayed : true,
                display_order: notice.display_order || 1,
                link_text: notice.link_text || '',
                link_url: notice.link_url || '',
                expires_at: notice.expires_at ? notice.expires_at.split('T')[0] : '',
            });
        } else {
            setFormData({
                title: '',
                message: '',
                priority: 'MEDIUM',
                target: 'ALL',
                is_displayed: true,
                display_order: 1,
                link_text: '',
                link_url: '',
                expires_at: '',
            });
        }
        setErrors({});
    }, [notice, isOpen]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.message.trim()) newErrors.message = 'Message is required';
        if (formData.link_text && !formData.link_url) {
            newErrors.link_url = 'Link URL is required when link text is provided';
        }
        if (formData.link_url && !formData.link_text) {
            newErrors.link_text = 'Link text is required when link URL is provided';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const payload = {
                ...formData,
                display_order: parseInt(formData.display_order) || 1,
            };

            let result;
            if (notice) {
                result = await updateNotice(notice.id, payload);
            } else {
                result = await createNotice(payload);
            }

            if (result) {
                onSave();
            }
        } catch (error) {
            console.error('Error saving notice:', error);
            showToast('Failed to save notice', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const priorities = [
        { value: 'HIGH', label: 'High', color: '#EF4444' },
        { value: 'MEDIUM', label: 'Medium', color: '#F59E0B' },
        { value: 'LOW', label: 'Low', color: '#3B82F6' },
    ];

    const targets = [
        { value: 'ALL', label: 'All Users' },
        { value: 'AGENTS', label: 'Agents Only' },
        { value: 'SUB_AGENTS', label: 'Sub-Agents Only' },
        { value: 'CUSTOMERS', label: 'Customers Only' },
        { value: 'AGENTS_AND_SUB', label: 'Agents & Sub-Agents' },
    ];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
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
                    onClose();
                }
            }}
        >
            <div style={{
                backgroundColor: colors.raisedBg,
                borderRadius: isMobile ? '14px' : '16px',
                maxWidth: '560px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: isMobile ? '20px' : '24px',
                boxShadow: `0 20px 60px ${colors.shadow}`,
                animation: 'slideUp 0.25s ease',
                boxSizing: 'border-box',
            }}>
                
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                }}>
                    <h3 style={{
                        fontSize: isMobile ? '17px' : '18px',
                        fontWeight: '700',
                        color: colors.heading,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        {notice ? 'Edit Notice' : 'Create New Notice'}
                    </h3>
                    <button
                        onClick={onClose}
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
                    flexDirection: 'column',
                    gap: '14px',
                }}>
                    
                    <div>
                        <label style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: colors.text,
                            display: 'block',
                            marginBottom: '4px',
                        }}>
                            Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Enter notice title"
                            style={{
                                width: '100%',
                                padding: isMobile ? '8px 12px' : '10px 14px',
                                borderRadius: '8px',
                                border: `1.5px solid ${errors.title ? colors.error : colors.border}`,
                                backgroundColor: colors.raisedBg,
                                color: colors.text,
                                fontSize: isMobile ? '13px' : '14px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = errors.title ? colors.error : colors.btnBg}
                            onBlur={(e) => e.target.style.borderColor = errors.title ? colors.error : colors.border}
                        />
                        {errors.title && (
                            <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={12} /> {errors.title}
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
                            Message *
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Enter notice message"
                            rows={isMobile ? 3 : 4}
                            style={{
                                width: '100%',
                                padding: isMobile ? '8px 12px' : '10px 14px',
                                borderRadius: '8px',
                                border: `1.5px solid ${errors.message ? colors.error : colors.border}`,
                                backgroundColor: colors.raisedBg,
                                color: colors.text,
                                fontSize: isMobile ? '13px' : '14px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                            }}
                            onFocus={(e) => e.target.style.borderColor = errors.message ? colors.error : colors.btnBg}
                            onBlur={(e) => e.target.style.borderColor = errors.message ? colors.error : colors.border}
                        />
                        {errors.message && (
                            <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={12} /> {errors.message}
                            </span>
                        )}
                    </div>

                    
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
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
                                <Tag size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Priority
                            </label>
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                flexWrap: 'wrap',
                            }}>
                                {priorities.map((p) => (
                                    <button
                                        key={p.value}
                                        onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                                        style={{
                                            padding: isMobile ? '4px 12px' : '6px 16px',
                                            borderRadius: '8px',
                                            border: `2px solid ${formData.priority === p.value ? p.color : colors.border}`,
                                            backgroundColor: formData.priority === p.value ? `${p.color}15` : 'transparent',
                                            color: formData.priority === p.value ? p.color : colors.secondaryText,
                                            cursor: 'pointer',
                                            fontSize: isMobile ? '11px' : '12px',
                                            fontWeight: formData.priority === p.value ? '600' : '500',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: colors.text,
                                display: 'block',
                                marginBottom: '4px',
                            }}>
                                <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Target Audience
                            </label>
                            <select
                                value={formData.target}
                                onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: isMobile ? '8px 12px' : '10px 14px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    fontSize: isMobile ? '13px' : '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {targets.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
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
                                <Link2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Link Text
                            </label>
                            <input
                                type="text"
                                value={formData.link_text}
                                onChange={(e) => setFormData(prev => ({ ...prev, link_text: e.target.value }))}
                                placeholder="Learn More"
                                style={{
                                    width: '100%',
                                    padding: isMobile ? '8px 12px' : '10px 14px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${errors.link_text ? colors.error : colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    fontSize: isMobile ? '13px' : '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={(e) => e.target.style.borderColor = errors.link_text ? colors.error : colors.btnBg}
                                onBlur={(e) => e.target.style.borderColor = errors.link_text ? colors.error : colors.border}
                            />
                            {errors.link_text && (
                                <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} /> {errors.link_text}
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
                                <Link2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Link URL
                            </label>
                            <input
                                type="url"
                                value={formData.link_url}
                                onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                                placeholder="https://example.com"
                                style={{
                                    width: '100%',
                                    padding: isMobile ? '8px 12px' : '10px 14px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${errors.link_url ? colors.error : colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    fontSize: isMobile ? '13px' : '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                }}
                                onFocus={(e) => e.target.style.borderColor = errors.link_url ? colors.error : colors.btnBg}
                                onBlur={(e) => e.target.style.borderColor = errors.link_url ? colors.error : colors.border}
                            />
                            {errors.link_url && (
                                <span style={{ fontSize: '11px', color: colors.error, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={12} /> {errors.link_url}
                                </span>
                            )}
                        </div>
                    </div>

                    
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
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
                                <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Expires At
                            </label>
                            <input
                                type="date"
                                value={formData.expires_at}
                                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: isMobile ? '8px 12px' : '10px 14px',
                                    borderRadius: '8px',
                                    border: `1.5px solid ${colors.border}`,
                                    backgroundColor: colors.raisedBg,
                                    color: colors.text,
                                    fontSize: isMobile ? '13px' : '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
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
                                <Eye size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Display Status
                            </label>
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                            }}>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, is_displayed: true }))}
                                    style={{
                                        flex: 1,
                                        padding: isMobile ? '6px 12px' : '8px 14px',
                                        borderRadius: '8px',
                                        border: `2px solid ${formData.is_displayed ? colors.btnBg : colors.border}`,
                                        backgroundColor: formData.is_displayed ? `${colors.btnBg}15` : 'transparent',
                                        color: formData.is_displayed ? colors.btnBg : colors.secondaryText,
                                        cursor: 'pointer',
                                        fontSize: isMobile ? '11px' : '12px',
                                        fontWeight: formData.is_displayed ? '600' : '500',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <Eye size={14} />
                                    Visible
                                </button>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, is_displayed: false }))}
                                    style={{
                                        flex: 1,
                                        padding: isMobile ? '6px 12px' : '8px 14px',
                                        borderRadius: '8px',
                                        border: `2px solid ${!formData.is_displayed ? colors.btnBg : colors.border}`,
                                        backgroundColor: !formData.is_displayed ? `${colors.btnBg}15` : 'transparent',
                                        color: !formData.is_displayed ? colors.btnBg : colors.secondaryText,
                                        cursor: 'pointer',
                                        fontSize: isMobile ? '11px' : '12px',
                                        fontWeight: !formData.is_displayed ? '600' : '500',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <EyeOff size={14} />
                                    Hidden
                                </button>
                            </div>
                        </div>
                    </div>

                    
                    <div>
                        <label style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: colors.text,
                            display: 'block',
                            marginBottom: '4px',
                        }}>
                            Display Order
                        </label>
                        <input
                            type="number"
                            value={formData.display_order}
                            onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                            min="1"
                            style={{
                                width: '100%',
                                maxWidth: '100px',
                                padding: isMobile ? '8px 12px' : '10px 14px',
                                borderRadius: '8px',
                                border: `1.5px solid ${colors.border}`,
                                backgroundColor: colors.raisedBg,
                                color: colors.text,
                                fontSize: isMobile ? '13px' : '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                </div>

                
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '20px',
                    paddingTop: '18px',
                    borderTop: `1px solid ${colors.border}`,
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: isMobile ? '10px' : '12px',
                            borderRadius: '8px',
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
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            flex: 2,
                            padding: isMobile ? '10px' : '12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: colors.btnBg,
                            color: colors.btnText,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: isMobile ? '13px' : '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s',
                        }}
                    >
                        {loading ? (
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
                                <Save size={16} />
                                {notice ? 'Update Notice' : 'Create Notice'}
                            </>
                        )}
                    </button>
                </div>
            </div>

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

export default NoticeFormModal;

