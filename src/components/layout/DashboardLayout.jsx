import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import Header from "./Header";
function DashboardLayout() {
   const [mobileOpen, setMobileOpen] = useState(false);
   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (

     <div className="min-h-screen bg-slate-100">

      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        collapsed={sidebarCollapsed}
      />



      <div className={`
          min-h-screen
          transition-all
          duration-300
          ${sidebarCollapsed ? "lg:pl-0" : "lg:pl-72"}
        `}>

        <Header
          setMobileOpen={setMobileOpen} 
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />


        <main className="p-4 sm:p-6">

          <Outlet />

        </main>

      </div>

    </div>
  )
}

export default DashboardLayout