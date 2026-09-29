
import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Siren,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function Header({
  setMobileOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

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
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

        {/* Notification */}
        <button
          className="
            relative
            rounded-lg
            p-2
            text-slate-500
            hover:bg-slate-100
          "
        >
          <Bell size={20} />

          <span
            className="
              absolute
              right-1
              top-1
              h-2
              w-2
              rounded-full
              bg-red-500
            "
          />
        </button>

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

