import React from "react";
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { isTaskOnlyRole } from "../utils/roles";

function ProtectedRoute() {
  const {
    isLoggedIn,
    sessionExpired,
    user,
  } = useAuth();

  const location = useLocation();

  /* Session expired */
  if (sessionExpired) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
          sessionExpired: true,
        }}
      />
    );
  }

  /* Not logged in */
  if (!isLoggedIn || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  /* Task-only users can ONLY access /task */
  if (isTaskOnlyRole(user)) {
    if (location.pathname !== "/task") {
      return (
        <Navigate
          to="/task"
          replace
        />
      );
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;