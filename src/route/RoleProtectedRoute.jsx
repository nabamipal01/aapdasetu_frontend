import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TASK_ONLY_ROLES = new Set(["volunteer", "ngo_contact", "ngo"]);

function RoleProtectedRoute({ allowedRoles = [] }) {
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.role?.toLowerCase()?.trim();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Volunteer / NGO users can ONLY access dashboard and task
  if (TASK_ONLY_ROLES.has(role)) {
    const allowedPaths = ["/dashboard", "/task"];

    if (!allowedPaths.includes(location.pathname)) {
      return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
  }

  // Normal role-based protection
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;