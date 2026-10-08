import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import Header from "./Header";
import { useAuth } from "../../context/AuthContext";

const TASK_ONLY_ROLES = new Set(["volunteer", "ngo_contact", "ngo"]);

function DashboardLayout() {
  const { user } = useAuth();
  const isTaskOnly = TASK_ONLY_ROLES.has(user?.role);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Sidebar — hidden entirely for volunteer / NGO roles */}
      {!isTaskOnly && (
        <Sidebar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          collapsed={sidebarCollapsed}
        />
      )}

      <div className={`
          min-h-screen
          transition-all
          duration-300
          ${!isTaskOnly && !sidebarCollapsed ? "lg:pl-72" : "lg:pl-0"}
        `}>

        <Header
          setMobileOpen={setMobileOpen}
          sidebarCollapsed={isTaskOnly ? true : sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          hideNav={isTaskOnly}
        />

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;