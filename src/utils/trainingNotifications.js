/**
 * trainingNotifications.js
 *
 * Per-user, localStorage-backed notification store for training events.
 * Mirrors the shape and API of alertNotifications.js so the Header can
 * consume both in the same way.
 */

export const TRAINING_NOTIFICATIONS_EVENT = "app:training-notifications-changed";

const STORAGE_PREFIX  = "aapdasetu-training-notifications";
const MAX_NOTIFICATIONS = 30;

// ─── Storage key (scoped per logged-in user) ─────────────────────────────────

const getStorageKey = () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (err) {
    console.error("Unable to read the current user for training notifications.", err);
  }
  const userId = user?.user_id ?? user?.id ?? user?.email ?? "guest";
  return `${STORAGE_PREFIX}:${userId}`;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getTrainingNotifications = () => {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Unable to load training notifications.", err);
    return [];
  }
};

// ─── Write (internal) ────────────────────────────────────────────────────────

const saveTrainingNotifications = (notifications) => {
  const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
  localStorage.setItem(getStorageKey(), JSON.stringify(trimmed));
  window.dispatchEvent(
    new CustomEvent(TRAINING_NOTIFICATIONS_EVENT, { detail: trimmed })
  );
  return trimmed;
};

// ─── Add ──────────────────────────────────────────────────────────────────────

/**
 * Push a new training notification.
 *
 * @param {{ type: string, title: string, description?: string, trainingId?: number|string }} opts
 *   type        — "created" | "updated" | "deleted"
 *   title       — human-readable headline
 *   description — optional extra detail
 *   trainingId  — optional id of the affected training event
 */
export const addTrainingNotification = ({ type, title, description = "", trainingId }) => {
  const notifications = getTrainingNotifications();
  const notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    description,
    trainingId,
    path: "/training",
    createdAt: new Date().toISOString(),
    read: false,
  };
  return saveTrainingNotifications([notification, ...notifications]);
};

// ─── Mark read ────────────────────────────────────────────────────────────────

export const markTrainingNotificationRead = (id) => {
  const notifications = getTrainingNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  return saveTrainingNotifications(notifications);
};

export const clearTrainingNotification = (id) =>
  saveTrainingNotifications(
    getTrainingNotifications().filter((notification) => notification.id !== id)
  );

export const markAllTrainingNotificationsRead = () => {
  const notifications = getTrainingNotifications().map((n) => ({
    ...n,
    read: true,
  }));
  return saveTrainingNotifications(notifications);
};

export const clearTrainingNotifications = () => saveTrainingNotifications([]);
