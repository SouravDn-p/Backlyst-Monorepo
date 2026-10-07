"use client";

import React, { useMemo } from "react";
import {
  Bell,
  Check,
  Clock,
  ShieldCheck,
  UserPlus,
  Wallet,
  MessageSquare,
  Award,
  Globe,
  Settings,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectActiveTab } from "@/redux/features/slice/authSlice";
import { useNotifications } from "@/hooks/useNotifications";
import {
  INotification,
  NotificationCategory,
  NotificationEntityType,
} from "@/types/notification/NotificationTypes";
import { formatDistanceToNow } from "date-fns";

// ─── Icon mapping by category ─────────────────────────────────────────────────

interface IconConfig {
  bg: string;
  border: string;
  iconColor: string;
  icon: React.ElementType;
}

const CATEGORY_ICON: Record<NotificationCategory, IconConfig> = {
  TASK_STATUS: {
    bg: "#EEF2FF",
    border: "#C7D7FD",
    iconColor: "#6366f1",
    icon: UserPlus,
  },
  CREDIT_BALANCE: {
    bg: "#FFF6ED",
    border: "#FEC84B",
    iconColor: "#B54708",
    icon: Wallet,
  },
  DISPUTE_REVIEW: {
    bg: "#FEF2F2",
    border: "#FCA5A5",
    iconColor: "#DC2626",
    icon: Clock,
  },
  SYSTEM_ANNOUNCEMENT: {
    bg: "#F0FDF4",
    border: "#86EFAC",
    iconColor: "#15803D",
    icon: Settings,
  },
  MESSAGE: {
    bg: "#EFF6FF",
    border: "#93C5FD",
    iconColor: "#1D4ED8",
    icon: MessageSquare,
  },
  REWARD: {
    bg: "#FFFBEB",
    border: "#FCD34D",
    iconColor: "#D97706",
    icon: Award,
  },
  MARKETPLACE: {
    bg: "#ECFDF3",
    border: "#6CE9A6",
    iconColor: "#027A48",
    icon: Check,
  },
  SECURITY: {
    bg: "#ECFDF3",
    border: "#6CE9A6",
    iconColor: "#027A48",
    icon: ShieldCheck,
  },
};

const FALLBACK_ICON: IconConfig = {
  bg: "#F2F4F7",
  border: "#D0D5DD",
  iconColor: "#667085",
  icon: Bell,
};

// ─── Route helper ─────────────────────────────────────────────────────────────

const resolveRoute = (
  entityType: NotificationEntityType | null,
  entityId: string | null,
  category: NotificationCategory,
  role: "provider" | "requester"
): string | null => {
  if (!entityType) return null;

  switch (entityType) {
    case "TASK":
      return role === "provider" ? "/dashboard/jobs?tab=direct-tasks" : "/dashboard/orders";
    case "WEBSITE":
    case "CREDIT":
      return "/dashboard/wallet";
    case "MESSAGE":
      return "/dashboard/messages";
    case "REWARD":
    case "BADGE":
      return "/dashboard/rewards";
    case "SUBSCRIPTION":
      return "/dashboard/subscription";
    default:
      if (category === "SYSTEM_ANNOUNCEMENT") return "/dashboard/settings";
      return null;
  }
};

// ─── Relative time helper ─────────────────────────────────────────────────────

const relativeTime = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
};

// ─── Single notification row ──────────────────────────────────────────────────

interface NotifRowProps {
  notif: INotification;
  onRead: (id: string) => void;
  onNavigate: (route: string | null) => void;
}

const NotifRow: React.FC<NotifRowProps> = ({ notif, onRead, onNavigate }) => {
  const role = useSelector(selectActiveTab);
  const cfg = CATEGORY_ICON[notif.category] ?? FALLBACK_ICON;
  const Icon = cfg.icon;
  const isUnread = notif.status === "UNREAD";
  const route = resolveRoute(notif.entityType, notif.entityId, notif.category, role as "provider" | "requester");

  const handleClick = () => {
    onNavigate(route);
  };

  return (
    <div
      onClick={handleClick}
      role={route ? "button" : undefined}
      className={`px-5 py-4 transition-colors ${
        route ? "cursor-pointer" : ""
      } ${isUnread ? "bg-white hover:bg-[#fafafa]" : "bg-[#fafafa] hover:bg-[#f2f4f7]"}`}
    >
      <div className="flex gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border"
          style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
        >
          <Icon className="w-5 h-5" style={{ color: cfg.iconColor }} strokeWidth={2.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-bold leading-snug ${
                isUnread ? "text-[#181d27]" : "text-[#535862]"
              }`}
            >
              {notif.title}
            </p>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-[#6366f1] shrink-0 mt-1.5" />
            )}
          </div>

          <p className="text-sm text-[#535862] mt-0.5 leading-relaxed line-clamp-2">
            {notif.body}
          </p>

          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] font-semibold text-[#9DA4AE] uppercase tracking-wider">
              {relativeTime(notif.createdAt)}
            </p>
            {route && (
              <span className="text-xs font-bold text-[#F04F23] hover:text-[#d94118] transition-colors">
                View →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
    <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-3">
      <Bell className="w-6 h-6 text-[#6366f1]" />
    </div>
    <p className="text-sm font-semibold text-[#535862]">All caught up</p>
    <p className="text-xs text-[#9DA4AE] mt-1">No notifications yet</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPopover: React.FC<Props> = ({ isOpen, onClose }) => {
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    hasMore,
    hasFetched,
    isFetching,
    loadMore,
    markOne,
    markAll,
  } = useNotifications();

  // Show only the 20 most recent in the popover; full list available via "See all"
  const visibleNotifs = useMemo(() => notifications.slice(0, 20), [notifications]);

  const handleNavigate = (route: string | null) => {
    if (route) {
      router.push(route);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-transparent" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-14 md:w-105 bg-white rounded-2xl shadow-2xl border border-[#e9eaeb] z-50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#6366f1]" />
            <h3 className="text-xl font-bold font-sora text-[#181d27]">Notifications</h3>
            {unreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#F04F23] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#e9eaeb] flex items-center justify-center text-[#9DA4AE] hover:text-[#535862] hover:bg-gray-50 transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subheader */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-[#e9eaeb]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9DA4AE]">
            Recent Activity
          </span>
          {unreadCount > 0 && (
            <button
              onClick={markAll}
              className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1] hover:text-[#4f46e5] transition-colors"
            >
              Mark All As Read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[500px] overflow-y-auto divide-y divide-[#f2f4f7]">
          {/* Loading skeleton on first fetch */}
          {!hasFetched && isFetching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-[#6366f1] animate-spin" />
            </div>
          ) : visibleNotifs.length === 0 ? (
            <EmptyState />
          ) : (
            visibleNotifs.map((notif) => (
              <NotifRow
                key={notif.id}
                notif={notif}
                onRead={markOne}
                onNavigate={handleNavigate}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e9eaeb] flex flex-col gap-2">
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={isFetching}
              className="w-full flex items-center justify-center gap-2 bg-[#f2f4f7] hover:bg-[#e9eaeb] disabled:opacity-50 text-[#535862] font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-colors"
            >
              {isFetching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              Load More
            </button>
          )}
          <button
            onClick={() => {
              router.push("/dashboard/messages");
              onClose();
            }}
            className="w-full bg-[#f2f4f7] hover:bg-[#e9eaeb] text-[#535862] font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-colors"
          >
            Go to Messages
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationPopover;
