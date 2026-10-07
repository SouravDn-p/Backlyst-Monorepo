import React, { useMemo, useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAdminLogoutMutation } from "../../redux/feature/auth/authApi";
import { useGetAdminMeQuery } from "../../redux/feature/auth/adminProfileApi";
import {
  useGetAdminNotificationsQuery,
  useGetAdminUnreadNotificationCountQuery,
  useMarkAdminNotificationReadMutation,
  useMarkAllAdminNotificationsReadMutation,
  type AdminNotification,
} from "../../redux/feature/notification/adminNotificationApi";
import { usePermissions, type AuthSection } from "../../utils/usePermissions";
import { useAppDispatch } from "../../redux/hooks";
import { baseApi } from "../../redux/baseApi";
import {
  Award,
  BarChart2,
  BarChart3,
  Bell,
  CreditCard,
  Crown,
  DollarSign,
  Eye,
  FileText,
  Globe,
  History,
  LifeBuoy,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Users,
  UserCog,
  X,
} from "lucide-react";

// ─── Menu Definition ──────────────────────────────────────────────────────────

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  /** Backend section name. null = always visible (never happens in current design). */
  section: AuthSection | null;
  /** If true, only shown to SUPER_ADMIN — not controlled by stored permissions */
  superAdminOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: BarChart3,    label: "Admin Dashboard",          path: "/",               section: "DASHBOARD" },
  { icon: Users,        label: "Users & Accounts",         path: "/users",          section: "USERS" },
  { icon: Globe,        label: "Websites",                 path: "/websites",       section: "WEBSITES" },
  { icon: FileText,     label: "Blogs",                    path: "/blogs",          section: "BLOG" },
  { icon: ListChecks,   label: "Tasks",                    path: "/tasks",          section: "TASKS" },
  { icon: DollarSign,   label: "Credits",                  path: "/credits",        section: "CREDITS" },
  { icon: CreditCard,   label: "Subscriptions",            path: "/subscriptions",  section: "SUBSCRIPTIONS" },
  { icon: Eye,          label: "Visibility",               path: "/visibility",     section: "MARKETPLACE" },
  { icon: Award,        label: "Rewards & Badges",         path: "/rewards-badges", section: "REWARDS" },
  { icon: Share2,       label: "Referrals",                path: "/referrals",      section: "REFERRALS" },
  { icon: ShieldCheck,  label: "Compliance & Governance",  path: "/compliance",     section: "COMPLIANCE" },
  { icon: MessageSquare,label: "Messages & Files",         path: "/messages",       section: "MESSAGING" },
  { icon: LifeBuoy,     label: "Support Inquiries",        path: "/support",        section: "CONTACT" },
  { icon: BarChart2,    label: "Analytics",                path: "/analytics",      section: "ANALYTICS" },
  { icon: Settings,     label: "System Settings",          path: "/settings",       section: "PLATFORM_SETTINGS" },
  { icon: History,      label: "Audit Logs",               path: "/logs",           section: "FORENSIC_AUDIT" },
  // Super admin-only entry
  { icon: UserCog,      label: "Admin Management",         path: "/admin-management", section: "ADMIN_MANAGEMENT", superAdminOnly: true },
];

const NO_FOOTER_ROUTES = new Set([
  "/websites", "/blogs", "/tasks", "/credits", "/subscriptions",
  "/visibility", "/reviews", "/referrals", "/compliance", "/messages",
  "/support", "/analytics", "/settings", "/logs", "/admin-management",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function label(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "N/A";
}

function adminShortId(id?: string | null) {
  return id ? id.slice(0, 8).toUpperCase() : "UNKNOWN";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Avatar = ({ name, imageUrl }: { name: string; imageUrl?: string | null }) => {
  const [failed, setFailed] = useState(false);
  const initials =
    name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";

  if (!imageUrl || failed) {
    return (
      <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
        {initials}
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={name}
      className="w-11 h-11 rounded-full object-cover bg-gray-100 flex-shrink-0"
      onError={() => setFailed(true)}
    />
  );
};

const NotificationItem = ({
  item,
  onRead,
}: {
  item: AdminNotification;
  onRead: (id: string) => void;
}) => {
  const unread = item.status === "UNREAD";
  return (
    <button
      onClick={() => unread && onRead(item.id)}
      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
            unread ? "bg-[#1447E6]" : "bg-gray-200"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-bold text-gray-900 uppercase tracking-wide line-clamp-2">
              {item.title}
            </p>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                item.priority === "URGENT" || item.priority === "HIGH"
                  ? "bg-red-50 text-red-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {label(item.priority)}
            </span>
          </div>
          {item.body && (
            <p className="mt-1 text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{item.body}</p>
          )}
          <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {label(item.category)} / {formatDate(item.createdAt)}
          </p>
        </div>
      </div>
    </button>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

const RolePill = ({ role }: { role: string }) => {
  if (role === "SUPER_ADMIN") {
    return (
      <div className="flex items-center gap-1.5 mt-0.5">
        <Crown size={11} className="text-amber-500 flex-shrink-0" />
        <p className="text-[12px] font-black text-amber-600 leading-tight uppercase truncate tracking-wide">
          Super Admin
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <Shield size={11} className="text-brand-indigo flex-shrink-0" />
      <p className="text-[12px] font-black text-brand-indigo leading-tight uppercase truncate tracking-wide">
        Admin
      </p>
    </div>
  );
};

// ─── No-Permission State ──────────────────────────────────────────────────────

const NoPermissionsState = () => (
  <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-3">
    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
      <ShieldOff size={22} className="text-gray-300" />
    </div>
    <div className="text-center">
      <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider">No Sections Assigned</p>
      <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
        Contact your Super Admin to request section access.
      </p>
    </div>
  </div>
);

// ─── AdminLayout ──────────────────────────────────────────────────────────────

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [adminLogout, { isLoading: isLoggingOut }] = useAdminLogoutMutation();
  const dispatch = useAppDispatch();
  const { data: adminResponse } = useGetAdminMeQuery();
  const { data: notificationResponse, isFetching: notificationsFetching, refetch: refetchNotifications } =
    useGetAdminNotificationsQuery({ page: 1, limit: 8 });
  const { data: unreadResponse } = useGetAdminUnreadNotificationCountQuery();
  const [markRead] = useMarkAdminNotificationReadMutation();
  const [markAllRead, { isLoading: markingAllRead }] = useMarkAllAdminNotificationsReadMutation();

  // Permission hook — drives all sidebar visibility
  const { isSuperAdmin, hasSection, hasNoPermissions, isLoading: permsLoading } = usePermissions();

  const admin = adminResponse?.data;
  const adminName = admin?.name || "Admin";
  const adminRole = admin?.role ?? "ADMIN";
  const adminId = adminShortId(admin?.id);
  const unreadCount = unreadResponse?.data.count ?? 0;
  const notifications = notificationResponse?.data.data ?? [];

  // Filtered menu items based on role and permissions
  const visibleMenuItems = useMemo(() => {
    if (permsLoading) return [];
    return MENU_ITEMS.filter((item) => {
      if (item.superAdminOnly) return isSuperAdmin;
      if (!item.section) return true;
      return hasSection(item.section);
    });
  }, [isSuperAdmin, hasSection, permsLoading]);

  const handleLogout = async () => {
    try {
      await adminLogout().unwrap();
    } catch {
      // Proceed with local cleanup even if the API call fails
    } finally {
      sessionStorage.removeItem("accessToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("accessTokenExpiry");
      // Wipe the entire RTK Query cache so stale /auth/me data from
      // this session never bleeds into the next login.
      dispatch(baseApi.util.resetApiState());
      navigate("/login", { replace: true });
    }
  };

  const currentPageLabel = useMemo(() => {
    if (location.pathname === "/") return "ADMIN DASHBOARD";
    return (MENU_ITEMS.find((i) => location.pathname.startsWith(i.path) && i.path !== "/")?.label ?? "").toUpperCase();
  }, [location.pathname]);

  const handleRead = (id: string) => {
    void markRead(id);
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] font-arimo text-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`w-[240px] bg-white border-r border-gray-200 flex flex-col fixed h-full z-40 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between">
          <Link to="/" className="block">
            <img
              src="/assets/backlyst_logo_admin.png"
              alt="Backlyst"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <button
            className="lg:hidden p-1 text-gray-400 hover:text-gray-900"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Role indicator chip */}
        <div className="px-4 mb-3">
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-3 py-2">
              <Crown size={13} className="text-amber-500 flex-shrink-0" />
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                Super Admin Mode
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-brand-indigo-soft border border-brand-indigo/20 rounded-xl px-3 py-2">
              <Shield size={13} className="text-brand-indigo flex-shrink-0" />
              <span className="text-[10px] font-black text-brand-indigo uppercase tracking-widest">
                Admin — Restricted
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-[2px] overflow-y-auto custom-scrollbar">
          {permsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-gray-300" />
            </div>
          ) : hasNoPermissions ? (
            <NoPermissionsState />
          ) : (
            visibleMenuItems.map((item) => {
              const isActive = item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
              const isAdminMgmt = item.superAdminOnly;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 text-[15px] outline-none ${
                    isActive
                      ? isAdminMgmt
                        ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 font-semibold border border-amber-200"
                        : "bg-sidebar-active text-[#000000] font-semibold"
                      : isAdminMgmt
                      ? "text-amber-600 hover:bg-amber-50 hover:text-amber-700 font-medium"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-normal"
                  }`}
                >
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    className={`flex-shrink-0 ${
                      isActive
                        ? isAdminMgmt ? "text-amber-600" : "text-[#000000]"
                        : isAdminMgmt ? "text-amber-500" : "text-gray-400"
                    }`}
                  />
                  <span>{item.label}</span>
                  {isAdminMgmt && !isActive && (
                    <Crown size={11} className="ml-auto text-amber-400" />
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Footer — user card */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar name={adminName} imageUrl={admin?.imageUrl} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-gray-900 uppercase tracking-wide leading-tight truncate">
                {adminName}
              </p>
              <RolePill role={adminRole} />
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 lg:ml-[240px] flex flex-col min-h-screen w-full">
        {/* Header */}
        <header className="h-[64px] bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <button
            className="lg:hidden p-2 text-gray-500 hover:text-gray-900 mr-3"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-[15px] font-bold text-[#000000] uppercase tracking-[0.08em]">
            {currentPageLabel}
          </h1>
          <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 px-5 py-2 rounded-full">
            <span className="w-2.5 h-2.5 bg-secure-icon rounded-full flex-shrink-0" />
            <span className="text-[14px] font-bold text-brand-indigo uppercase tracking-[0.04em]">
              Secure Operational Mode
            </span>
          </div>
          <div className="flex items-center gap-4 relative">
            <div className="hidden sm:block text-right">
              <p className="text-[14px] font-bold text-gray-900 leading-tight uppercase">{adminName}</p>
              <p className="text-[12px] font-medium text-gray-400 leading-tight uppercase">
                Admin ID: {adminId}
              </p>
            </div>
            <button
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative p-1.5 text-gray-400 hover:text-brand-indigo transition-colors"
              aria-label="Open notifications"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-red-500 rounded-full ring-2 ring-white text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 top-[46px] w-[min(380px,calc(100vw-32px))] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-black uppercase tracking-wider">
                      Notifications
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                      {unreadCount} unread
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {notificationsFetching && (
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                    )}
                    <button
                      onClick={() => void refetchNotifications()}
                      className="text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-black"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => void markAllRead()}
                      disabled={markingAllRead || unreadCount === 0}
                      className="text-[10px] font-bold uppercase tracking-wider text-[#1447E6] disabled:text-gray-300"
                    >
                      Read All
                    </button>
                  </div>
                </div>
                <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[12px] font-bold uppercase tracking-wider text-gray-400">
                      No notifications found.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <NotificationItem key={item.id} item={item} onRead={handleRead} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-4 py-5 lg:px-8 lg:py-6">
          <Outlet />
        </div>

        {/* Footer */}
        {!NO_FOOTER_ROUTES.has(location.pathname) && (
          <div className="px-4 lg:px-8 pb-4">
            <footer className="bg-footer-bg text-white py-3 px-6 flex items-center text-[12px] font-bold uppercase tracking-wider rounded-xl whitespace-nowrap overflow-x-auto custom-scrollbar">
              <span className="flex-shrink-0">Microagency Environment V1.3.2</span>
              <span className="flex-shrink-0 mx-2">|</span>
              <span className="flex-shrink-0">Authorize Original Actor</span>
              <span className="flex-shrink-0 mx-3">Mappings</span>
              <span className="flex-shrink-0 mr-3">Governance</span>
              <span className="flex-shrink-0 mr-3">Verification</span>
              <span className="flex-shrink-0 mr-3">Audit Control</span>
              <span className="flex-1" />
              <span className="flex-shrink-0 italic opacity-70 text-[11px]">
                Agency Dashboard/Officers Analytics Basics
              </span>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLayout;
