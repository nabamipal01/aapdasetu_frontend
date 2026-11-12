const NOTIFICATION_EVENT = "app:alert-notifications-changed";
const STORAGE_PREFIX = "aapdasetu-alert-notifications";
const DISCOVERED_ALERTS_PREFIX = "aapdasetu-discovered-alerts";
const MAX_NOTIFICATIONS = 30;

const getUserStorageSuffix = () => {
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
        console.error("Unable to read the current user for notifications.", error);
    }

    const userId = user?.user_id ?? user?.id ?? user?.email ?? "guest";
    return userId;
};

const getStorageKey = () =>
    `${STORAGE_PREFIX}:${getUserStorageSuffix()}`;

const getDiscoveredAlertsStorageKey = () =>
    `${DISCOVERED_ALERTS_PREFIX}:${getUserStorageSuffix()}`;

const getAlertKey = (type, alertId) => {
    if (alertId == null || alertId === "") return null;

    const category = type?.toLowerCase().includes("post")
        ? "post"
        : type?.toLowerCase().includes("pre")
            ? "pre"
            : type?.toLowerCase();

    return category ? `${category}:${alertId}` : null;
};

const getDiscoveredAlertKeys = () => {
    try {
        const savedKeys = localStorage.getItem(getDiscoveredAlertsStorageKey());
        if (!savedKeys) return [];

        const keys = JSON.parse(savedKeys);
        return Array.isArray(keys) ? keys : [];
    } catch (error) {
        console.error("Unable to load discovered alerts.", error);
        return [];
    }
};

export const getAlertNotifications = () => {
    try {
        const savedNotifications = localStorage.getItem(getStorageKey());
        if (!savedNotifications) return [];

        const notifications = JSON.parse(savedNotifications);
        return Array.isArray(notifications) ? notifications : [];
    } catch (error) {
        console.error("Unable to load alert notifications.", error);
        return [];
    }
};

const saveAlertNotifications = (notifications) => {
    localStorage.setItem(
        getStorageKey(),
        JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS))
    );
    window.dispatchEvent(
        new CustomEvent(NOTIFICATION_EVENT, { detail: notifications })
    );
    return notifications;
};

export const addAlertNotification = ({
    type,
    title,
    description,
    path,
    alert,
    alertId,
    districtId,
    createdAt,
}) => {
    const notifications = getAlertNotifications();
    const alertKey = getAlertKey(type, alertId);
    if (alertKey) {
        const discoveredKeys = getDiscoveredAlertKeys();
        const alreadyNotified = notifications.some(
            (notification) =>
                getAlertKey(notification.type, notification.alertId) === alertKey
        );

        if (alreadyNotified || discoveredKeys.includes(alertKey)) {
            if (!discoveredKeys.includes(alertKey)) {
                localStorage.setItem(
                    getDiscoveredAlertsStorageKey(),
                    JSON.stringify([...discoveredKeys, alertKey])
                );
            }
            return notifications;
        }

        localStorage.setItem(
            getDiscoveredAlertsStorageKey(),
            JSON.stringify([...discoveredKeys, alertKey])
        );
    }

    const notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        title,
        description,
        path,
        alert,
        alertId,
        districtId: districtId ?? null,
        createdAt: createdAt ?? new Date().toISOString(),
        read: false,
    };

    return saveAlertNotifications([notification, ...notifications]);
};

export const markAlertNotificationRead = (id) => {
    const notifications = getAlertNotifications().map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
    );
    return saveAlertNotifications(notifications);
};

export const clearAlertNotification = (id) =>
    saveAlertNotifications(
        getAlertNotifications().filter((notification) => notification.id !== id)
    );

export const markAllAlertNotificationsRead = () => {
    const notifications = getAlertNotifications().map((notification) => ({
        ...notification,
        read: true,
    }));
    return saveAlertNotifications(notifications);
};

export const clearAlertNotifications = () => saveAlertNotifications([]);

export const ALERT_NOTIFICATIONS_EVENT = NOTIFICATION_EVENT;