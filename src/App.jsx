import React, { useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

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
import Report from "./pages/Report/Report";

import Electricity from "./pages/Department/Electricity/Electricity";
import Food from "./pages/Department/Food/Food";
import Law from "./pages/Department/Law/Law";

import Ambulance from "./pages/Department/Health/Ambulance/Ambulance";
import PrimaryHealthCare from "./pages/Department/Health/PrimaryHealthCare/PrimaryHealthCare";

import Admin from "./pages/role/Admin/Admin";
import District from "./pages/role/District/District";
import SubDivison from "./pages/role/Subdivision/SubDivison";
import Block from "./pages/role/Block/Block";

import StockOverview from "./pages/Inventory/StockOverview/StockOverview";
import StockHistory from "./pages/Inventory/StockHistory/StockHistory";
import IssueStock from "./pages/Inventory/IssueStock/IssueStock";
import AddStock from "./pages/Inventory/AddStock/AddStock";
import Equipment from "./pages/Inventory/Equipment/Equipment";
import CategoryDetail from "./pages/Inventory/CategoryDetail/CategoryDetail";

import ERSS from "./pages/DisasterManagement/ERSS/ERSS";
import CCTNS from "./pages/DisasterManagement/CCTNS/CCTNS";

import PreAlert from "./pages/Alert/PreAlert";

import Volunteers from "./pages/Volunteers/Volunteers";
import Ngo from "./pages/NGO/Ngo";

import DistrictLocation from "./pages/location/DistrictLocation";
import SubdivisionLocation from "./pages/location/SubdivisionLocation";
import BlockLocation from "./pages/location/BlockLocation";

import { isTaskOnlyRole } from "./utils/roles";
import ReturnStock from "./pages/Inventory/ReturnStock/ReturnStock";
import ReturnHistory from "./pages/Inventory/ReturnHistory/returnHistory";
import IssueStockHistory from "./pages/Inventory/IssueStockHistory/IssueStockHistory";
import PostAlert from "./pages/Alert/PostAlert";


/* =========================================================
   Roles
========================================================= */

const GENERAL_ROLES = [
  "super_admin",
  "admin",
  "district",
  "subdivision",
  "block",
];

/* =========================================================
   Login Redirect
=========================================================

If the user is already logged in and manually visits:

    /login

don't show the login page again.

Send them to dashboard.
========================================================= */

function LoginRedirect() {
  const {
    isLoggedIn,
    user,
  } = useAuth();

  if (isLoggedIn && user) {
    return (
      <Navigate
        to={isTaskOnlyRole(user) ? "/task" : "/dashboard"}
        replace
      />
    );
  }

  return <Login />;
}

/* =========================================================
   Home Redirect
=========================================================

If user visits:

    /

Not logged in:
    -> /login

Already logged in:
    -> /dashboard
========================================================= */

function HomeRedirect() {
  const {
    isLoggedIn,
    user,
  } = useAuth();

  if (!isLoggedIn || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <Navigate
      to={isTaskOnlyRole(user) ? "/task" : "/dashboard"}
      replace
    />
  );
}

/* =========================================================
   Catch All
========================================================= */

function CatchAll() {
  const { user } = useAuth();

  if (user && isTaskOnlyRole(user)) {
    return (
      <Navigate
        to="/task"
        replace
      />
    );
  }

  return (
    <Navigate
      to="/dashboard"
      replace
    />
  );
}

/* =========================================================
   Session Expired Alert
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

    navigate(
      "/login",
      {
        replace: true,
      }
    );
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
            Go to Login
          </button>

        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Scroll To Top
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
   App
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
              PROTECTED ROUTES
          ===================================================== */}

          <Route element={<ProtectedRoute />}>

            <Route element={<DashboardLayout />}>

              {/* =================================================
                  COMMON ROUTES

                  ALL logged-in users can access these.

                  volunteer
                  ngo
                  ngo_contact

                  are allowed here as well.
              ================================================= */}

              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/task"
                element={<Task />}
              />


              {/* =================================================
                  GENERAL APPLICATION ROUTES

                  NOT AVAILABLE TO:

                  volunteer
                  ngo
                  ngo_contact
              ================================================= */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={GENERAL_ROLES}
                  />
                }
              >

                {/* -------------------------------------------------
                    Emergency
                ------------------------------------------------- */}

                <Route
                  path="/emergency"
                  element={<Emergency />}
                />


                {/* -------------------------------------------------
                    Departments
                ------------------------------------------------- */}

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


                {/* -------------------------------------------------
                    Inventory
                ------------------------------------------------- */}

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
                  path="/inventory/equipment"
                  element={<Equipment />}
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
                  element={<IssueStockHistory/>}
                />


                {/* -------------------------------------------------
                    Disaster Management
                ------------------------------------------------- */}

                <Route
                  path="/disaster/erss"
                  element={<ERSS />}
                />

                <Route
                  path="/disaster/cctns"
                  element={<CCTNS />}
                />


                {/* -------------------------------------------------
                    Incident
                ------------------------------------------------- */}

                <Route
                  path="/incident"
                  element={<Incident />}
                />


                {/* -------------------------------------------------
                    Resources
                ------------------------------------------------- */}

                <Route
                  path="/resources"
                  element={<Resources />}
                />


                {/* -------------------------------------------------
                    Training
                ------------------------------------------------- */}

                <Route
                  path="/training"
                  element={<Training />}
                />


                {/* -------------------------------------------------
                    Reports
                ------------------------------------------------- */}

                <Route
                  path="/reports"
                  element={<Report />}
                />


                {/* -------------------------------------------------
                    Alerts
                ------------------------------------------------- */}

                <Route
                  path="/alerts/pre-alerts"
                  element={<PreAlert />}
                />

                <Route
                  path="/alerts/post-alerts"
                  element={<PostAlert />}
                />

              </Route>


              {/* =================================================
                  ADMIN / USER MANAGEMENT
              ================================================= */}


              {/* -------------------------------------------------
                  Admin

                  Only super_admin
              ------------------------------------------------- */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      "super_admin",
                    ]}
                  />
                }
              >

                <Route
                  path="/users/admin"
                  element={<Admin />}
                />

              </Route>


              {/* -------------------------------------------------
                  Location Management

                  super_admin + admin
              ------------------------------------------------- */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      "super_admin",
                      "admin",
                    ]}
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


              {/* -------------------------------------------------
                  District Users

                  super_admin + admin
              ------------------------------------------------- */}

              <Route
                element={
                  <RoleProtectedRoute
                    allowedRoles={[
                      "super_admin",
                      "admin",
                    ]}
                  />
                }
              >

                <Route
                  path="/users/district"
                  element={<District />}
                />

              </Route>


              {/* -------------------------------------------------
                  Subdivision Users

                  super_admin + admin + district
              ------------------------------------------------- */}

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
                  path="/users/subdivision"
                  element={<SubDivison />}
                />

              </Route>


              {/* -------------------------------------------------
                  Block Users

                  super_admin + admin + district + subdivision
              ------------------------------------------------- */}

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
                  path="/users/block"
                  element={<Block />}
                />

              </Route>


              {/* -------------------------------------------------
                  Volunteers

                  super_admin + admin + district + subdivision
              ------------------------------------------------- */}

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
                  path="/volunteers"
                  element={<Volunteers />}
                />

              </Route>


              {/* -------------------------------------------------
                  NGO

                  super_admin + admin + district + subdivision
              ------------------------------------------------- */}

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
                  path="/ngo"
                  element={<Ngo />}
                />

              </Route>

            </Route>
          </Route>


          {/* =====================================================
              CATCH ALL
          ===================================================== */}

          <Route
            path="*"
            element={<CatchAll />}
          />

        </Routes>


        {/* =======================================================
            SESSION EXPIRED MODAL
        ======================================================= */}

        <SessionExpiredAlert />

      </BrowserRouter>

    </AuthProvider>
  );
}

export default App;