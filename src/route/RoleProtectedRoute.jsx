import React from "react";
import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { getUserRole } from "../utils/roles";

function RoleProtectedRoute({ allowedRoles = [] }) {
  const { user } = useAuth();

  const role = getUserRole(user);

  /*
   * Null role = Task-only user.
   */
  if (!role) {
    return (
      <Navigate
        to="/task"
        replace
      />
    );
  }

  /*
   * Check role-specific permission.
   */
  if (!allowedRoles.includes(role)) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
}

export default RoleProtectedRoute;