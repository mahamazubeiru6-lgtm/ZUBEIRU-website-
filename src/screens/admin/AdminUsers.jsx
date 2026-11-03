import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../providers/AuthProvider";
import { useToast } from "../../providers/ToastProvider";
import {
  Users,
  Search,
  X,
  Eye,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Shield,
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";


const ROLES = [
  { id: "ALL", label: "All Users", icon: Users },
  { id: "ADMIN", label: "Admins", icon: Shield },
  { id: "AGENT", label: "Agents", icon: UserCheck },
  { id: "SUB_AGENT", label: "Sub Agents", icon: UserX },
  { id: "CUSTOMER", label: "Customers", icon: UserPlus },
];

const STATUS_OPTIONS = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
];

const PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EAGER_FETCH_PAGE_CAP = 20;

const ROLE_COLORS = {
  ADMIN: "#EF4444",
  AGENT: "#3B82F6",
  SUB_AGENT: "#8B5CF6",
  CUSTOMER: "#10B981",
};

const ROLE_LABELS = {
  ADMIN: "Admin",
  AGENT: "Agent",
  SUB_AGENT: "Sub Agent",
  CUSTOMER: "Customer",
};


const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const getRoleColor = (r) => ROLE_COLORS[r] || "#6B7280";
const getRoleLabel = (r) => ROLE_LABELS[r] || r || "—";

const readApiError = (data, fallback) => {
  if (!data) return fallback;
  if (data.message) return data.message;
  if (data.errors) {
    const parts = [];
    for (const [k, v] of Object.entries(data.errors)) {
      const arr = Array.isArray(v) ? v : [v];
      arr.forEach((m) =>
        parts.push(
          k === "non_field_errors" || k === "detail"
            ? m
            : `${k.replace(/_/g, " ")}: ${m}`
        )
      );
    }
    if (parts.length) return parts.join(" ");
  }
  return fallback;
};


const useDebounced = (value, delay = SEARCH_DEBOUNCE_MS) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};


const parseUserSearch = (query) => {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let role = null;
  let isActive = null;
  const free = [];

  for (const tok of tokens) {
    if (tok === "admin" || tok === "admins") role = "ADMIN";
    else if (tok === "agent" || tok === "agents") role = "AGENT";
    else if (
      tok === "subagent" ||
      tok === "sub-agent" ||
      tok === "sub_agent" ||
      tok === "subagents"
    )
      role = "SUB_AGENT";
    else if (tok === "customer" || tok === "customers") role = "CUSTOMER";
    else if (tok === "active" || tok === "enabled") isActive = true;
    else if (
      tok === "inactive" ||
      tok === "disabled" ||
      tok === "deactivated"
    )
      isActive = false;
    else free.push(tok);
  }

  return { role, isActive, freeText: free.join(" ") };
};


const AdminUsers = () => {
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { authFetch } = useAuth();
  const { showToast } = useToast();

  
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [showFilterModal, setShowFilterModal] = useState(false);

  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());

  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_joined");
  const [sortOrder, setSortOrder] = useState("desc");

  
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput, SEARCH_DEBOUNCE_MS);
  const parsedSearch = useMemo(
    () => parseUserSearch(debouncedSearch),
    [debouncedSearch]
  );

  const effectiveRole = parsedSearch.role || selectedRole;
  const effectiveActive =
    parsedSearch.isActive !== null
      ? parsedSearch.isActive
        ? "ACTIVE"
        : "INACTIVE"
      : selectedStatus;
  const effectiveFreeText = parsedSearch.freeText;

  
  const [fullSet, setFullSet] = useState(null);
  const [fullFetching, setFullFetching] = useState(false);
  const fullSetKeyRef = useRef("");

  const fullSetKey = useMemo(
    () => [effectiveRole, effectiveActive, sortBy, sortOrder].join("|"),
    [effectiveRole, effectiveActive, sortBy, sortOrder]
  );

  
  const abortRef = useRef(null);
  const fullAbortRef = useRef(null);

  
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  
  const fetchUsers = useCallback(
    async ({ silent } = {}) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("page_size", String(pageSize));
        params.set("ordering", sortOrder === "desc" ? `-${sortBy}` : sortBy);
        if (effectiveRole !== "ALL") params.set("role", effectiveRole);
        if (effectiveActive !== "ALL") {
          params.set(
            "is_active",
            effectiveActive === "ACTIVE" ? "true" : "false"
          );
        }

        const res = await authFetch(
          `/accounts/users/?${params.toString()}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        if (!res.ok)
          throw new Error(readApiError(data, "Failed to fetch users"));

        setUsers(data.data || []);
        setTotalCount(data.count ?? 0);
        setTotalPages(data.total_pages ?? 1);
      } catch (err) {
        if (err.name === "AbortError") return;
        showToast(err.message || "Network error", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      authFetch,
      showToast,
      page,
      pageSize,
      sortBy,
      sortOrder,
      effectiveRole,
      effectiveActive,
    ]
  );

  
  const fetchAllPages = useCallback(async () => {
    if (fullSetKeyRef.current === fullSetKey && fullSet) return;

    if (fullAbortRef.current) fullAbortRef.current.abort();
    const controller = new AbortController();
    fullAbortRef.current = controller;

    setFullFetching(true);

    try {
      const baseParams = new URLSearchParams();
      baseParams.set("page_size", String(pageSize));
      baseParams.set(
        "ordering",
        sortOrder === "desc" ? `-${sortBy}` : sortBy
      );
      if (effectiveRole !== "ALL") baseParams.set("role", effectiveRole);
      if (effectiveActive !== "ALL") {
        baseParams.set(
          "is_active",
          effectiveActive === "ACTIVE" ? "true" : "false"
        );
      }

      baseParams.set("page", "1");
      const firstRes = await authFetch(
        `/accounts/users/?${baseParams.toString()}`,
        { signal: controller.signal }
      );
      const firstData = await firstRes.json();
      if (!firstRes.ok) {
        throw new Error(readAllError(firstData) || "Failed to fetch users");
      }

      const totalPagesRemote = firstData.total_pages || 1;
      const truncated = totalPagesRemote > EAGER_FETCH_PAGE_CAP;
      const pagesToFetch = Math.min(
        totalPagesRemote,
        EAGER_FETCH_PAGE_CAP
      );

      const remainingPages = [];
      for (let p = 2; p <= pagesToFetch; p++) remainingPages.push(p);

      const results = await Promise.all(
        remainingPages.map(async (p) => {
          const params = new URLSearchParams(baseParams);
          params.set("page", String(p));
          const res = await authFetch(
            `/accounts/users/?${params.toString()}`,
            { signal: controller.signal }
          );
          const d = await res.json();
          return res.ok ? d.data || [] : [];
        })
      );

      const all = [firstData.data || [], ...results].flat();
      setFullSet({ data: all, truncated });
      fullSetKeyRef.current = fullSetKey;
    } catch (err) {
      if (err.name === "AbortError") return;
      showToast(err.message || "Failed to load all pages", "error");
    } finally {
      setFullFetching(false);
    }
  }, [
    authFetch,
    showToast,
    fullSet,
    fullSetKey,
    pageSize,
    sortBy,
    sortOrder,
    effectiveRole,
    effectiveActive,
  ]);

  
  function readAllError(data) {
    return readApiError(data, "Failed to fetch users");
  }

  
  useEffect(() => {
    if (!effectiveFreeText) fetchUsers();
  }, [fetchUsers, effectiveFreeText]);

  useEffect(() => {
    if (effectiveFreeText && !fullFetching) fetchAllPages();
  }, [effectiveFreeText, fullSetKey]);

  
  useEffect(() => {
    if (!effectiveFreeText) {
      setFullSet(null);
      fullSetKeyRef.current = "";
    }
  }, [effectiveRole, effectiveActive, sortBy, sortOrder, pageSize]);

  
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(1);
  }, [effectiveRole, effectiveActive, sortBy, sortOrder, pageSize]);

  
  const sourceList = effectiveFreeText ? fullSet?.data || [] : users;

  const filteredUsers = useMemo(() => {
    const q = effectiveFreeText;
    if (!q) return sourceList;
    const tokens = q.split(/\s+/).filter(Boolean);
    return sourceList.filter((u) => {
      const hay = [
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.phone_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [sourceList, effectiveFreeText]);

  
  const toggleUserStatus = async (user) => {
    const nextActive = !user.is_active;
    setUpdatingIds((prev) => new Set(prev).add(user.id));
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, is_active: nextActive } : u
      )
    );
    setFullSet((prev) =>
      prev
        ? {
            ...prev,
            data: prev.data.map((u) =>
              u.id === user.id ? { ...u, is_active: nextActive } : u
            ),
          }
        : prev
    );
    try {
      const res = await authFetch(`/accounts/users/${user.id}/update/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(readApiError(d, "Failed to update user"));
      }
      showToast(
        `User ${nextActive ? "activated" : "deactivated"}`,
        "success"
      );
    } catch (err) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, is_active: user.is_active } : u
        )
      );
      setFullSet((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((u) =>
                u.id === user.id ? { ...u, is_active: user.is_active } : u
              ),
            }
          : prev
      );
      showToast(err.message, "error");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field)
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setSelectedRole("ALL");
    setSelectedStatus("ALL");
    setShowFilterModal(false);
    setFullSet(null);
    fullSetKeyRef.current = "";
  };

  const hasActiveFilters =
    selectedRole !== "ALL" ||
    selectedStatus !== "ALL" ||
    searchInput.trim().length > 0;

  
  const pageNumbers = useMemo(() => {
    const total = totalPages;
    const cur = page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1];
    const left = Math.max(2, cur - 1);
    const right = Math.min(total - 1, cur + 1);
    if (left > 2) out.push("…");
    for (let i = left; i <= right; i++) out.push(i);
    if (right < total - 1) out.push("…");
    out.push(total);
    return out;
  }, [page, totalPages]);

  
  if (loading) {
    return (
      <div style={styles.pageWrap}>
        <div style={styles.loadingBox(colors)}>
          <div style={styles.spinner(colors)} />
          <span style={{ color: colors.secondaryText, fontSize: 13 }}>
            Loading users…
          </span>
        </div>
      </div>
    );
  }

  const searchActive = !!effectiveFreeText;
  const showSearchLoading = searchActive && fullFetching && !fullSet;
  const displayedCount = searchActive ? filteredUsers.length : users.length;

  return (
    <div style={styles.pageWrap}>
      
      <header style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.title(colors, isMobile)}>
            <Users size={isMobile ? 20 : 22} color={colors.btnBg} />
            Users
          </h1>
          <p style={styles.subtitle(colors, isMobile)}>
            Manage every account across the platform
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => fetchUsers({ silent: true })}
            disabled={refreshing}
            style={styles.ghostBtn(colors, refreshing)}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing
                  ? "au-spin 0.8s linear infinite"
                  : "none",
              }}
            />
            {!isMobile && (refreshing ? "Refreshing…" : "Refresh")}
          </button>
        </div>
      </header>

      
      <nav style={styles.roleTabs(colors, isMobile)}>
        {ROLES.map((role) => {
          const Icon = role.icon;
          const active = effectiveRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role.id)}
              style={styles.roleTab(colors, active, isMobile)}
            >
              <Icon size={isMobile ? 13 : 14} />
              <span>{isMobile ? role.label.split(" ")[0] : role.label}</span>
            </button>
          );
        })}
      </nav>

      
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search
            size={15}
            color={colors.secondaryText}
            style={styles.searchIcon}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              isMobile
                ? "Search users…"
                : "Search — try 'agent', 'active', 'jane', an email…"
            }
            style={styles.searchInput(colors, !!searchInput)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              style={styles.searchClear(colors)}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!isMobile && (
          <div style={styles.statusGroup(colors)}>
            {STATUS_OPTIONS.map((s) => {
              const active = effectiveActive === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStatus(s.id)}
                  style={styles.statusBtn(colors, active)}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {isMobile && (
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            style={styles.filterBtn(colors, hasActiveFilters)}
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasActiveFilters && (
              <span style={styles.filterCount(colors)}>
                {
                  [
                    selectedRole !== "ALL",
                    selectedStatus !== "ALL",
                    searchInput.trim().length > 0,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </button>
        )}

        {!isMobile && (
          <div style={styles.pageSizeWrap(colors)}>
            <span style={styles.pageSizeLabel(colors)}>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={styles.pageSizeSelect(colors)}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && !isMobile && (
          <button
            type="button"
            onClick={clearFilters}
            style={styles.clearBtn(colors)}
          >
            Clear
          </button>
        )}
      </div>

      
      <div style={styles.resultBar(colors)}>
        <span>
          {searchActive ? (
            <>
              Showing{" "}
              <strong style={{ color: colors.heading }}>
                {displayedCount}
              </strong>{" "}
              matching user{displayedCount === 1 ? "" : "s"}
              {fullSet?.truncated && (
                <span style={{ color: colors.warning }}>
                  {" "}
                  · limited to first{" "}
                  {EAGER_FETCH_PAGE_CAP * pageSize}
                </span>
              )}
            </>
          ) : (
            <>
              Showing{" "}
              <strong style={{ color: colors.heading }}>
                {displayedCount}
              </strong>{" "}
              of{" "}
              <strong style={{ color: colors.heading }}>
                {totalCount}
              </strong>{" "}
              user{totalCount === 1 ? "" : "s"}
            </>
          )}
          {(parsedSearch.role || parsedSearch.isActive !== null) && (
            <span style={{ color: colors.secondaryText }}>
              {" "}
              · filtered by server
            </span>
          )}
        </span>
        {!isMobile && (
          <div style={styles.sortBar}>
            <span style={styles.sortLabel(colors)}>Sort</span>
            <SortPill
              colors={colors}
              label="Joined"
              active={sortBy === "date_joined"}
              order={sortOrder}
              onClick={() => toggleSort("date_joined")}
            />
            <SortPill
              colors={colors}
              label="Username"
              active={sortBy === "username"}
              order={sortOrder}
              onClick={() => toggleSort("username")}
            />
          </div>
        )}
      </div>

      
      {searchActive && fullSet?.truncated && (
        <div style={styles.hintBanner(colors)}>
          <Sparkles size={14} color={colors.warning} />
          <span style={{ flex: 1, fontSize: 12, color: colors.text }}>
            Search scanned the first {EAGER_FETCH_PAGE_CAP * pageSize} users.
            Narrow with a role or status filter to search more.
          </span>
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            style={styles.hintBtn(colors)}
          >
            Add filter
          </button>
        </div>
      )}

      
      {showSearchLoading ? (
        <div style={styles.loadingBox(colors)}>
          <div style={styles.spinner(colors)} />
          <span style={{ color: colors.secondaryText, fontSize: 13 }}>
            Searching all pages…
          </span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState colors={colors} hasSearch={searchActive} />
      ) : isMobile ? (
        <div style={{ display: "grid", gap: 10 }}>
          {filteredUsers.map((user) => (
            <MobileUserCard
              key={user.id}
              user={user}
              colors={colors}
              busy={updatingIds.has(user.id)}
              onView={() => navigate(`/admin/users/${user.id}`)}
              onToggle={() => toggleUserStatus(user)}
            />
          ))}
        </div>
      ) : (
        <div style={styles.tableWrap(colors)}>
          <div style={styles.tableHead(colors)}>
            <span>User</span>
            <span>Contact</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {filteredUsers.map((user) => (
            <DesktopUserRow
              key={user.id}
              user={user}
              colors={colors}
              busy={updatingIds.has(user.id)}
              onView={() => navigate(`/admin/users/${user.id}`)}
              onToggle={() => toggleUserStatus(user)}
            />
          ))}
        </div>
      )}

      
      {!searchActive && totalPages > 1 && (
        <Pagination
          colors={colors}
          page={page}
          totalPages={totalPages}
          pages={pageNumbers}
          onPage={setPage}
          isMobile={isMobile}
        />
      )}

      
      {isMobile && showFilterModal && (
        <MobileFilterSheet
          colors={colors}
          roles={ROLES}
          statuses={STATUS_OPTIONS}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          onClose={() => setShowFilterModal(false)}
          onReset={clearFilters}
        />
      )}

      <style>{`@keyframes au-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};


const DesktopUserRow = ({ user, colors, busy, onView, onToggle }) => {
  const roleColor = getRoleColor(user.role);
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username ||
    "—";
  return (
    <div
      style={styles.tableRow(colors, busy)}
      onMouseEnter={(e) => (e.currentTarget.style.background = colors.hoverBg)}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        <Avatar name={displayName} color={roleColor} size={34} />
        <div style={{ minWidth: 0 }}>
          <div style={styles.userName(colors)}>{displayName}</div>
          <div style={styles.userHandle(colors)}>
            @{user.username || "—"}
          </div>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={styles.contactLine(colors)}>
          <Mail size={12} color={colors.secondaryText} />
          <span style={styles.contactText}>{user.email || "—"}</span>
        </div>
        {user.phone_number && (
          <div style={styles.contactLine(colors, true)}>
            <Phone size={12} color={colors.secondaryText} />
            <span style={styles.contactText}>{user.phone_number}</span>
          </div>
        )}
      </div>
      <div>
        <RolePill color={roleColor} label={getRoleLabel(user.role)} />
      </div>
      <div>
        <StatusPill colors={colors} active={user.is_active} />
      </div>
      <div style={styles.dateCell(colors)}>
        {formatDate(user.date_joined)}
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}
      >
        <button type="button" onClick={onView} style={styles.rowBtn(colors)}>
          <Eye size={12} /> View
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          title={user.is_active ? "Deactivate" : "Activate"}
          style={styles.rowBtn(colors, busy)}
        >
          {user.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
        </button>
      </div>
    </div>
  );
};


const MobileUserCard = ({ user, colors, busy, onView, onToggle }) => {
  const roleColor = getRoleColor(user.role);
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.username ||
    "—";
  return (
    <div style={styles.mobileCard(colors, busy)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={displayName} color={roleColor} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.mobileName(colors)}>{displayName}</div>
          <div style={styles.userHandle(colors)}>
            @{user.username || "—"}
          </div>
        </div>
        <RolePill color={roleColor} label={getRoleLabel(user.role)} small />
      </div>
      <div style={styles.mobileGrid}>
        <div>
          <div style={styles.mobileLabel(colors)}>Email</div>
          <div style={styles.mobileValue(colors)}>{user.email || "—"}</div>
        </div>
        <div>
          <div style={styles.mobileLabel(colors)}>Phone</div>
          <div style={styles.mobileValue(colors)}>
            {user.phone_number || "—"}
          </div>
        </div>
        <div>
          <div style={styles.mobileLabel(colors)}>Status</div>
          <StatusPill colors={colors} active={user.is_active} />
        </div>
        <div>
          <div style={styles.mobileLabel(colors)}>Joined</div>
          <div style={styles.mobileValue(colors)}>
            {formatDate(user.date_joined)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button
          type="button"
          onClick={onView}
          style={styles.mobileAction(colors)}
        >
          <Eye size={13} /> View
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          style={styles.mobileAction(colors, busy)}
        >
          {user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
          {user.is_active ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
};


const Pagination = ({ colors, page, totalPages, pages, onPage, isMobile }) => (
  <div style={styles.paginationWrap(colors)}>
    <button
      type="button"
      onClick={() => onPage(1)}
      disabled={page === 1}
      style={styles.pgIconBtn(colors, page === 1)}
      aria-label="First"
    >
      <ChevronsLeft size={14} />
    </button>
    <button
      type="button"
      onClick={() => onPage(Math.max(1, page - 1))}
      disabled={page === 1}
      style={styles.pgIconBtn(colors, page === 1)}
      aria-label="Previous"
    >
      <ChevronLeft size={14} />
    </button>

    {!isMobile ? (
      pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} style={styles.pgEllipsis(colors)}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            style={styles.pgNumBtn(colors, p === page)}
          >
            {p}
          </button>
        )
      )
    ) : (
      <span style={styles.pgMobileLabel(colors)}>
        Page <strong style={{ color: colors.heading }}>{page}</strong> of{" "}
        {totalPages}
      </span>
    )}

    <button
      type="button"
      onClick={() => onPage(Math.min(totalPages, page + 1))}
      disabled={page === totalPages}
      style={styles.pgIconBtn(colors, page === totalPages)}
      aria-label="Next"
    >
      <ChevronRight size={14} />
    </button>
    <button
      type="button"
      onClick={() => onPage(totalPages)}
      disabled={page === totalPages}
      style={styles.pgIconBtn(colors, page === totalPages)}
      aria-label="Last"
    >
      <ChevronsRight size={14} />
    </button>
  </div>
);


const Avatar = ({ name, color, size = 34 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      background: `${color}1F`,
      color,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.round(size * 0.42),
      fontWeight: 700,
      flexShrink: 0,
    }}
  >
    {(name?.[0] || "U").toUpperCase()}
  </div>
);

const RolePill = ({ color, label, small }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: small ? "2px 8px" : "3px 10px",
      borderRadius: 999,
      background: `${color}1F`,
      color,
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      letterSpacing: 0.2,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

const StatusPill = ({ colors, active }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 9px",
      borderRadius: 999,
      background: active ? colors.successBg : colors.errorBg,
      color: active ? colors.success : colors.error,
      fontSize: 11,
      fontWeight: 700,
    }}
  >
    {active ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
    {active ? "Active" : "Inactive"}
  </span>
);

const SortPill = ({ colors, label, active, order, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 8px",
      borderRadius: 6,
      background: active ? colors.hoverBg : "transparent",
      border: "none",
      color: active ? colors.btnBg : colors.secondaryText,
      fontSize: 11,
      fontWeight: active ? 700 : 500,
      cursor: "pointer",
      fontFamily: "inherit",
    }}
  >
    {label}
    {active ? (
      order === "asc" ? (
        <ArrowUp size={11} />
      ) : (
        <ArrowDown size={11} />
      )
    ) : (
      <ArrowUpDown size={11} />
    )}
  </button>
);

const EmptyState = ({ colors, hasSearch }) => (
  <div style={styles.emptyState(colors)}>
    <div style={styles.emptyIcon(colors)}>
      <Users size={28} />
    </div>
    <h3 style={styles.emptyTitle(colors)}>
      {hasSearch ? "No matches found" : "No users yet"}
    </h3>
    <p style={styles.emptyText(colors)}>
      {hasSearch
        ? "Try a different search term or clear the filters."
        : "Users will appear here once accounts are created."}
    </p>
  </div>
);


const MobileFilterSheet = ({
  colors,
  roles,
  statuses,
  selectedRole,
  setSelectedRole,
  selectedStatus,
  setSelectedStatus,
  onClose,
  onReset,
}) => (
  <div
    onClick={(e) => e.target === e.currentTarget && onClose()}
    style={styles.sheetOverlay(colors)}
  >
    <div style={styles.sheetCard(colors)}>
      <div style={styles.sheetHeader}>
        <h3 style={styles.sheetTitle(colors)}>
          <SlidersHorizontal size={16} /> Filters
        </h3>
        <button
          type="button"
          onClick={onClose}
          style={styles.sheetClose(colors)}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={styles.sheetLabel(colors)}>Role</div>
        <div style={styles.sheetChipRow}>
          {roles.map((r) => {
            const Icon = r.icon;
            const active = selectedRole === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r.id)}
                style={styles.sheetChip(colors, active)}
              >
                <Icon size={12} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={styles.sheetLabel(colors)}>Status</div>
        <div style={styles.sheetChipRow}>
          {statuses.map((s) => {
            const active = selectedStatus === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStatus(s.id)}
                style={styles.sheetChip(colors, active)}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={styles.sheetFooter}>
        <button
          type="button"
          onClick={onReset}
          style={styles.sheetReset(colors)}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          style={styles.sheetApply(colors)}
        >
          Apply
        </button>
      </div>
    </div>
  </div>
);


const styles = {
  pageWrap: {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "20px 16px 60px",
    fontFamily: "inherit",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  title: (c, m) => ({
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: m ? 20 : 24,
    fontWeight: 800,
    color: c.heading,
    letterSpacing: "-0.02em",
  }),
  subtitle: (c, m) => ({
    margin: "4px 0 0",
    fontSize: m ? 12 : 13.5,
    color: c.secondaryText,
  }),
  headerActions: { display: "flex", gap: 8, alignItems: "center" },
  ghostBtn: (c, busy) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    background: c.raisedBg,
    color: c.text,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.7 : 1,
    fontFamily: "inherit",
  }),

  roleTabs: (c, m) => ({
    display: "grid",
    gridTemplateColumns: m
      ? "repeat(3, 1fr)"
      : "repeat(5, minmax(0, 1fr))",
    gap: 6,
    padding: 6,
    borderRadius: 12,
    background: c.subtleBg,
    border: `1px solid ${c.border}`,
    marginBottom: 14,
  }),
  roleTab: (c, active, m) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: m ? "7px 8px" : "9px 14px",
    borderRadius: 8,
    border: "none",
    background: active ? c.raisedBg : "transparent",
    color: active ? c.btnBg : c.secondaryText,
    fontSize: m ? 11.5 : 12.5,
    fontWeight: active ? 700 : 600,
    cursor: "pointer",
    boxShadow: active ? `0 1px 3px ${c.shadow}` : "none",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),

  toolbar: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  searchWrap: {
    flex: 1,
    minWidth: 220,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  searchInput: (c, active) => ({
    width: "100%",
    padding: "10px 34px 10px 36px",
    borderRadius: 10,
    border: `1.5px solid ${active ? c.btnBg : c.border}`,
    background: c.raisedBg,
    color: c.text,
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    boxShadow: active ? `0 0 0 3px ${c.btnBg}20` : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  }),
  searchClear: (c) => ({
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: c.secondaryText,
    cursor: "pointer",
    padding: 4,
    borderRadius: 6,
  }),
  statusGroup: (c) => ({
    display: "flex",
    gap: 2,
    padding: 3,
    borderRadius: 10,
    background: c.subtleBg,
    border: `1px solid ${c.border}`,
  }),
  statusBtn: (c, active) => ({
    padding: "6px 12px",
    borderRadius: 7,
    border: "none",
    background: active ? c.raisedBg : "transparent",
    color: active ? c.btnBg : c.secondaryText,
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  filterBtn: (c, active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 12px",
    borderRadius: 10,
    border: `1.5px solid ${active ? c.btnBg : c.border}`,
    background: active ? `${c.btnBg}0F` : c.raisedBg,
    color: active ? c.btnBg : c.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  filterCount: (c) => ({
    padding: "0 6px",
    borderRadius: 999,
    background: c.btnBg,
    color: c.btnText,
    fontSize: 10,
    fontWeight: 700,
  }),
  pageSizeWrap: (c) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 4px 4px 12px",
    borderRadius: 10,
    border: `1px solid ${c.border}`,
    background: c.raisedBg,
  }),
  pageSizeLabel: (c) => ({
    fontSize: 11.5,
    color: c.secondaryText,
    fontWeight: 600,
  }),
  pageSizeSelect: (c) => ({
    padding: "6px 8px",
    borderRadius: 7,
    border: "none",
    background: c.subtleBg,
    color: c.text,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    outline: "none",
  }),
  clearBtn: (c) => ({
    padding: "8px 12px",
    borderRadius: 8,
    background: "transparent",
    border: "none",
    color: c.btnBg,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  }),

  resultBar: (c) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    fontSize: 12.5,
    color: c.secondaryText,
    padding: "8px 0",
    marginBottom: 8,
  }),
  sortBar: { display: "flex", alignItems: "center", gap: 4 },
  sortLabel: (c) => ({
    fontSize: 11,
    color: c.secondaryText,
    fontWeight: 600,
    marginRight: 2,
  }),

  hintBanner: (c) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 10,
    background: c.warningBg,
    border: `1px solid ${c.warning}55`,
    marginBottom: 12,
  }),
  hintBtn: (c) => ({
    padding: "6px 12px",
    borderRadius: 8,
    border: "none",
    background: c.warning,
    color: "#fff",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  }),

  tableWrap: (c) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    overflow: "hidden",
  }),
  tableHead: (c) => ({
    display: "grid",
    gridTemplateColumns:
      "minmax(200px, 1.4fr) minmax(180px, 1.3fr) 120px 100px 100px 140px",
    gap: 10,
    padding: "12px 18px",
    background: c.subtleBg,
    borderBottom: `1px solid ${c.border}`,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: c.secondaryText,
  }),
  tableRow: (c, busy) => ({
    display: "grid",
    gridTemplateColumns:
      "minmax(200px, 1.4fr) minmax(180px, 1.3fr) 120px 100px 100px 140px",
    gap: 10,
    padding: "12px 18px",
    borderBottom: `1px solid ${c.border}`,
    alignItems: "center",
    fontSize: 12.5,
    transition: "background 0.12s ease",
    opacity: busy ? 0.55 : 1,
  }),
  userName: (c) => ({
    fontSize: 13,
    fontWeight: 700,
    color: c.heading,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  userHandle: (c) => ({
    fontSize: 11,
    color: c.secondaryText,
    marginTop: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  contactLine: (c, secondary) => ({
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: secondary ? 11 : 12,
    color: secondary ? c.secondaryText : c.text,
    marginTop: secondary ? 3 : 0,
    minWidth: 0,
  }),
  contactText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dateCell: (c) => ({ fontSize: 12, color: c.secondaryText }),
  rowBtn: (c, disabled) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 10px",
    borderRadius: 7,
    border: `1px solid ${c.border}`,
    background: "transparent",
    color: c.text,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  }),

  paginationWrap: (c) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 20,
    paddingTop: 16,
    borderTop: `1px solid ${c.border}`,
    flexWrap: "wrap",
  }),
  pgIconBtn: (c, disabled) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    background: c.raisedBg,
    color: disabled ? c.border : c.text,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  }),
  pgNumBtn: (c, active) => ({
    minWidth: 32,
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${active ? c.btnBg : c.border}`,
    background: active ? c.btnBg : c.raisedBg,
    color: active ? c.btnText : c.text,
    fontSize: 12.5,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  pgEllipsis: (c) => ({
    minWidth: 24,
    textAlign: "center",
    color: c.secondaryText,
    fontSize: 12,
    userSelect: "none",
  }),
  pgMobileLabel: (c) => ({
    fontSize: 12,
    color: c.secondaryText,
    padding: "0 10px",
  }),

  mobileCard: (c, busy) => ({
    background: c.raisedBg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    padding: 14,
    opacity: busy ? 0.6 : 1,
    transition: "opacity 0.15s ease",
  }),
  mobileName: (c) => ({
    fontSize: 14,
    fontWeight: 700,
    color: c.heading,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  mobileGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    paddingTop: 12,
    marginTop: 12,
  },
  mobileLabel: (c) => ({
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: c.secondaryText,
    marginBottom: 3,
  }),
  mobileValue: (c) => ({
    fontSize: 12,
    color: c.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  mobileAction: (c, disabled) => ({
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "9px 10px",
    borderRadius: 9,
    border: `1px solid ${c.border}`,
    background: "transparent",
    color: c.text,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
  }),

  emptyState: (c) => ({
    padding: 48,
    textAlign: "center",
    borderRadius: 12,
    border: `1px dashed ${c.border}`,
    background: c.raisedBg,
  }),
  emptyIcon: (c) => ({
    width: 56,
    height: 56,
    borderRadius: 16,
    background: c.subtleBg,
    color: c.secondaryText,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  }),
  emptyTitle: (c) => ({
    margin: "0 0 4px",
    fontSize: 15,
    fontWeight: 800,
    color: c.heading,
  }),
  emptyText: (c) => ({
    margin: 0,
    fontSize: 12.5,
    color: c.secondaryText,
  }),

  loadingBox: (c) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 320,
    gap: 12,
  }),
  spinner: (c) => ({
    width: 32,
    height: 32,
    border: `3px solid ${c.border}`,
    borderTopColor: c.btnBg,
    borderRadius: "50%",
    animation: "au-spin 0.8s linear infinite",
  }),

  sheetOverlay: (c) => ({
    position: "fixed",
    inset: 0,
    background: c.scrim,
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1000,
  }),
  sheetCard: (c) => ({
    background: c.raisedBg,
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 500,
    padding: "20px 20px 28px",
    boxShadow: `0 -12px 40px ${c.shadowStrong}`,
    maxHeight: "80vh",
    overflowY: "auto",
  }),
  sheetHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sheetTitle: (c) => ({
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
    fontWeight: 800,
    color: c.heading,
  }),
  sheetClose: (c) => ({
    background: c.subtleBg,
    border: "none",
    borderRadius: 8,
    padding: 6,
    color: c.text,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  sheetLabel: (c) => ({
    fontSize: 12,
    fontWeight: 700,
    color: c.text,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  }),
  sheetChipRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  sheetChip: (c, active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 12px",
    borderRadius: 8,
    border: `1.5px solid ${active ? c.btnBg : c.border}`,
    background: active ? c.btnBg : "transparent",
    color: active ? c.btnText : c.text,
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  sheetFooter: {
    display: "flex",
    gap: 8,
    paddingTop: 16,
    borderTop: "1px solid transparent",
  },
  sheetReset: (c) => ({
    flex: 1,
    padding: "11px 14px",
    borderRadius: 10,
    border: `1.5px solid ${c.border}`,
    background: "transparent",
    color: c.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  sheetApply: (c) => ({
    flex: 2,
    padding: "11px 14px",
    borderRadius: 10,
    border: "none",
    background: c.btnBg,
    color: c.btnText,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
};

export default AdminUsers;

