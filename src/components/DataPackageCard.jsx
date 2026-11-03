import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { ArrowRight, Zap, Wifi, ShieldCheck } from 'lucide-react';

import mtnlogo from '../assets/images/mtn-logo.svg';
import telecellogo from '../assets/images/telecel.svg';
import atlogo from '../assets/images/at.svg';

const DataPackageCard = ({
    package: pkg,
    network,
    onClick,
    showPriceSource = false,
    isFavorite = false,
    onToggleFavorite,
    viewMode = 'grid'
}) => {
    const { colors } = useTheme();

    const networkConfig = {
        'MTN': {
            bgColor: '#FFD700',
            textColor: '#1A1A1A',
            image: mtnlogo,
            lightBg: '#FFFDE7',
            darkBg: '#1A1A0A',
            borderColor: '#FFD70040',
            label: 'MTN',
            isSpecial: false,
        },
        'Telecel': {
            bgColor: '#FF0000',
            textColor: '#FFFFFF',
            image: telecellogo,
            lightBg: '#FFEBEE',
            darkBg: '#1A0A0A',
            borderColor: '#FF000040',
            label: 'Telecel',
            isSpecial: false,
        },
        'AirtelTigo': {
            bgColor: '#1A73E8',
            textColor: '#FFFFFF',
            image: atlogo,
            lightBg: '#E8F0FE',
            darkBg: '#0A1420',
            borderColor: '#1A73E840',
            label: 'AirtelTigo',
            isSpecial: false,
        },
        'MTN_EXPRESS': {
            bgColor: '#FFD700',
            textColor: '#1A1A1A',
            image: mtnlogo,
            lightBg: '#FFFDE7',
            darkBg: '#1A1A0A',
            borderColor: '#FFD70040',
            label: 'MTN EXPRESS',
            isSpecial: true,
            specialTag: '⚡ Express',
            specialColor: '#FF6B00',
        },
        'AT_BIGTIME': {
            bgColor: '#1A73E8',
            textColor: '#FFFFFF',
            image: atlogo,
            lightBg: '#E8F0FE',
            darkBg: '#0A1420',
            borderColor: '#1A73E840',
            label: 'AT BigTime',
            isSpecial: true,
            specialTag: '🚀 BigTime',
            specialColor: '#FF6B00',
        },
    };

    const config = networkConfig[network] || networkConfig['MTN'];
    const isPopular = pkg.popular || false;
    const themeMode = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = themeMode === 'dark';

    const cardBg = isDark ? config.darkBg : config.lightBg;
    const priceColor = isDark ? config.bgColor : config.bgColor;
    const getPriceDisplay = () => {
        if (typeof pkg.price === 'string') {
            return pkg.price;
        }
        return `₵${pkg.price.toFixed(2)}`;
    };

    if (viewMode === 'grid') {
        return (
            <div
                onClick={onClick}
                style={{
                    width: '100%',
                    backgroundColor: cardBg,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: `0 2px 12px ${colors.shadow}`,
                    border: `1px solid ${colors.border}`,
                    position: 'relative',
                    minHeight: '150px',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 8px 32px ${colors.shadow}`;
                    e.currentTarget.style.borderColor = config.bgColor;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 2px 12px ${colors.shadow}`;
                    e.currentTarget.style.borderColor = colors.border;
                }}
            >
                
                <div style={{
                    height: '4px',
                    background: `linear-gradient(90deg, ${config.bgColor}, ${config.bgColor}80)`,
                    width: '100%',
                    flexShrink: 0,
                }} />

                
                {isPopular && (
                    <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 10px',
                        borderRadius: '8px',
                        background: config.bgColor,
                        color: config.textColor,
                        fontSize: '8px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: `0 2px 8px ${config.bgColor}40`,
                        zIndex: 2,
                    }}>
                        <Zap size={10} />
                        Popular
                    </div>
                )}

                
                {config.isSpecial && (
                    <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 10px',
                        borderRadius: '8px',
                        background: config.specialColor || config.bgColor,
                        color: '#FFFFFF',
                        fontSize: '8px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: `0 2px 8px ${config.specialColor || config.bgColor}40`,
                        zIndex: 2,
                    }}>
                        {config.specialTag}
                    </div>
                )}

                
                {onToggleFavorite && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite();
                        }}
                        style={{
                            position: 'absolute',
                            top: '4px',
                            left: config.isSpecial ? '72px' : '8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: isFavorite ? '#FF4757' : colors.secondaryText,
                            padding: '4px',
                            borderRadius: '50%',
                            transition: 'all 0.2s ease',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(4px)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill={isFavorite ? '#FF4757' : 'none'}
                            stroke={isFavorite ? '#FF4757' : colors.secondaryText}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </button>
                )}

                
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '14px 14px 12px',
                    gap: '6px',
                    height: '100%',
                }}>
                    
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '6px',
                                backgroundColor: config.bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px',
                                overflow: 'hidden',
                                flexShrink: 0,
                                boxShadow: `0 2px 8px ${config.bgColor}40`,
                            }}>
                                <img
                                    src={config.image}
                                    alt={network}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const parent = e.target.parentElement;
                                        if (parent) {
                                            parent.style.color = 'white';
                                            parent.style.fontWeight = '700';
                                            parent.style.fontSize = '10px';
                                            parent.textContent = network.charAt(0);
                                        }
                                    }}
                                />
                            </div>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: colors.text,
                            }}>
                                {config.label}
                            </span>
                        </div>
                    </div>

                    
                    <div style={{
                        fontSize: 'clamp(22px, 3vw, 28px)',
                        fontWeight: '800',
                        color: colors.heading,
                        lineHeight: '1.1',
                        letterSpacing: '-0.5px',
                        marginTop: '2px',
                    }}>
                        {pkg.size}
                    </div>

                    
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        marginTop: 'auto',
                        paddingTop: '8px',
                        borderTop: `1px solid ${colors.border}`,
                    }}>
                        <div>
                            <div style={{
                                fontSize: '9px',
                                fontWeight: '600',
                                color: colors.secondaryText,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                opacity: 0.6,
                            }}>
                                Price
                            </div>
                            <div style={{
                                fontSize: 'clamp(20px, 2.5vw, 26px)',
                                fontWeight: '800',
                                color: priceColor,
                                lineHeight: '1.1',
                            }}>
                                {getPriceDisplay()}
                            </div>
                            {showPriceSource && pkg.price_source && (
                                <div style={{
                                    fontSize: '8px',
                                    color: colors.success,
                                    fontWeight: '600',
                                }}>
                                    {pkg.price_source === 'agent' ? '⭐ Agent Price' : '🔥 Best Deal'}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: `linear-gradient(135deg, ${config.bgColor}, ${config.bgColor}CC)`,
                                color: config.textColor,
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: `0 4px 12px ${config.bgColor}40`,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 6px 20px ${config.bgColor}60`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = `0 4px 12px ${config.bgColor}40`;
                            }}
                        >
                            <span>Buy</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            style={{
                width: '100%',
                backgroundColor: cardBg,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 2px 8px ${colors.shadow}`,
                border: `1px solid ${colors.border}`,
                position: 'relative',
                padding: '10px 14px',
                gap: '10px',
                minHeight: '60px',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.borderColor = config.bgColor;
                e.currentTarget.style.boxShadow = `0 4px 16px ${colors.shadow}`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = `0 2px 8px ${colors.shadow}`;
            }}
        >
            
            <div style={{
                width: '4px',
                height: '40px',
                borderRadius: '2px',
                background: config.bgColor,
                flexShrink: 0,
            }} />

            
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: config.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: `0 2px 8px ${config.bgColor}30`,
            }}>
                <img
                    src={config.image}
                    alt={network}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (parent) {
                            parent.style.color = 'white';
                            parent.style.fontWeight = '700';
                            parent.style.fontSize = '12px';
                            parent.textContent = network.charAt(0);
                        }
                    }}
                />
            </div>

            
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                }}>
                    <span style={{
                        fontSize: 'clamp(15px, 2vw, 18px)',
                        fontWeight: '700',
                        color: colors.heading,
                        letterSpacing: '-0.3px',
                    }}>
                        {pkg.size}
                    </span>
                    <span style={{
                        fontSize: '10px',
                        fontWeight: '500',
                        color: colors.secondaryText,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                    }}>
                        <Wifi size={11} color={config.bgColor} />
                        {config.label}
                    </span>
                    {isPopular && (
                        <span style={{
                            fontSize: '7px',
                            fontWeight: '700',
                            color: config.textColor,
                            background: config.bgColor,
                            padding: '1px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                        }}>
                            <Zap size={8} />
                            Popular
                        </span>
                    )}
                    {config.isSpecial && (
                        <span style={{
                            fontSize: '7px',
                            fontWeight: '700',
                            color: '#FFFFFF',
                            background: config.specialColor || config.bgColor,
                            padding: '1px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                        }}>
                            {config.specialTag}
                        </span>
                    )}
                </div>
                {showPriceSource && pkg.price_source && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '10px',
                        color: colors.secondaryText,
                    }}>
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: colors.success,
                            fontWeight: '600',
                        }}>
                            <ShieldCheck size={10} />
                            {pkg.price_source === 'agent' ? 'Agent Price' : 'Best Deal'}
                        </span>
                    </div>
                )}
            </div>

            
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
            }}>
                <div style={{
                    textAlign: 'right',
                }}>
                    <div style={{
                        fontSize: '9px',
                        color: colors.secondaryText,
                        fontWeight: '500',
                        opacity: 0.6,
                    }}>
                        GHS
                    </div>
                    <div style={{
                        fontSize: 'clamp(16px, 2vw, 22px)',
                        fontWeight: '800',
                        color: priceColor,
                        lineHeight: '1.1',
                    }}>
                        {getPriceDisplay()}
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: `linear-gradient(135deg, ${config.bgColor}, ${config.bgColor}CC)`,
                        color: config.textColor,
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: `0 4px 12px ${config.bgColor}30`,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <span>Buy</span>
                    <ArrowRight size={12} />
                </button>
            </div>
        </div>
    );
};

export default DataPackageCard;

