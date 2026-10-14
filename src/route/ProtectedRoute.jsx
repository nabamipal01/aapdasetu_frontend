
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const { isLoggedIn, sessionExpired, user } = useAuth();
  const location = useLocation();

  if (sessionExpired) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, sessionExpired: true }}
      />
    );
  }

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;