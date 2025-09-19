// web/src/pages/dashboards/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
} from "firebase/firestore";
import { auth } from "../../firebase";
import Topbar from "../../components/Topbar";
import useIdleLogout from "../../hooks/useIdleLogout";

const Page = ({ title, children, right, icon }) => (
  <div className="card border-0 shadow-sm mb-4 modern-card">
    <div className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center py-3">
      <div className="d-flex align-items-center">
        {icon && <span className="me-2 fs-5">{icon}</span>}
        <h5 className="mb-0 fw-semibold text-dark">{title}</h5>
      </div>
      {right}
    </div>
    <div className="card-body">{children}</div>
  </div>
);

const Stat = ({ label, value, icon, color = "primary", trend }) => (
  <div className="col-12 col-sm-6 col-xl-2 mb-3">
    <div className="card border-0 shadow-sm h-100 stat-card">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <div className={`badge bg-${color}-subtle text-${color} mb-2`}>
              <span className="me-1">{icon}</span>
              {label}
            </div>
            <div className="h3 mb-0 fw-bold text-dark">{value ?? "—"}</div>
            {trend && (
              <small className="text-muted">
                <i className="bi bi-arrow-up-short text-success"></i>
                {trend}
              </small>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const QuickActionCard = ({ title, desc, to, icon, color = "primary" }) => (
  <div className="col-12 col-md-6 col-xl-4 mb-3">
    <Link to={to} className="text-decoration-none">
      <div className="card border-0 shadow-sm h-100 quick-action-card">
        <div className="card-body p-4">
          <div className="d-flex align-items-start">
            <div className={`bg-${color}-subtle text-${color} rounded-3 p-2 me-3 flex-shrink-0`}>
              <span className="fs-4">{icon}</span>
            </div>
            <div className="flex-grow-1">
              <h6 className="fw-semibold mb-2 text-dark">{title}</h6>
              <p className="text-muted small mb-3">{desc}</p>
              <div className={`btn btn-sm btn-outline-${color}`}>
                Open <i className="bi bi-arrow-right ms-1"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  </div>
);

export default function AdminDashboard() {
  const db = useMemo(() => getFirestore(), []);
  const [counts, setCounts] = useState({
    users: null,
    policies: null,
    facts: null,
    trainings: null,
    quizzes: null,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentFacts, setRecentFacts] = useState([]);
  const [error, setError] = useState("");
  const [mfaNeeded, setMfaNeeded] = useState(false);

  // Idle logout after 15 min
  useIdleLogout(15);

  // MFA banner check for Admins
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const enrolled = u?.multiFactor?.enrolledFactors || [];
    setMfaNeeded(enrolled.length === 0);
  }, []);

  // Live lists
  useEffect(() => {
    const unsubs = [];
    try {
      unsubs.push(
        onSnapshot(
          query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5)),
          (snap) => setRecentUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        )
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, "facts"), orderBy("createdAt", "desc"), limit(5)),
          (snap) => setRecentFacts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        )
      );
    } catch (e) {
      setError(e.message || "Failed to load lists.");
    }
    return () => unsubs.forEach((u) => u && u());
  }, [db]);

  // Counts
  useEffect(() => {
    (async () => {
      try {
        const [cUsers, cPolicies, cFacts, cTrain, cQuizzes] = await Promise.all([
          getCountFromServer(collection(db, "users")).catch(() => null),
          getCountFromServer(collection(db, "policies")).catch(() => null),
          getCountFromServer(collection(db, "facts")).catch(() => null),
          getCountFromServer(collection(db, "trainings")).catch(() => null),
          getCountFromServer(collection(db, "quizzes")).catch(() => null),
        ]);
        setCounts({
          users: cUsers?.data().count ?? 0,
          policies: cPolicies?.data().count ?? 0,
          facts: cFacts?.data().count ?? 0,
          trainings: cTrain?.data().count ?? 0,
          quizzes: cQuizzes?.data().count ?? 0,
        });
      } catch (e) {
        setError(e.message || "Failed to load counts.");
      }
    })();
  }, [db]);

  return (
    <>
      <Topbar />

      <div className="container-fluid py-4 dashboard-bg">
        <div className="container" style={{ maxWidth: 1400 }}>
          {/* Header */}
          <div className="row mb-4">
            <div className="col-12 text-center">
              <h1 className="h2 fw-bold mb-1">
                <i className="bi bi-speedometer2 me-2 text-primary"></i>
                Admin Dashboard
              </h1>
              <p className="text-muted mb-0">
                Welcome back! Here's what's happening with your system today.
              </p>
            </div>
          </div>

          {/* MFA Warning */}
          {mfaNeeded && (
            <div className="alert alert-warning border-0 shadow-sm d-flex align-items-center justify-content-between mb-4" role="alert">
              <div className="d-flex align-items-center">
                <i className="bi bi-shield-exclamation fs-4 me-3 text-warning"></i>
                <div>
                  <h6 className="mb-1 fw-semibold">Security Enhancement Needed</h6>
                  <small>Your admin account isn't protected with multi-factor authentication. Enable MFA for better security.</small>
                </div>
              </div>
              <Link className="btn btn-warning btn-sm" to="/settings/mfa">
                <i className="bi bi-shield-check me-1"></i>
                Enable MFA
              </Link>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          {/* Stats Overview */}
          <div className="row g-3 mb-4 justify-content-center">
            <Stat label="Users" value={counts.users} icon="👥" color="primary" />
            <Stat label="Policies" value={counts.policies} icon="📋" color="success"  />
            <Stat label="Facts" value={counts.facts} icon="💡" color="info"  />
            <Stat label="Trainings" value={counts.trainings} icon="🎓" color="warning"  />
            <Stat label="Quizzes" value={counts.quizzes} icon="🧩" color="purple" />
          </div>

          {/* Quick Actions */}
          <Page title="Quick Actions" icon="⚡">
            <div className="row g-3">
              <QuickActionCard
                title="User Management"
                desc="Create, update, disable users and assign roles with ease"
                to="/admin/users"
                icon="👥"
                color="primary"
              />
              <QuickActionCard
                title="Policy Center"
                desc="Upload policies, manage versions and track acknowledgements"
                to="/admin/policies"
                icon="📋"
                color="success"
              />
              <QuickActionCard
                title="Training Hub"
                desc="Create training modules, quizzes and manage assignments"
                to="/admin/training"
                icon="🎓"
                color="warning"
              />
              <QuickActionCard
                title="Security Facts"
                desc="Broadcast important security tips and alerts to users"
                to="/admin/facts"
                icon="💡"
                color="info"
              />
              <QuickActionCard
                title="Analytics & Reports"
                desc="View compliance dashboards and export detailed reports"
                to="/admin/reports"
                icon="📊"
                color="purple"
              />
              <QuickActionCard
                title="System Settings"
                desc="Configure system preferences and security settings"
                to="/admin/settings"
                icon="⚙️"
                color="secondary"
              />
            </div>
          </Page>

          {/* Recent Activity */}
          <div className="row g-4">
            <div className="col-12 col-xl-6">
              <Page
                title="Recent Users"
                icon="👤"
                right={
                  <Link to="/admin/users" className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-arrow-right me-1"></i>
                    View All
                  </Link>
                }
              >
                {recentUsers.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-people fs-1 text-muted mb-2"></i>
                    <p className="text-muted">No users registered yet</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="border-0 fw-semibold">User</th>
                          <th className="border-0 fw-semibold d-none d-md-table-cell">Email</th>
                          <th className="border-0 fw-semibold text-end">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentUsers.map((u) => (
                          <tr key={u.id}>
                            <td className="border-0">
                              <div className="d-flex align-items-center">
                                <div className="bg-primary-subtle rounded-circle p-2 me-2">
                                  <i className="bi bi-person-fill text-primary"></i>
                                </div>
                                <div>
                                  <div className="fw-semibold">
                                    {u.firstName || u.displayName || "—"} {u.lastName || ""}
                                  </div>
                                  <small className="text-muted d-md-none">{u.email}</small>
                                </div>
                              </div>
                            </td>
                            <td className="border-0 d-none d-md-table-cell text-muted">
                              {u.email || "—"}
                            </td>
                            <td className="border-0 text-end">
                              <span className={`badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                                {u.role || "user"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Page>
            </div>

            <div className="col-12 col-xl-6">
              <Page
                title="Recent Security Facts"
                icon="💡"
                right={
                  <Link to="/admin/facts" className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-gear me-1"></i>
                    Manage
                  </Link>
                }
              >
                {recentFacts.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-lightbulb fs-1 text-muted mb-2"></i>
                    <p className="text-muted">No security facts created yet</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {recentFacts.map((f) => (
                      <div className="list-group-item border-0 px-0" key={f.id}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="d-flex">
                            <div className="bg-info-subtle rounded-circle p-2 me-3 flex-shrink-0">
                              <i className="bi bi-lightbulb-fill text-info"></i>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="fw-semibold mb-1">{f.title || "Security Tip"}</h6>
                              <p className="text-muted small mb-0 line-clamp-2">
                                {f.message || f.text || ""}
                              </p>
                            </div>
                          </div>
                          {f.priority && (
                            <span className="badge bg-warning-subtle text-warning ms-2">
                              P{f.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Page>
            </div>
          </div>

          {/* Enhanced Styling */}
          <style>{`
            /* Dashboard Background */
            .dashboard-bg {
              background-color: #f8f9fa;
            }
            
            [data-bs-theme="dark"] .dashboard-bg {
              background-color: #1a1d29;
            }
            
            /* Dark theme for cards */
            [data-bs-theme="dark"] .modern-card,
            [data-bs-theme="dark"] .stat-card,
            [data-bs-theme="dark"] .quick-action-card,
            [data-bs-theme="dark"] .card {
              background-color: #2d3748 !important;
              border: 1px solid #4a5568 !important;
              color: #e2e8f0 !important;
            }
            
            [data-bs-theme="dark"] .card-header {
              background-color: #4a5568 !important;
              border-bottom: 1px solid #718096 !important;
              color: #e2e8f0 !important;
            }
            
            [data-bs-theme="dark"] .card-body {
              color: #e2e8f0 !important;
            }
            
            /* Dark theme for badges */
            [data-bs-theme="dark"] .badge {
              background-color: #4a5568 !important;
              color: #e2e8f0 !important;
            }
            
            /* Dark theme for alerts */
            [data-bs-theme="dark"] .alert-warning {
              background-color: #744210 !important;
              border-color: #975a16 !important;
              color: #fef3c7 !important;
            }
            
            [data-bs-theme="dark"] .alert-danger {
              background-color: #7f1d1d !important;
              border-color: #991b1b !important;
              color: #fecaca !important;
            }
            
            /* Dark theme for tables */
            [data-bs-theme="dark"] .table {
              color: #e2e8f0 !important;
            }
            
            [data-bs-theme="dark"] .table-light {
              background-color: #4a5568 !important;
              color: #e2e8f0 !important;
            }
            
            [data-bs-theme="dark"] .table-hover tbody tr:hover {
              background-color: rgba(74, 85, 104, 0.5) !important;
            }
            
            /* Dark theme text colors */
            [data-bs-theme="dark"] .text-dark {
              color: #e2e8f0 !important;
            }
            
            [data-bs-theme="dark"] .text-muted {
              color: #a0aec0 !important;
            }
            
            [data-bs-theme="dark"] .text-secondary {
              color: #a0aec0 !important;
            }
            
            /* Logout button styling */
            .btn-logout {
              background-color: #dc3545 !important;
              border-color: #dc3545 !important;
              color: white !important;
            }
            
            .btn-logout:hover {
              background-color: #c82333 !important;
              border-color: #bd2130 !important;
              color: white !important;
            }
            
            .modern-card {
              border-radius: 12px;
              transition: all 0.2s ease;
            }
            
            .modern-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
            }
            
            [data-bs-theme="dark"] .modern-card:hover {
              box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
            }
            
            .stat-card {
              border-radius: 12px;
              transition: all 0.2s ease;
              border-left: 4px solid var(--bs-primary);
            }
            
            .stat-card:hover {
              transform: translateY(-1px);
              box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
            }
            
            [data-bs-theme="dark"] .stat-card:hover {
              box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
            }
            
            .quick-action-card {
              border-radius: 12px;
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
            }
            
            .quick-action-card:hover {
              transform: translateY(-4px);
              box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
            }
            
            [data-bs-theme="dark"] .quick-action-card:hover {
              box-shadow: 0 10px 30px rgba(0,0,0,0.4) !important;
            }
            
            .quick-action-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, var(--bs-primary), var(--bs-info));
              transform: scaleX(0);
              transition: transform 0.3s ease;
            }
            
            .quick-action-card:hover::before {
              transform: scaleX(1);
            }
            
            .bg-purple-subtle {
              background-color: #f3e8ff !important;
            }
            
            [data-bs-theme="dark"] .bg-purple-subtle {
              background-color: #553c9a !important;
            }
            
            .text-purple {
              color: #7c3aed !important;
            }
            
            [data-bs-theme="dark"] .text-purple {
              color: #a78bfa !important;
            }
            
            .line-clamp-2 {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            
            .alert {
              border-radius: 12px;
            }
            
            .btn {
              border-radius: 8px;
              font-weight: 500;
            }
            
            .badge {
              font-weight: 500;
              border-radius: 6px;
            }
            
            /* Dark theme for list groups */
            [data-bs-theme="dark"] .list-group-item {
              background-color: transparent !important;
              border-color: #4a5568 !important;
              color: #e2e8f0 !important;
            }
          `}</style>
        </div>
      </div>
    </>
  );
}