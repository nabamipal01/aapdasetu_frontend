import React, { useState } from "react";

import { ChevronDown, LogOut, X } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import { getMenuForUser } from "../../config/menuConfig";

 

function Sidebar({

  mobileOpen,

  setMobileOpen,

  collapsed,

}) {

 

  const navigate = useNavigate();

  const location = useLocation();

  const { user } = useAuth();

 

  // const role = user?.role || "admin";

 

  const menuItems = getMenuForUser(user);

 

  const [openMenus, setOpenMenus] = useState({});

 

  const toggleMenu = (label) => {

 

    setOpenMenus((previous) => ({

      ...previous,

      [label]: !previous[label],

    }));

 

  };

 

  const handleNavigation = (path) => {

 

    if (path) {

      navigate(path);

      setMobileOpen(false);

    }

 

  };

 

  const handleLogout = () => {

 

    localStorage.removeItem("token");

    localStorage.removeItem("user");

 

    navigate("/login");

 

  };

 

  const getUserTypeLabel = (user) => {

    const normalizeRole = (value) =>

      String(value ?? "")

        .trim()

        .toLowerCase()

        .replace(/[\s-]+/g, "_");

 

    const role =

      normalizeRole(user?.role) ||

      normalizeRole(user?.user_type) ||

      normalizeRole(user?.role_name);

 

    const roleLabels = {

      super_admin: "Super Admin",

      admin: "Admin",

 

      district: "District User",

      district_user: "District User",

 

      subdivision: "Subdivision User",

      subdivision_user: "Subdivision User",

 

      block: "Block User",

      block_user: "Block User",

 

      volunteer: "Volunteer",

 

      ngo: "NGO Contact Person",

      ngo_contact: "NGO Contact Person",

      ngo_contact_person: "NGO Contact Person",

    };

 

    return roleLabels[role] || "Unknown User";

  };

 

  const renderMenuItem = (item, level = 0) => {

 

    const Icon = item.icon;

 

    const hasChildren =

      item.children && item.children.length > 0;

 

    const isActive =

      item.path && location.pathname === item.path;

 

    const isOpen = openMenus[item.label];

 

    if (hasChildren) {

 

      return (

        <div key={item.label}>

 

          <button

            onClick={() => toggleMenu(item.label)}

            className=" flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium

              text-slate-300 transition hover:bg-white/10 hover:text-white

            "

          >

 

            <div className="flex items-center gap-3">

 

              <Icon size={18} />

 

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

 

            <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-2">

 

              {item.children.map((child) =>

                renderMenuItem(child, level + 1)

              )}

 

            </div>

 

          )}

 

        </div>

      );

    }

 

    return (

      <button

        key={item.label}

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

 

          ${isActive

            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"

            : "text-slate-300 hover:bg-white/10 hover:text-white"

          }

        `}

      >

 

        <Icon size={18} />

 

        <span>

          {item.label}

        </span>

 

      </button>

    );

  };

 

  return (

    <>

      {/* Mobile overlay */}

 

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

 

    ${mobileOpen

            ? "translate-x-0"

            : collapsed

              ? "-translate-x-full"

              : "-translate-x-full lg:translate-x-0"

          }

  `}

      >

 

        {/* Logo */}

 

        <div className="

          flex

          h-20

          shrink-0

          items-center

          justify-between

          border-b

          border-white/10

          px-5

        ">

 

          <div>

 

            <h1 className="text-lg font-bold">

              AAPDASETU

            </h1>

 

            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">

              Emergency Response System

            </p>

 

          </div>

 

          <button

            onClick={() => setMobileOpen(false)}

            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"

          >

            <X size={20} />

          </button>

 

        </div>

 

        {/* User */}

 

        <div className="

          border-b

          border-white/10

          px-4

          py-4

        ">

          <div className="mt-2 flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">

              <span className="text-sm font-bold">

                {getUserTypeLabel(user).charAt(0)}

              </span>

            </div>

 

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold text-white">

                {getUserTypeLabel(user)}

              </p>

 

              <p className="mt-0.5 text-xs text-slate-400">

                AapdaSetu Account

              </p>

            </div>

          </div>

        </div>

 

        {/* Menu */}

 

        <nav className="

          flex-1

          overflow-y-auto

          px-3

          py-4

        ">

 

          <div className="space-y-1">

 

            {menuItems.map((item) =>

              renderMenuItem(item)

            )}

 

          </div>

 

        </nav>

 

      </aside>

    </>

  );

}

 

export default Sidebar;