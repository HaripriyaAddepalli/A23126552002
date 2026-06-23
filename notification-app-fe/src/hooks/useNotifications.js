import { useState, useEffect, useCallback } from "react";
import {
  fetchAllNotifications,
  fetchPriorityNotifications,
  loggingMiddleware,
} from "../api/notifications";

// ─── Viewed tracking (in-memory only) ────────────────────────────────────────
export const useViewedNotifications = () => {
  const [viewedIds, setViewedIds] = useState(new Set());

  const markAsViewed = useCallback(
    (id) => setViewedIds((prev) => new Set([...prev, id])),
    []
  );

  const markAllAsViewed = useCallback(
    (ids) => setViewedIds((prev) => new Set([...prev, ...ids])),
    []
  );

  const isViewed = useCallback((id) => viewedIds.has(id), [viewedIds]);

  return { markAsViewed, markAllAsViewed, isViewed };
};

// ─── All notifications hook ─────────────────────────────────────────────────
export const useAllNotifications = (filter, page) => {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    loggingMiddleware.info(`useAllNotifications: filter=${filter} page=${page}`);

    try {
      const data = await fetchAllNotifications({
        limit: 10,
        page,
        notification_type: filter,
      });
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch {
      setError(
        "Could not load notifications. Make sure the backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    // execute after paint to avoid cascading re-renders
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return { notifications, total, loading, error, refetch: load };
};

// ─── Priority notifications hook ────────────────────────────────────────────
export const usePriorityNotifications = (n) => {
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    loggingMiddleware.info(`usePriorityNotifications: n=${n}`);

    try {
      const data = await fetchPriorityNotifications(n);
      setNotifications(data.priority_notifications || []);
      setMeta(data);
    } catch {
      setError(
        "Could not load priority notifications. Make sure the backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  }, [n]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  return { notifications, meta, loading, error, refetch: load };
};

