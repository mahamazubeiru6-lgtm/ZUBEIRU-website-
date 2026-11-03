


import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import { Package, Plus, Search, X, Edit2, RefreshCw, Eye, EyeOff, Save, LayoutGrid, List as ListIcon } from "lucide-react";

const NETWORKS = {
  MTN: { label: "MTN", color: "#F5B700" },
  Telecel: { label: "Telecel", color: "#E11D48" },
  AirtelTigo: { label: "AirtelTigo", color: "#2563EB" },
  AT_BIGTIME: { label: "AT BigTime", color: "#2563EB" },
  MTN_EXPRESS: { label: "MTN Express", color: "#F5B700" },
};

const networkMeta = (n) =>
  NETWORKS[n] || { label: n || "Unknown", color: "#6B7280" };

const AdminPackages = () => {
  const { colors } = useTheme();
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  const [formData, setFormData] = useState({
    network: "",
    size_gb: "",
    base_price_customer: "",
    base_price_agent: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const isMobile = width <= 768;

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch("/data/packages/");
      const data = await res.json();
      if (res.ok && data.status === "success") setPackages(data.data || []);
      else showToast(data.message || "Failed to fetch packages", "error");
    } catch (e) {
      console.error(e);
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [authFetch, showToast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const filteredPackages = useMemo(() => {
    let list = packages;
    if (selectedNetwork !== "ALL") {
      list = list.filter((p) => p.network === selectedNetwork);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.network?.toLowerCase().includes(q) ||
          p.size_gb?.toString().includes(q) ||
          p.created_by_username?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [packages, selectedNetwork, searchQuery]);

  const networkCounts = useMemo(() => {
    const counts = { ALL: packages.length };
    for (const key of Object.keys(NETWORKS)) {
      counts[key] = packages.filter((p) => p.network === key).length;
    }
    return counts;
  }, [packages]);

  const resetForm = useCallback(() => {
    setFormData({
      network: "",
      size_gb: "",
      base_price_customer: "",
      base_price_agent: "",
    });
    setFormErrors({});
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.network) errors.network = "Network is required";
    if (!formData.size_gb || parseFloat(formData.size_gb) <= 0)
      errors.size_gb = "Valid size required";
    if (
      !formData.base_price_customer ||
      parseFloat(formData.base_price_customer) <= 0
    )
      errors.base_price_customer = "Valid customer price required";
    if (
      !formData.base_price_agent ||
      parseFloat(formData.base_price_agent) <= 0
    )
      errors.base_price_agent = "Valid agent price required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitPackage = async (e, isEdit) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/data/packages/${selectedPackage.id}/`
        : "/data/packages/";
      const method = isEdit ? "PATCH" : "POST";
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      const ok = isEdit ? res.status === 200 : res.status === 201;
      if (ok && data.status === "success") {
        showToast(
          isEdit ? "Package updated" : "Package created",
          "success"
        );
        setShowAddModal(false);
        setShowEditModal(false);
        setSelectedPackage(null);
        resetForm();
        fetchPackages();
      } else if (data.errors) {
        setFormErrors(data.errors);
        const first = Object.values(data.errors)[0];
        showToast(Array.isArray(first) ? first[0] : first, "error");
      } else {
        showToast(data.message || "Failed to save", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (pkg) => {
    try {
      const res = await authFetch(`/data/packages/${pkg.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !pkg.is_active }),
      });
      const data = await res.json();
      if (res.status === 200 && data.status === "success") {
        showToast(
          `Package ${pkg.is_active ? "deactivated" : "activated"}`,
          "success"
        );
        fetchPackages();
      } else {
        showToast(data.message || "Failed", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
  };

  const openEditModal = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({
      network: pkg.network,
      size_gb: pkg.size_gb,
      base_price_customer: pkg.base_price_customer,
      base_price_agent: pkg.base_price_agent,
    });
    setShowEditModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedPackage(null);
    resetForm();
  };

  const hasActiveFilters = selectedNetwork !== "ALL" || searchQuery;

  const formatDate = (s) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 14,
          color: colors.secondaryText,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: `3px solid ${colors.border}`,
            borderTopColor: colors.btnBg,
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <span style={{ fontSize: 13 }}>Loading packages…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: isMobile ? "0 12px 32px" : "0 4px 40px",
        color: colors.text,
      }}
    >
      
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              margin: 0,
              fontSize: isMobile ? 20 : 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: colors.heading,
            }}
          >
            <Package size={isMobile ? 20 : 22} color={colors.btnBg} />
            Data packages
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: isMobile ? 12.5 : 13.5,
              color: colors.secondaryText,
            }}
          >
            {packages.length} package{packages.length !== 1 ? "s" : ""} ·{" "}
            {packages.filter((p) => p.is_active).length} active
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <IconTextButton
            onClick={fetchPackages}
            colors={colors}
            isMobile={isMobile}
            icon={<RefreshCw size={15} />}
            label="Refresh"
          />
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: isMobile ? "9px 14px" : "10px 18px",
              borderRadius: 10,
              border: "none",
              background: colors.btnBg,
              color: colors.btnText,
              fontWeight: 600,
              fontSize: isMobile ? 13 : 14,
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              boxShadow: `0 2px 8px ${colors.btnBg}33`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = `0 6px 18px ${colors.btnBg}44`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 2px 8px ${colors.btnBg}33`;
            }}
          >
            <Plus size={16} />
            Add package
          </button>
        </div>
      </div>

      
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 16,
        }}
      >
        
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Chip
            active={selectedNetwork === "ALL"}
            onClick={() => setSelectedNetwork("ALL")}
            colors={colors}
            label="All"
            count={networkCounts.ALL}
          />
          {Object.entries(NETWORKS).map(([key, meta]) => (
            <Chip
              key={key}
              active={selectedNetwork === key}
              onClick={() => setSelectedNetwork(key)}
              colors={colors}
              label={meta.label}
              count={networkCounts[key] || 0}
              dotColor={meta.color}
            />
          ))}
        </div>

        
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <Search
              size={15}
              color={colors.secondaryText}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search by network, size, or creator"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: 10,
                border: `1px solid ${
                  searchQuery ? colors.btnBg : colors.border
                }`,
                background: colors.raisedBg,
                color: colors.text,
                fontSize: 13.5,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                boxShadow: searchQuery ? `0 0 0 3px ${colors.btnBg}22` : "none",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: colors.secondaryText,
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div
            style={{
              display: "inline-flex",
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              overflow: "hidden",
              background: colors.raisedBg,
            }}
          >
            <ViewToggleBtn
              active={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              colors={colors}
            >
              <LayoutGrid size={15} />
            </ViewToggleBtn>
            <ViewToggleBtn
              active={viewMode === "list"}
              onClick={() => setViewMode("list")}
              colors={colors}
            >
              <ListIcon size={15} />
            </ViewToggleBtn>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedNetwork("ALL");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.btnBg,
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 4px",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      
      {filteredPackages.length === 0 ? (
        <EmptyState
          colors={colors}
          isMobile={isMobile}
          filtered={hasActiveFilters}
          onAdd={() => {
            resetForm();
            setShowAddModal(true);
          }}
          onClear={() => {
            setSearchQuery("");
            setSelectedNetwork("ALL");
          }}
        />
      ) : viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr 1fr"
              : "repeat(auto-fill, minmax(260px, 1fr))",
            gap: isMobile ? 10 : 14,
          }}
        >
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              colors={colors}
              isMobile={isMobile}
              onEdit={() => openEditModal(pkg)}
              onToggle={() => handleToggleStatus(pkg)}
            />
          ))}
        </div>
      ) : (
        <PackageTable
          packages={filteredPackages}
          colors={colors}
          isMobile={isMobile}
          onEdit={openEditModal}
          onToggle={handleToggleStatus}
          formatDate={formatDate}
        />
      )}

      
      {(showAddModal || showEditModal) && (
        <PackageModal
          colors={colors}
          isMobile={isMobile}
          isEdit={showEditModal}
          formData={formData}
          formErrors={formErrors}
          onChange={handleInputChange}
          onSubmit={(e) => submitPackage(e, showEditModal)}
          onClose={closeModal}
          isSubmitting={isSubmitting}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};


const IconTextButton = ({ onClick, colors, isMobile, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: isMobile ? "9px 12px" : "10px 14px",
      borderRadius: 10,
      border: `1px solid ${colors.border}`,
      background: colors.raisedBg,
      color: colors.text,
      cursor: "pointer",
      fontSize: isMobile ? 13 : 14,
      fontWeight: 500,
      transition: "background 0.15s ease",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverBg)}
    onMouseLeave={(e) => (e.currentTarget.style.background = colors.raisedBg)}
  >
    {icon}
    {!isMobile && label}
  </button>
);

const Chip = ({ active, onClick, colors, label, count, dotColor }) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "7px 12px",
      borderRadius: 999,
      border: `1px solid ${active ? colors.btnBg : colors.border}`,
      background: active ? colors.btnBg : colors.raisedBg,
      color: active ? colors.btnText : colors.text,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.15s ease",
    }}
  >
    {dotColor && (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dotColor,
          flexShrink: 0,
        }}
      />
    )}
    <span>{label}</span>
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        opacity: active ? 0.85 : 0.6,
        padding: "1px 7px",
        borderRadius: 999,
        background: active ? "rgba(255,255,255,0.18)" : colors.subtleBg,
      }}
    >
      {count}
    </span>
  </button>
);

const ViewToggleBtn = ({ active, onClick, colors, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: "9px 11px",
      border: "none",
      background: active ? colors.btnBg : "transparent",
      color: active ? colors.btnText : colors.secondaryText,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 0.15s ease, color 0.15s ease",
    }}
  >
    {children}
  </button>
);

const PackageCard = ({ pkg, colors, isMobile, onEdit, onToggle }) => {
  const meta = networkMeta(pkg.network);
  return (
    <div
      style={{
        position: "relative",
        background: colors.raisedBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: isMobile ? 14 : 18,
        opacity: pkg.is_active ? 1 : 0.55,
        transition: "border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 24px ${colors.shadow}`;
        e.currentTarget.style.borderColor = meta.color + "55";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 3,
          background: meta.color,
        }}
      />

      
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: meta.color,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: meta.color,
              }}
            />
            {meta.label}
          </div>
          <div
            style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: colors.heading,
            }}
          >
            {pkg.size_gb}
            <span
              style={{
                fontSize: isMobile ? 12 : 14,
                fontWeight: 600,
                color: colors.secondaryText,
                marginLeft: 3,
              }}
            >
              GB
            </span>
          </div>
        </div>

        <button
          onClick={onToggle}
          title={pkg.is_active ? "Deactivate" : "Activate"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 9px",
            borderRadius: 999,
            border: `1px solid ${
              pkg.is_active ? "#10B98155" : colors.border
            }`,
            background: pkg.is_active
              ? "rgba(16,185,129,0.12)"
              : colors.subtleBg,
            color: pkg.is_active ? "#10B981" : colors.secondaryText,
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {pkg.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
          {pkg.is_active ? "Active" : "Off"}
        </button>
      </div>

      
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          padding: "12px 0",
          borderTop: `1px solid ${colors.separator || colors.border}`,
          borderBottom: `1px solid ${colors.separator || colors.border}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: colors.secondaryText,
              marginBottom: 2,
            }}
          >
            Customer
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: colors.heading,
              letterSpacing: "-0.01em",
            }}
          >
            ₵{pkg.base_price_customer}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: colors.secondaryText,
              marginBottom: 2,
            }}
          >
            Agent
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: colors.linkColor,
              letterSpacing: "-0.01em",
            }}
          >
            ₵{pkg.base_price_agent}
          </div>
        </div>
      </div>

      
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: colors.secondaryText,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {pkg.created_by_username || "—"}
        </div>
        <button
          onClick={onEdit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            background: "transparent",
            color: colors.text,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.btnBg;
            e.currentTarget.style.color = colors.btnText;
            e.currentTarget.style.borderColor = colors.btnBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = colors.text;
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          <Edit2 size={12} />
          Edit
        </button>
      </div>
    </div>
  );
};

const PackageTable = ({
  packages,
  colors,
  isMobile,
  onEdit,
  onToggle,
  formatDate,
}) => (
  <div
    style={{
      background: colors.raisedBg,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      overflow: "hidden",
    }}
  >
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ minWidth: isMobile ? 640 : 820 }}>
        
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.1fr 1fr 1fr 1.1fr 1fr 0.9fr",
            padding: "12px 16px",
            background: colors.subtleBg,
            borderBottom: `1px solid ${colors.border}`,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: colors.secondaryText,
          }}
        >
          <span>Size</span>
          <span>Network</span>
          <span>Customer</span>
          <span>Agent</span>
          <span>Created by</span>
          <span>Date</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {packages.map((pkg) => {
          const meta = networkMeta(pkg.network);
          return (
            <div
              key={pkg.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.1fr 1fr 1fr 1.1fr 1fr 0.9fr",
                padding: "12px 16px",
                borderBottom: `1px solid ${colors.separator || colors.border}`,
                alignItems: "center",
                fontSize: 13.5,
                opacity: pkg.is_active ? 1 : 0.55,
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = colors.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{ fontWeight: 700, color: colors.heading, fontSize: 14 }}
              >
                {pkg.size_gb} GB
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: meta.color,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: meta.color,
                  }}
                />
                {meta.label}
              </span>
              <span style={{ fontWeight: 700, color: colors.heading }}>
                ₵{pkg.base_price_customer}
              </span>
              <span style={{ fontWeight: 700, color: colors.linkColor }}>
                ₵{pkg.base_price_agent}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  color: colors.secondaryText,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {pkg.created_by_username || "—"}
              </span>
              <span style={{ fontSize: 12.5, color: colors.secondaryText }}>
                {formatDate(pkg.created_at)}
              </span>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <SmallBtn
                  colors={colors}
                  onClick={() => onToggle(pkg)}
                  active={pkg.is_active}
                >
                  {pkg.is_active ? "Off" : "On"}
                </SmallBtn>
                <SmallBtn colors={colors} onClick={() => onEdit(pkg)} primary>
                  <Edit2 size={12} />
                </SmallBtn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const SmallBtn = ({ children, onClick, colors, primary, active }) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "5px 9px",
      borderRadius: 7,
      border: `1px solid ${
        primary ? colors.btnBg : active ? "#10B98155" : colors.border
      }`,
      background: primary
        ? colors.btnBg
        : active
        ? "rgba(16,185,129,0.10)"
        : "transparent",
      color: primary
        ? colors.btnText
        : active
        ? "#10B981"
        : colors.secondaryText,
      cursor: "pointer",
      fontSize: 11.5,
      fontWeight: 700,
      transition: "all 0.15s ease",
    }}
  >
    {children}
  </button>
);

const EmptyState = ({ colors, isMobile, filtered, onAdd, onClear }) => (
  <div
    style={{
      textAlign: "center",
      padding: isMobile ? "40px 20px" : "64px 24px",
      background: colors.raisedBg,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        margin: "0 auto 16px",
        background: colors.subtleBg,
        color: colors.secondaryText,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Package size={28} />
    </div>
    <h3
      style={{
        margin: "0 0 6px",
        fontSize: isMobile ? 16 : 17,
        fontWeight: 700,
        color: colors.heading,
      }}
    >
      {filtered ? "No matches" : "No packages yet"}
    </h3>
    <p
      style={{
        margin: "0 0 20px",
        fontSize: isMobile ? 13 : 13.5,
        color: colors.secondaryText,
        maxWidth: 360,
        marginLeft: "auto",
        marginRight: "auto",
        lineHeight: 1.5,
      }}
    >
      {filtered
        ? "Try a different network or clear the search."
        : "Add your first data package to get started."}
    </p>
    {filtered ? (
      <button
        onClick={onClear}
        style={{
          padding: "9px 18px",
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: "transparent",
          color: colors.text,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Clear filters
      </button>
    ) : (
      <button
        onClick={onAdd}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 18px",
          borderRadius: 10,
          border: "none",
          background: colors.btnBg,
          color: colors.btnText,
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13.5,
        }}
      >
        <Plus size={15} />
        Add package
      </button>
    )}
  </div>
);

const Field = ({ label, name, value, onChange, error, colors, isMobile, type = "text", step, placeholder }) => (
  <div style={{ marginBottom: 14 }}>
    <label
      style={{
        display: "block",
        fontSize: 12.5,
        fontWeight: 600,
        color: colors.text,
        marginBottom: 6,
      }}
    >
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      min={type === "number" ? 0 : undefined}
      style={{
        width: "100%",
        padding: isMobile ? "10px 12px" : "11px 14px",
        borderRadius: 10,
        border: `1px solid ${error ? colors.error : colors.border}`,
        background: colors.raisedBg,
        color: colors.text,
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        boxShadow: error ? `0 0 0 3px ${colors.errorBg}` : "none",
      }}
    />
    {error && (
      <div
        style={{
          fontSize: 11.5,
          color: colors.error,
          marginTop: 4,
        }}
      >
        {error}
      </div>
    )}
  </div>
);

const PackageModal = ({
  colors,
  isMobile,
  isEdit,
  formData,
  formErrors,
  onChange,
  onSubmit,
  onClose,
  isSubmitting,
}) => (
  <div
    onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    style={{
      position: "fixed",
      inset: 0,
      background: colors.scrim || "rgba(0,0,0,0.5)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 16,
      animation: "fadeIn 0.18s ease",
    }}
  >
    <div
      style={{
        background: colors.raisedBg,
        borderRadius: 16,
        maxWidth: 440,
        width: "100%",
        padding: isMobile ? 20 : 24,
        boxShadow: `0 24px 64px ${colors.shadow}`,
        animation: "slideUp 0.22s ease",
        boxSizing: "border-box",
        border: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 17,
            fontWeight: 800,
            color: colors.heading,
            letterSpacing: "-0.01em",
          }}
        >
          {isEdit ? "Edit package" : "New package"}
        </h3>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: colors.subtleBg,
            color: colors.text,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 600,
              color: colors.text,
              marginBottom: 6,
            }}
          >
            Network
          </label>
          <select
            name="network"
            value={formData.network}
            onChange={onChange}
            style={{
              width: "100%",
              padding: isMobile ? "10px 12px" : "11px 14px",
              borderRadius: 10,
              border: `1px solid ${
                formErrors.network ? colors.error : colors.border
              }`,
              background: colors.raisedBg,
              color: colors.text,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              appearance: "none",
            }}
          >
            <option value="">Select network</option>
            {Object.entries(NETWORKS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
          {formErrors.network && (
            <div style={{ fontSize: 11.5, color: colors.error, marginTop: 4 }}>
              {formErrors.network}
            </div>
          )}
        </div>

        <Field
          label="Size (GB)"
          name="size_gb"
          value={formData.size_gb}
          onChange={onChange}
          error={formErrors.size_gb}
          colors={colors}
          isMobile={isMobile}
          type="number"
          step="0.01"
          placeholder="e.g. 1"
        />
        <Field
          label="Customer price (₵)"
          name="base_price_customer"
          value={formData.base_price_customer}
          onChange={onChange}
          error={formErrors.base_price_customer}
          colors={colors}
          isMobile={isMobile}
          type="number"
          step="0.01"
          placeholder="e.g. 10.00"
        />
        <Field
          label="Agent price (₵)"
          name="base_price_agent"
          value={formData.base_price_agent}
          onChange={onChange}
          error={formErrors.base_price_agent}
          colors={colors}
          isMobile={isMobile}
          type="number"
          step="0.01"
          placeholder="e.g. 8.50"
        />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: "transparent",
              color: colors.text,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 11,
              borderRadius: 10,
              border: "none",
              background: colors.btnBg,
              color: colors.btnText,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: 14,
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: 13,
                    height: 13,
                    border: `2px solid ${colors.btnText}55`,
                    borderTopColor: colors.btnText,
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                Saving…
              </>
            ) : (
              <>
                <Save size={15} />
                {isEdit ? "Save changes" : "Create package"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default AdminPackages;

