import React, { useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import ProtectedRoute from "./route/ProtectedRoute";
import RoleProtectedRoute from "./route/RoleProtectedRoute";

import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Emergency from "./components/Emergency/Emergency";
import DashboardLayout from "./components/layout/DashboardLayout";

import Fire from "./pages/Department/Fire/Fire";
import Incident from "./pages/incident/Incident";
import Task from "./pages/task/Task";
import Resources from "./pages/resources/Resources";
import Training from "./pages/Training Module/Training";
import Report from "./pages/Report/MISReports";

import Electricity from "./pages/Department/Electricity/Electricity";
import Food from "./pages/Department/Food/FoodDept";
import Law from "./pages/Department/Law/LawAndOrder";

import Ambulance from "./pages/Department/Health/Ambulance/Ambulance";
import PrimaryHealthCare from "./pages/Department/Health/PrimaryHealthCare/PrimaryHealthCare";

import Admin from "./pages/role/Admin/Admin";
import District from "./pages/role/District/District";
import SubDivison from "./pages/role/Subdivision/Subdivision";
import Block from "./pages/role/Block/Block";

import StockOverview from "./pages/Inventory/StockOverview/EquipmentInventory";
import StockHistory from "./pages/Inventory/StockHistory/StockHistory";
import IssueStock from "./pages/Inventory/IssueStock/IssueStock";
import AddStock from "./pages/Inventory/AddStock/AddStock";
import EquipmentCategory from "./pages/Inventory/Equipment/EquipmentCategory";
import CategoryDetail from "./pages/Inventory/CategoryDetail/CategoryDetail";

import ERSS from "./pages/DisasterManagement/ERSS/ERSS";
import CCTNS from "./pages/DisasterManagement/CCTNS/CCTNS";

import PreAlert from "./pages/Alert/PreAlerts";
import PostAlert from "./pages/Alert/PostAlerts";

import Volunteers from "./pages/Volunteers/Volunteers";
import Ngo from "./pages/NGO/Ngo";

import DistrictLocation from "./pages/location/Districts";
import SubdivisionLocation from "./pages/location/Subdivisions";
import BlockLocation from "./pages/location/Blocks";

import ReturnStock from "./pages/Inventory/ReturnStock/ReturnStock";
import ReturnHistory from "./pages/Inventory/ReturnHistory/StockReturnHistory";
import IssueStockHistory from "./pages/Inventory/IssueStockHistory/StockIssueHistory";

import { isOperationalUser } from "./utils/roles";

/* =========================================================
   ROLE CONFIGURATION
========================================================= */

const GENERAL_ROLES = [
  "super_admin",
  "admin",
  "district",
  "subdivision",
  "block",
];

const OPERATIONAL_USER_TYPES = [
  "volunteers",
  "ngo_contact_person",
];

/* =========================================================
   LOGIN REDIRECT
========================================================= */

function LoginRedirect() {
  const { isLoggedIn, user } = useAuth();

  if (isLoggedIn && user) {
    return (
      <Navigate
        to={
          isOperationalUser(user)
            ? "/pre-alerts"
            : "/dashboard"
        }
        replace
      />
    );
  }

  return <Login />;
}

/* =========================================================
   HOME REDIRECT
========================================================= */

function HomeRedirect() {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={
        isOperationalUser(user)
          ? "/pre-alerts"
          : "/dashboard"
      }
      replace
    />
  );
}

/* =========================================================
   CATCH-ALL REDIRECT
========================================================= */

function CatchAll() {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={
        isOperationalUser(user)
          ? "/pre-alerts"
          : "/dashboard"
      }
      replace
    />
  );
}

/* =========================================================
   SESSION EXPIRED ALERT
========================================================= */

function SessionExpiredAlert() {
  const {
    sessionExpired,
    dismissSessionExpired,
  } = useAuth();

  const navigate = useNavigate();

  if (!sessionExpired) {
    return null;
  }

  const handleLoginRedirect = () => {
    dismissSessionExpired();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2
          id="session-expired-title"
          className="text-lg font-semibold text-slate-900"
        >
          Session expired
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Your session has expired. Please log in again
          to continue.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleLoginRedirect}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Let's Login
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SCROLL TO TOP
========================================================= */

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

/* =========================================================
   APP
========================================================= */

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />

        <Routes>
          {/* =====================================================
              PUBLIC ROUTES
          ===================================================== */}

          <Route
            path="/login"
            element={<LoginRedirect />}
          />

          <Route
            path="/"
            element={<HomeRedirect />}
          />

          {/* =====================================================
              AUTHENTICATED ROUTES
          ===================================================== */}

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>

              {/* =================================================
                  OPERATIONAL ROUTES

                  Staff roles, volunteers and NGO contacts can
                  access ONLY these shared operational pages.

                  The paths match menuConfig.js.
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={GENERAL_ROLES}
                    allowedUserTypes={OPERATIONAL_USER_TYPES}
                    fallbackPath="/pre-alerts"
                  />
                }
              >
                <Route
                  path="/pre-alerts"
                  element={<PreAlert />}
                />

                <Route
                  path="/post-alerts"
                  element={<PostAlert />}
                />

                <Route
                  path="/incident"
                  element={<Incident />}
                />

                <Route
                  path="/task"
                  element={<Task />}
                />

                <Route
                  path="/emergency"
                  element={<Emergency />}
                />
              </Route>

              {/* =================================================
                  STAFF-ONLY APPLICATION ROUTES

                  Volunteers and NGO contacts are NOT allowed.
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={GENERAL_ROLES}
                    fallbackPath="/pre-alerts"
                  />
                }
              >
                <Route
                  path="/dashboard"
                  element={<Dashboard />}
                />

                {/* Department */}

                <Route
                  path="/department/electricity"
                  element={<Electricity />}
                />

                <Route
                  path="/department/fire"
                  element={<Fire />}
                />

                <Route
                  path="/department/health/ambulance"
                  element={<Ambulance />}
                />

                <Route
                  path="/department/health/primary-health-care"
                  element={<PrimaryHealthCare />}
                />

                <Route
                  path="/department/food"
                  element={<Food />}
                />

                <Route
                  path="/department/law&order"
                  element={<Law />}
                />

                {/* Inventory */}

                <Route
                  path="/inventory/overview"
                  element={<StockOverview />}
                />

                <Route
                  path="/inventory/history"
                  element={<StockHistory />}
                />

                <Route
                  path="/inventory/issue"
                  element={<IssueStock />}
                />

                <Route
                  path="/inventory/return"
                  element={<ReturnStock />}
                />

                <Route
                  path="/inventory/add"
                  element={<AddStock />}
                />

                <Route
                  path="/inventory/equipmentCategory"
                  element={<EquipmentCategory />}
                />

                <Route
                  path="/inventory/category/:id"
                  element={<CategoryDetail />}
                />

                <Route
                  path="/inventory/history/return"
                  element={<ReturnHistory />}
                />

                <Route
                  path="/inventory/history/issue"
                  element={<IssueStockHistory />}
                />

                {/* Disaster Management */}

                <Route
                  path="/disaster/erss"
                  element={<ERSS />}
                />

                <Route
                  path="/disaster/cctns"
                  element={<CCTNS />}
                />

                {/* Resources */}

                <Route
                  path="/resources"
                  element={<Resources />}
                />

                {/* Training */}

                <Route
                  path="/training"
                  element={<Training />}
                />

                {/* Reports */}

                <Route
                  path="/reports"
                  element={<Report />}
                />
              </Route>

              {/* =================================================
                  SUPER ADMIN ONLY
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={["super_admin"]}
                    fallbackPath="/dashboard"
                  />
                }
              >
                <Route
                  path="/users/admin"
                  element={<Admin />}
                />
              </Route>

              {/* =================================================
                  LOCATION MANAGEMENT
                  super_admin + admin
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={["super_admin", "admin"]}
                    fallbackPath="/dashboard"
                  />
                }
              >
                <Route
                  path="/location/district"
                  element={<DistrictLocation />}
                />

                <Route
                  path="/location/subdivision"
                  element={<SubdivisionLocation />}
                />

                <Route
                  path="/location/block"
                  element={<BlockLocation />}
                />
              </Route>

              {/* =================================================
                  DISTRICT USERS
                  super_admin + admin
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={["super_admin", "admin"]}
                    fallbackPath="/dashboard"
                  />
                }
              >
                <Route
                  path="/users/district"
                  element={<District />}
                />
              </Route>

              {/* =================================================
                  SUBDIVISION USERS
                  super_admin + admin + district
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      "super_admin",
                      "admin",
                      "district",
                    ]}
                    fallbackPath="/dashboard"
                  />
                }
              >
                <Route
                  path="/users/subdivision"
                  element={<SubDivison />}
                />
              </Route>

              {/* =================================================
                  BLOCK USERS
                  super_admin + admin + district + subdivision
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      "super_admin",
                      "admin",
                      "district",
                      "subdivision",
                    ]}
                    fallbackPath="/dashboard"
                  />
                }
              >
                <Route
                  path="/users/block"
                  element={<Block />}
                />
              </Route>

              {/* =================================================
                  VOLUNTEER MANAGEMENT
                  super_admin + admin + district + subdivision
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      "super_admin",
                      "admin",
                      "district",
                      "subdivision",
                    ]}
                    fallbackPath="/dashboard"
                  />
                }
              >
                <Route
                  path="/volunteers"
                  element={<Volunteers />}
                />
              </Route>

              {/* =================================================
                  NGO MANAGEMENT
                  super_admin + admin + district + subdivision
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      "super_admin",
                      "admin",
                      "district",
                      "subdivision",
                    ]}
                    fallbackPath="/dashboard"
                  />
                }
              >
                <Route
                  path="/ngo"
                  element={<Ngo />}
                />
              </Route>

            </Route>
          </Route>

          {/* =====================================================
              UNKNOWN ROUTES
          ===================================================== */}

          <Route
            path="*"
            element={<CatchAll />}
          />
        </Routes>

        <SessionExpiredAlert />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;