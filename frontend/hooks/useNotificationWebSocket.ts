/**
 * useNotificationWebSocket
 *
 * Reuses the existing shared WebSocket singleton from useChatWebSocket and
 * listens for notification-specific events, dispatching them into the Redux
 * notification slice. Mount this hook once — inside AuthInitializer or the
 * dashboard shell — and it will stay live for the whole session.
 */
"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/redux/store/hooks";
import { useChatWebSocket, SocketEvent } from "@/hooks/useChatWebSocket";
import {
  prependNotification,
  setUnreadCount,
  markOneReadLocal,
  markAllReadLocal,
} from "@/redux/features/slice/notificationSlice";
import { INotification } from "@/types/notification/NotificationTypes";

export const useNotificationWebSocket = () => {
  const dispatch = useAppDispatch();
  const { lastEvent } = useChatWebSocket();

  useEffect(() => {
    if (!lastEvent) return;

    const { event, data } = lastEvent as SocketEvent;

    switch (event) {
      case "notification:new": {
        // data is a full INotification object
        dispatch(prependNotification(data as INotification));
        break;
      }

      case "notification:unread_count": {
        // data: { count: number }
        if (typeof data?.count === "number") {
          dispatch(setUnreadCount(data.count));
        }
        break;
      }

      case "notification:read": {
        // data: { id: string } or the full notification object
        const id: string | undefined = data?.id ?? data?.notificationId;
        if (id) {
          dispatch(markOneReadLocal(id));
        }
        break;
      }

      case "notification:read_all": {
        dispatch(markAllReadLocal());
        break;
      }

      default:
        break;
    }
  }, [lastEvent, dispatch]);
};
