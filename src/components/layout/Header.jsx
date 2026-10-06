
import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Bell,
  Check,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Siren,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/Config";
import {
  ALERT_NOTIFICATIONS_EVENT,
  getAlertNotifications,
  markAlertNotificationRead,
  markAllAlertNotificationsRead,
} from "../../utils/alertNotifications";

function Header({
  setMobileOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(
    getAlertNotifications
  );
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const syncNotifications = (event) => {
      setNotifications(
        Array.isArray(event.detail)
          ? event.detail
          : getAlertNotifications()
      );
    };
    const syncFromStorage = (event) => {
      if (event.key?.startsWith("aapdasetu-alert-notifications")) {
        setNotifications(getAlertNotifications());
      }
    };

    window.addEventListener(
      ALERT_NOTIFICATIONS_EVENT,
      syncNotifications
    );
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(
        ALERT_NOTIFICATIONS_EVENT,
        syncNotifications
      );
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

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

  const openNotification = (notification) => {
    setNotificationsOpen(false);

    const notificationType = notification.type?.toLowerCase();
    const destination = notificationType?.includes("post")
      ? "/alerts/post-alerts"
      : notificationType?.includes("pre")
        ? "/alerts/pre-alerts"
        : notification.path;

    if (!destination) {
      console.error("Alert notification is missing its destination.", notification);
      return;
    }

    navigate(destination, {
      state: {
        alertNotification: notification,
      },
    });
    setNotifications(markAlertNotificationRead(notification.id));
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
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* SOS Emergency Button */}
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
            SOS Emergency
          </span>

          <span className="sm:hidden">
            SOS
          </span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setUserMenuOpen(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Notifications
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {unreadCount
                      ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}`
                      : "Your latest alerts"}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications(markAllAlertNotificationsRead())
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    <Check size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No notifications yet. New pre-alerts and post alerts will
                    appear here.
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                        notification.read ? "bg-white" : "bg-red-50/50"
                      }`}
                    >
                      <span className="flex items-start gap-2.5">
                        {!notification.read && (
                          <span
                            aria-label="Unread"
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">
                              {notification.type}
                            </span>
                            <time className="shrink-0 text-[10px] text-slate-400">
                              {new Date(notification.createdAt).toLocaleString()}
                            </time>
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-slate-900">
                            {notification.title}
                          </span>
                          {notification.description && (
                            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">
                              {notification.description}
                            </span>
                          )}
                        </span>
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
