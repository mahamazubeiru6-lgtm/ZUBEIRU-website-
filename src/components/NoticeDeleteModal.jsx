import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { AlertCircle, X } from 'lucide-react';

const NoticeDeleteModal = ({ isOpen, onClose, onConfirm, notice }) => {
    const { colors } = useTheme();
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isOpen || !notice) return null;

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
                maxWidth: '420px',
                width: '100%',
                padding: isMobile ? '20px' : '24px',
                boxShadow: `0 20px 60px ${colors.shadow}`,
                animation: 'slideUp 0.25s ease',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
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
                        <AlertCircle size={20} color={colors.error} />
                        Delete Notice
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

                <p style={{
                    fontSize: isMobile ? '13px' : '14px',
                    color: colors.text,
                    marginBottom: '4px',
                }}>
                    Are you sure you want to delete the notice:
                </p>
                <p style={{
                    fontSize: isMobile ? '14px' : '15px',
                    fontWeight: '600',
                    color: colors.heading,
                    marginBottom: '16px',
                }}>
                    "{notice.title}"
                </p>

                <p style={{
                    fontSize: isMobile ? '12px' : '13px',
                    color: colors.secondaryText,
                    marginBottom: '20px',
                }}>
                    This action cannot be undone. The notice will be permanently removed.
                </p>

                <div style={{
                    display: 'flex',
                    gap: '10px',
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
                        onClick={onConfirm}
                        style={{
                            flex: 2,
                            padding: isMobile ? '10px' : '12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: colors.error,
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: isMobile ? '13px' : '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        Delete
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
            `}</style>
        </div>
    );
};

export default NoticeDeleteModal;

