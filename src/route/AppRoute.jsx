import React from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "../components/auth/ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";

import Dashboard from "../pages/dashboard/Dashboard";
import Admin from "../pages/location/Admin";
import District from "../pages/location/District";
import Subdivision from "../pages/location/Subdivision";
import Block from "../pages/location/Block";
import Task from "../pages/task/Task";

function AppRoutes() {
  return (
    <Routes>

      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Login protection */}
      <Route element={<ProtectedRoute />}>

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/task" element={<Task />} />

        {/* Admin list */}
        <Route
          element={
            <RoleProtectedRoute allowedRoles={["super_admin"]} />
          }
        >
          <Route
            path="/location/admin"
            element={<Admin />}
          />
        </Route>

        {/* District list */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={["super_admin", "admin"]}
            />
          }
        >
          <Route
            path="/location/district"
            element={<District />}
          />
        </Route>

        {/* Subdivision list */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={[
                "super_admin",
                "admin",
                "district",
              ]}
            />
          }
        >
          <Route
            path="/location/subdivision"
            element={<Subdivision />}
          />
        </Route>

        {/* Block list */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={[
                "super_admin",
                "admin",
                "district",
                "subdivision",
              ]}
            />
          }
        >
          <Route
            path="/location/block"
            element={<Block />}
          />
        </Route>

      </Route>
    </Routes>
  );
}

export default AppRoutes; 