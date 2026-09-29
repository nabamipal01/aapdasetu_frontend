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

  /* =========================================================
     Session Expired
  ========================================================= */

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

  /* =========================================================
     Not Logged In
  ========================================================= */

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

  /* =========================================================
     Task Only Roles
     
     volunteer
     ngo
     ngo_contact

     These users can ONLY access:

       /dashboard
       /task
  ========================================================= */

  if (isTaskOnlyRole(user)) {
    const allowedPaths = [
      "/dashboard",
      "/task",
    ];

    if (!allowedPaths.includes(location.pathname)) {
      return (
        <Navigate
          to="/dashboard"
          replace
        />
      );
    }
  }

  /* =========================================================
     Authenticated + Authorized
  ========================================================= */

  return <Outlet />;
}

export default ProtectedRoute;