import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { INotification, INotificationPreferences } from "@/types/notification/NotificationTypes";
import { RootState } from "@/redux/store/store";

interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
  preferences: INotificationPreferences | null;
  // Track the total from the latest REST response for "Load More" visibility
  totalCount: number;
  // Whether we have loaded at least once (to distinguish "loading" from "empty")
  hasFetched: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  totalCount: 0,
  hasFetched: false,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,

  reducers: {
    // Called after REST list fetch to seed / replace the in-memory list
    setNotifications(
      state,
      action: PayloadAction<{ notifications: INotification[]; total: number; append: boolean }>
    ) {
      if (action.payload.append) {
        // Merge: avoid duplicates by id
        const existingIds = new Set(state.notifications.map((n) => n.id));
        const incoming = action.payload.notifications.filter(
          (n) => !existingIds.has(n.id)
        );
        state.notifications = [...state.notifications, ...incoming];
      } else {
        state.notifications = action.payload.notifications;
      }
      state.totalCount = action.payload.total;
      state.hasFetched = true;
    },

    // Called after REST unread-count fetch or ws notification:unread_count
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },

    // WS notification:new — prepend a fresh notification
    prependNotification(state, action: PayloadAction<INotification>) {
      const exists = state.notifications.some((n) => n.id === action.payload.id);
      if (!exists) {
        state.notifications = [action.payload, ...state.notifications];
        state.totalCount += 1;
      }
    },

    // WS notification:read or after PATCH /:id/read
    markOneReadLocal(state, action: PayloadAction<string>) {
      const idx = state.notifications.findIndex((n) => n.id === action.payload);
      if (idx !== -1 && state.notifications[idx].status === "UNREAD") {
        state.notifications[idx].status = "READ";
        state.notifications[idx].readAt = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    // WS notification:read_all or after PATCH /read-all
    markAllReadLocal(state) {
      state.notifications = state.notifications.map((n) =>
        n.status === "UNREAD"
          ? { ...n, status: "READ", readAt: new Date().toISOString() }
          : n
      );
      state.unreadCount = 0;
    },

    // After GET /notifications/preferences
    setPreferences(state, action: PayloadAction<INotificationPreferences>) {
      state.preferences = action.payload;
    },

    // Reset on logout
    resetNotifications() {
      return initialState;
    },
  },
});

export const {
  setNotifications,
  setUnreadCount,
  prependNotification,
  markOneReadLocal,
  markAllReadLocal,
  setPreferences,
  resetNotifications,
} = notificationSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectNotifications = (state: RootState) =>
  state.notification.notifications;

export const selectUnreadCount = (state: RootState) =>
  state.notification.unreadCount;

export const selectNotificationPreferences = (state: RootState) =>
  state.notification.preferences;

export const selectNotificationTotalCount = (state: RootState) =>
  state.notification.totalCount;

export const selectNotificationHasFetched = (state: RootState) =>
  state.notification.hasFetched;

export default notificationSlice.reducer;
