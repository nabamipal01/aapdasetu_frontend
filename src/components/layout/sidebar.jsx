import React, { useState } from "react";
import {
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { getMenuForRole } from "../../config/menuConfig";
import { useAuth } from "../../context/AuthContext";
import {
  getUserRole,
  isTaskOnlyRole,
} from "../../utils/roles";

function Sidebar({
  mobileOpen,
  setMobileOpen,
  collapsed,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  const role = getUserRole(user);
  const taskOnly = isTaskOnlyRole(user);

console.log("SIDEBAR AUTH DEBUG", {
  user,
  role: user?.role,
  userType: user?.user_type,
  normalizedRole: user?.role?.toLowerCase()?.trim(),
  normalizedUserType: user?.user_type?.toLowerCase()?.trim(),
  resolvedRole: getUserRole(user),
  taskOnly: isTaskOnlyRole(user),
});

  /*
   * ---------------------------------------------------------
   * MENU
   * ---------------------------------------------------------
   *
   * volunteer
   * ngo
   * ngo_contact
   *
   * can see ONLY:
   *
   * Dashboard
   * Task
   *
   * All other roles continue to use getMenuForRole().
   */

  const menuItems = taskOnly
    ? [
        {
          label: "Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Task",
          path: "/task",
          icon: ClipboardCheck,
        },
      ]
    : role
      ? getMenuForRole(role)
      : [];

  const [openMenus, setOpenMenus] = useState({});

  /*
   * ---------------------------------------------------------
   * TOGGLE SUB MENU
   * ---------------------------------------------------------
   */

  const toggleMenu = (label) => {
    setOpenMenus((previous) => ({
      ...previous,
      [label]: !previous[label],
    }));
  };

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */

  const handleNavigation = (path) => {
    if (!path) {
      return;
    }

    navigate(path);
    setMobileOpen(false);
  };

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  /*
   * ---------------------------------------------------------
   * RENDER MENU ITEM
   * ---------------------------------------------------------
   */

  const renderMenuItem = (item, level = 0) => {
    const Icon = item.icon;

    const hasChildren =
      Array.isArray(item.children) &&
      item.children.length > 0;

    const isActive =
      item.path &&
      location.pathname === item.path;

    const isOpen = openMenus[item.label];

    /*
     * -------------------------------------------------------
     * MENU WITH CHILDREN
     * -------------------------------------------------------
     */

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            type="button"
            onClick={() => toggleMenu(item.label)}
            className="
              flex
              w-full
              items-center
              justify-between
              rounded-lg
              px-3
              py-2.5
              text-left
              text-sm
              font-medium
              text-slate-300
              transition
              hover:bg-white/10
              hover:text-white
            "
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon size={18} />}

              <span>
                {item.label}
              </span>
            </div>

            <ChevronDown
              size={16}
              className={`
                transition-transform
                ${isOpen ? "rotate-180" : ""}
              `}
            />
          </button>

          {isOpen && (
            <div className="
              ml-4
              mt-1
              space-y-1
              border-l
              border-white/10
              pl-2
            ">
              {item.children.map((child) =>
                renderMenuItem(child, level + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    /*
     * -------------------------------------------------------
     * NORMAL MENU ITEM
     * -------------------------------------------------------
     */

    return (
      <button
        key={item.label}
        type="button"
        onClick={() => handleNavigation(item.path)}
        className={`
          flex
          w-full
          items-center
          gap-3
          rounded-lg
          px-3
          py-2.5
          text-left
          text-sm
          font-medium
          transition

          ${
            isActive
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          }
        `}
      >
        {Icon && <Icon size={18} />}

        <span>
          {item.label}
        </span>
      </button>
    );
  };

  /*
   * ---------------------------------------------------------
   * SIDEBAR
   * ---------------------------------------------------------
   */

  return (
    <>
      {/* -------------------------------------------------- */}
      {/* MOBILE OVERLAY */}
      {/* -------------------------------------------------- */}

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="
            fixed
            inset-0
            z-40
            bg-black/50
            lg:hidden
          "
        />
      )}

      {/* -------------------------------------------------- */}
      {/* SIDEBAR */}
      {/* -------------------------------------------------- */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          w-72
          flex-col
          bg-[#061b38]
          text-white
          shadow-2xl
          transition-transform
          duration-300

          ${
            mobileOpen
              ? "translate-x-0"
              : collapsed
                ? "-translate-x-full"
                : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* ------------------------------------------------ */}
        {/* LOGO */}
        {/* ------------------------------------------------ */}

        <div
          className="
            flex
            h-20
            shrink-0
            items-center
            justify-between
            border-b
            border-white/10
            px-5
          "
        >
          <div>
            <h1 className="text-lg font-bold">
              AAPDASETU
            </h1>

            <p
              className="
                mt-1
                text-[10px]
                uppercase
                tracking-wider
                text-slate-400
              "
            >
              Emergency Response System
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="
              rounded-lg
              p-2
              hover:bg-white/10
              lg:hidden
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* ------------------------------------------------ */}
        {/* USER SECTION */}
        {/* ------------------------------------------------ */}

        <div
          className="
            border-b
            border-white/10
            px-4
            py-4
          "
        >
          {/*
          Uncomment this section if you want to display
          the logged-in user's name and role.

          <div className="
            rounded-xl
            bg-white/5
            p-3
          ">
            <p className="
              text-sm
              font-semibold
              text-white
            ">
              {user?.name || "User"}
            </p>

            <p className="
              mt-1
              text-[11px]
              uppercase
              tracking-wider
              text-blue-300
            ">
              {role.replace(/_/g, " ")}
            </p>
          </div>
          */}
        </div>

        {/* ------------------------------------------------ */}
        {/* MENU */}
        {/* ------------------------------------------------ */}

        <nav
          className="
            flex-1
            overflow-y-auto
            px-3
            py-4
          "
        >
          <div className="space-y-1">
            {menuItems.map((item) =>
              renderMenuItem(item)
            )}
          </div>
        </nav>

        {/* ------------------------------------------------ */}
        {/* LOGOUT */}
        {/* ------------------------------------------------ */}

        {/*
        <div
          className="
            shrink-0
            border-t
            border-white/10
            p-3
          "
        >
          <button
            type="button"
            onClick={handleLogout}
            className="
              flex
              w-full
              items-center
              gap-3
              rounded-lg
              px-3
              py-3
              text-sm
              font-medium
              text-slate-300
              transition
              hover:bg-red-500/10
              hover:text-red-300
            "
          >
            <LogOut size={18} />

            Logout
          </button>
        </div>
        */}
      </aside>
    </>
  );
}

export default Sidebar;