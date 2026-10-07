/**
 * useNotifications
 *
 * Orchestration hook that:
 *  1. Fetches the unread count on mount and syncs it to the Redux slice.
 *  2. Fetches the first page of notifications and seeds the slice.
 *  3. Exposes loadMore() for pagination.
 *  4. Exposes markOne() and markAll() that call the REST mutation and update
 *     the slice optimistically via local reducers.
 *  5. Activates the WebSocket listener (useNotificationWebSocket) so any
 *     consumer of this hook also gets live updates automatically.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/store/hooks";
import {
  selectNotifications,
  selectUnreadCount,
  selectNotificationTotalCount,
  selectNotificationHasFetched,
  setNotifications,
  setUnreadCount,
  markOneReadLocal,
  markAllReadLocal,
} from "@/redux/features/slice/notificationSlice";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkOneReadMutation,
  useMarkAllReadMutation,
} from "@/redux/features/api/notification/notificationApi";
import { useNotificationWebSocket } from "@/hooks/useNotificationWebSocket";
import { INotificationListQuery } from "@/types/notification/NotificationTypes";
import { getCookie } from "@/lib/cookie";

const PAGE_LIMIT = 20;

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = Boolean(getCookie("accessToken"));

  // ── WebSocket (reuses shared singleton) ──────────────────────────────────
  useNotificationWebSocket();

  // ── Pagination state ─────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Omit<INotificationListQuery, "page" | "limit">>({});

  // ── Redux state ───────────────────────────────────────────────────────────
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const totalCount = useAppSelector(selectNotificationTotalCount);
  const hasFetched = useAppSelector(selectNotificationHasFetched);

  // ── RTK Query ─────────────────────────────────────────────────────────────
  const { data: listData, isFetching: isFetchingList } = useGetNotificationsQuery(
    { page, limit: PAGE_LIMIT, ...filters },
    { skip: !isAuthenticated }
  );

  const { data: countData } = useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [markOneReadMutation] = useMarkOneReadMutation();
  const [markAllReadMutation] = useMarkAllReadMutation();

  // ── Sync REST responses into Redux slice ─────────────────────────────────
  const isFirstPage = useRef(true);

  useEffect(() => {
    if (!listData?.data) return;
    const { data: items, meta } = listData.data;
    dispatch(
      setNotifications({
        notifications: items,
        total: meta.total,
        append: page > 1, // append on subsequent pages
      })
    );
  }, [listData, dispatch, page]);

  useEffect(() => {
    if (typeof countData?.data?.count === "number") {
      dispatch(setUnreadCount(countData.data.count));
    }
  }, [countData, dispatch]);

  // ── Reset page when filters change ───────────────────────────────────────
  const applyFilters = useCallback(
    (newFilters: Omit<INotificationListQuery, "page" | "limit">) => {
      setPage(1);
      setFilters(newFilters);
    },
    []
  );

  // ── Load next page ────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!isFetchingList && notifications.length < totalCount) {
      setPage((p) => p + 1);
    }
  }, [isFetchingList, notifications.length, totalCount]);

  const hasMore = notifications.length < totalCount;

  // ── Mark one as read ──────────────────────────────────────────────────────
  const markOne = useCallback(
    async (id: string) => {
      // Optimistic local update first
      dispatch(markOneReadLocal(id));
      try {
        await markOneReadMutation(id).unwrap();
      } catch {
        // Failure is silent — the next REST refetch will re-sync truth.
      }
    },
    [dispatch, markOneReadMutation]
  );

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAll = useCallback(async () => {
    dispatch(markAllReadLocal());
    try {
      await markAllReadMutation().unwrap();
    } catch {
      // Silent — next refetch will re-sync.
    }
  }, [dispatch, markAllReadMutation]);

  return {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    hasFetched,
    isFetching: isFetchingList,
    loadMore,
    markOne,
    markAll,
    applyFilters,
    currentFilters: filters,
  };
};
