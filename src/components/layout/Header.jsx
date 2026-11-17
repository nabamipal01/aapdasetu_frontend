import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Siren,
  GraduationCap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/Config";
import { useAuth } from "../../context/AuthContext";
import { isOperationalUser } from "../../utils/roles";
import {
  TRAINING_NOTIFICATIONS_EVENT,
  getTrainingNotifications,
  markTrainingNotificationRead,
  markAllTrainingNotificationsRead,
  clearTrainingNotification,
  clearTrainingNotifications,
} from "../../utils/trainingNotifications";
import { listNotifications, markNotificationRead } from "../../services/notificationService";

function Header({
  setMobileOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
  hideNav = false,
}) {
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [trainingNotifications, setTrainingNotifications] = useState(
    getTrainingNotifications
  );

  // Backend-driven alert notifications
  const [alertNotifs, setAlertNotifs] = useState([]);
  const [alertUnreadCount, setAlertUnreadCount] = useState(0);
  const [alertNotifOpen, setAlertNotifOpen] = useState(false);
  const alertNotifRef = useRef(null);

  // Training bell dropdown
  const [trainingOpen, setTrainingOpen] = useState(false);
  const trainingRef = useRef(null);

  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  // Fetch backend notifications on mount and when user changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listNotifications(1, 20)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res?.data) {
          setAlertNotifs(res.data.notifications ?? []);
          setAlertUnreadCount(res.data.unread_count ?? 0);
        }
      })
      .catch((err) => console.error('Failed to load notifications', err));
    return () => { cancelled = true; };
  }, [user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
      if (
        alertNotifRef.current &&
        !alertNotifRef.current.contains(event.target)
      ) {
        setAlertNotifOpen(false);
      }
      if (
        trainingRef.current &&
        !trainingRef.current.contains(event.target)
      ) {
        setTrainingOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync training notifications from custom event / storage
  useEffect(() => {
    const syncTraining = (event) => {
      setTrainingNotifications(
        Array.isArray(event.detail)
          ? event.detail
          : getTrainingNotifications()
      );
    };
    const syncTrainingFromStorage = (event) => {
      if (event.key?.startsWith("aapdasetu-training-notifications")) {
        setTrainingNotifications(getTrainingNotifications());
      }
    };

    window.addEventListener(TRAINING_NOTIFICATIONS_EVENT, syncTraining);
    window.addEventListener("storage", syncTrainingFromStorage);

    return () => {
      window.removeEventListener(TRAINING_NOTIFICATIONS_EVENT, syncTraining);
      window.removeEventListener("storage", syncTrainingFromStorage);
    };
  }, []);

  // Re-read notification stores when the logged-in user changes so that
  // per-user read status persisted in localStorage is restored on login.
  useEffect(() => {
    setTrainingNotifications(getTrainingNotifications());
  }, [user]);

  const handleAlertNotifClick = async (notif) => {
    setAlertNotifOpen(false);
    if (!notif.is_read) {
      try {
        await markNotificationRead(notif.notification_type, notif.notification_id);
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
      setAlertNotifs((prev) =>
        prev.map((n) =>
          n.notification_id === notif.notification_id && n.notification_type === notif.notification_type
            ? { ...n, is_read: true }
            : n
        )
      );
      setAlertUnreadCount((c) => Math.max(0, c - 1));
    }
    const dest = notif.notification_type === 'post_alert' ? '/alerts/post-alerts' : '/alerts/pre-alerts';
    navigate(dest);
  };

  const handleMarkAllRead = async () => {
    const unread = alertNotifs.filter((n) => !n.is_read);
    for (const notif of unread) {
      try {
        await markNotificationRead(notif.notification_type, notif.notification_id);
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
    }
    setAlertNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setAlertUnreadCount(0);
  };

  const openTrainingNotification = (notification) => {
    setTrainingOpen(false);
    const destination = notification.path || '/training';
    setTrainingNotifications(markTrainingNotificationRead(notification.id));
    navigate(destination, { state: { trainingNotification: notification } });
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/auth/logout.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
          body: JSON.stringify({
            token: token,
          }),
        }
      );

      const data = await response.json();

      console.log("Logout response:", data);

      if (response.ok) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");

        window.location.href = "/login";
      } else {
        console.error("Logout failed:", data);

        alert(
          data.message || "Logout failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Logout API error:", error);

      // Clear local login data even if API is unavailable
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      window.location.href = "/login";
    }
  };

  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        h-20
        items-center
        justify-between
        border-b
        border-slate-200
        bg-white
        px-4
        shadow-sm
        sm:px-6
      "
    >
      {/* Left Side */}
      <div className="flex items-center gap-3">
        {!hideNav && (
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(true)}
              className="
                rounded-lg
                p-2
                text-slate-600
                hover:bg-slate-100
                lg:hidden
              "
            >
              <Menu size={22} />
            </button>

            {/* Sidebar collapse */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="
                hidden
                rounded-lg
                p-2
                text-slate-600
                hover:bg-slate-100
                lg:block
              "
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={22} />
              ) : (
                <PanelLeftClose size={22} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 sm:gap-4">

        {!isOperationalUser(user) && (
          <button
            onClick={() => navigate("/emergency")}
            className="
              flex
              items-center
              gap-2
              rounded-lg
              bg-red-600
              px-3
              py-2
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-red-700
              focus:outline-none
              focus:ring-2
              focus:ring-red-500
              focus:ring-offset-2
              sm:px-4
            "
            title="Emergency Contacts"
          >
            <Siren size={18} />

            <span className="hidden sm:inline">
              SOS
            </span>

            <span className="sm:hidden">
              SOS
            </span>
          </button>
        )}

        {/* Backend alert notifications bell */}
        <div className="relative" ref={alertNotifRef}>
          <button
            type="button"
            aria-label={`Alert notifications${
              alertUnreadCount ? `, ${alertUnreadCount} unread` : ''
            }`}
            aria-expanded={alertNotifOpen}
            onClick={() => {
              setAlertNotifOpen((o) => !o);
              setTrainingOpen(false);
              setUserMenuOpen(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <Bell size={20} />
            {alertUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {alertUnreadCount > 99 ? '99+' : alertUnreadCount}
              </span>
            )}
          </button>

          {alertNotifOpen && (
            <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {alertUnreadCount
                      ? `${alertUnreadCount} unread notification${
                          alertUnreadCount === 1 ? '' : 's'
                        }`
                      : 'You are all caught up'}
                  </p>
                </div>
                {alertUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto">
                {alertNotifs.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No notifications yet.
                  </p>
                ) : (
                  alertNotifs.map((notif) => (
                    <button
                      key={`${notif.notification_type}-${notif.notification_id}`}
                      type="button"
                      onClick={() => handleAlertNotifClick(notif)}
                      className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        notif.is_read ? 'bg-white' : 'bg-red-50/50'
                      }`}
                    >
                      {!notif.is_read && (
                        <span
                          aria-label="Unread"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate text-[10px] font-bold uppercase tracking-wide ${
                              notif.notification_type === 'post_alert'
                                ? 'text-red-600'
                                : 'text-orange-600'
                            }`}
                          >
                            {notif.notification_type === 'post_alert' ? 'Post Alert' : 'Pre Alert'}
                          </span>
                          <time className="shrink-0 text-[10px] text-slate-400">
                            {new Date(notif.created_at).toLocaleString()}
                          </time>
                        </span>
                        <span
                          className={`mt-1 block text-sm font-semibold ${
                            notif.is_read ? 'text-slate-600' : 'text-slate-900'
                          }`}
                        >
                          {notif.title}
                        </span>
                        {notif.message && (
                          <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">
                            {notif.message}
                          </span>
                        )}
                        {notif.location && (
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {notif.location}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Training notifications bell */}
        <div className="relative" ref={trainingRef}>
          <button
            type="button"
            aria-label={`Training notifications${
              trainingNotifications.filter((n) => !n.read).length
                ? `, ${trainingNotifications.filter((n) => !n.read).length} unread`
                : ''
            }`}
            aria-expanded={trainingOpen}
            onClick={() => {
              setTrainingOpen((o) => !o);
              setAlertNotifOpen(false);
              setUserMenuOpen(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <GraduationCap size={20} />
            {trainingNotifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                {trainingNotifications.filter((n) => !n.read).length > 9
                  ? '9+'
                  : trainingNotifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>

          {trainingOpen && (
            <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Training</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {trainingNotifications.filter((n) => !n.read).length
                      ? `${trainingNotifications.filter((n) => !n.read).length} unread`
                      : 'All caught up'}
                  </p>
                </div>
                {trainingNotifications.filter((n) => !n.read).length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setTrainingNotifications(markAllTrainingNotificationsRead())
                    }
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {trainingNotifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No training notifications yet.
                  </p>
                ) : (
                  trainingNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openTrainingNotification(notification)}
                      className={`flex w-full items-start gap-2.5 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        notification.read ? 'bg-white' : 'bg-blue-50'
                      }`}
                    >
                      {!notification.read && (
                        <span
                          aria-label="Unread"
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-blue-600">
                            Training {notification.type}
                          </span>
                          <time className="shrink-0 text-[10px] text-slate-400">
                            {new Date(notification.createdAt).toLocaleString()}
                          </time>
                        </span>
                        <span
                          className={`mt-1 block text-sm font-semibold ${
                            notification.read ? 'text-slate-600' : 'text-slate-900'
                          }`}
                        >
                          {notification.title}
                        </span>
                        {notification.description && (
                          <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-600">
                            {notification.description}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="
              flex
              items-center
              gap-3
              rounded-lg
              p-1.5
              transition
              hover:bg-slate-100
            "
          >
            {/* Avatar */}
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                bg-blue-700
                text-sm
                font-bold
                text-white
              "
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            {/* User Info */}
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name || "User"}
              </p>

              <p className="text-xs text-slate-500">
                {user?.email || ""}
              </p>
            </div>

            {/* Arrow */}
            <ChevronDown
              size={16}
              className={`
                hidden
                text-slate-500
                transition-transform
                sm:block
                ${userMenuOpen ? "rotate-180" : ""}
              `}
            />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div
              className="
                absolute
                right-0
                mt-2
                w-64
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
                shadow-lg
              "
            >
              {/* User Details */}
              <div className="border-b border-slate-100 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-blue-700
                      text-sm
                      font-bold
                      text-white
                    "
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {user?.name || "User"}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-red-600
                  hover:bg-red-50
                "
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
