import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserRole, getUserType } from "../utils/roles";

function RoleProtectedRoute({
  allowedRoles = [],
  allowedUserTypes = [],
  fallbackPath = "/task",
}) {
  const { user } = useAuth();

  const role = getUserRole(user);
  const userType = getUserType(user);

  const roleAllowed =
    role !== null && allowedRoles.includes(role);

  const userTypeAllowed =
    userType !== null && allowedUserTypes.includes(userType);

  if (!roleAllowed && !userTypeAllowed) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;