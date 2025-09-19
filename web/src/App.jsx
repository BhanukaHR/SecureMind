// web/src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Public / auth
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Forgot from "./pages/Forgot.jsx";
import MfaSetup from "./pages/account/MfaSetup.jsx";

// Guards
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import RoleGate from "./routes/RoleGate.jsx";
import AdminGuard from "./components/AdminGuard";

// Role dashboards
import Admin from "./pages/dashboards/Admin.jsx";
import Security from "./pages/dashboards/Security.jsx";
import Accounting from "./pages/dashboards/Accounting.jsx";
import Marketing from "./pages/dashboards/Marketing.jsx";
import Developer from "./pages/dashboards/Developer.jsx";
import Design from "./pages/dashboards/Design.jsx";
import User from "./pages/dashboards/User.jsx";

// Admin management pages
import AdminDashboard from "./pages/dashboards/Admin"; // overview landing at /admin
import Users from "./pages/admin/Users";
import Policies from "./pages/admin/Policies";
import TrainingQuizzes from "./pages/admin/TrainingQuizzes";
import FactsNotifications from "./pages/admin/FactsNotifications";
import Reports from "./pages/admin/Reports";

import { auth } from "./firebase";

// Styles (optional to keep here)
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(() => setReady(true));
    return () => unsub();
  }, []);

  if (!ready) {
    return (
      <div className="container py-5 text-center text-body-secondary">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot" element={<Forgot />} />

      {/* Optional MFA setup */}
      <Route
        path="/account/mfa-setup"
        element={
          <ProtectedRoute>
            <MfaSetup />
          </ProtectedRoute>
        }
      />

      {/* Generic /dashboard entry */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleGate role="__any__">
              <Navigate to="/dashboard/user" replace />
            </RoleGate>
          </ProtectedRoute>
        }
      />

      {/* Per-role dashboards */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute>
            <RoleGate role="admin">
              <Admin />
            </RoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/security"
        element={
          <ProtectedRoute>
            <RoleGate role="security">
              <Security />
            </RoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/accounting"
        element={
          <ProtectedRoute>
            <RoleGate role="accounting">
              <Accounting />
            </RoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/marketing"
        element={
          <ProtectedRoute>
            <RoleGate role="marketing">
              <Marketing />
            </RoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/developer"
        element={
          <ProtectedRoute>
            <RoleGate role="developer">
              <Developer />
            </RoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/design"
        element={
          <ProtectedRoute>
            <RoleGate role="design">
              <Design />
            </RoleGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/user"
        element={
          <ProtectedRoute>
            <User />
          </ProtectedRoute>
        }
      />

      {/* Admin area */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminGuard>
            <Users />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/policies"
        element={
          <AdminGuard>
            <Policies />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/training"
        element={
          <AdminGuard>
            <TrainingQuizzes />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/facts"
        element={
          <AdminGuard>
            <FactsNotifications />
          </AdminGuard>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminGuard>
            <Reports />
          </AdminGuard>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
