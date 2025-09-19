// web/src/pages/admin/FactsNotifications.jsx
import React, { useMemo, useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import Topbar from "../../components/Topbar";

const ROLES = ["Admin", "Security", "Accounting", "Marketing", "Developer", "Design"];

const FactCard = ({ fact, onDelete }) => {
  const createdAtText = (f) => {
    const ts = f?.createdAt;
    if (!ts) return "—";
    try {
      const d = ts.toDate?.() ? ts.toDate() : new Date(ts.seconds * 1000);
      return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "—";
    }
  };

  const getPriorityColor = (priority) => {
    const p = Number(priority) || 3;
    if (p <= 2) return "success";
    if (p === 3) return "warning";
    return "danger";
  };

  const getTargetBadge = (fact) => {
    if (fact.targetType === "all") return { text: "All Users", color: "primary" };
    if (fact.targetType === "roles") return { text: `Roles: ${fact.roles?.join(", ") || "None"}`, color: "info" };
    if (fact.targetType === "users") return { text: `Specific Users (${fact.userIds?.length || 0})`, color: "secondary" };
    return { text: "Unknown", color: "secondary" };
  };

  const target = getTargetBadge(fact);

  return (
    <div className="card border-0 shadow-sm mb-3 fact-card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="d-flex align-items-center gap-2">
            <div className="fact-icon">
              <i className="bi bi-lightbulb-fill text-warning"></i>
            </div>
            <h6 className="fw-semibold mb-0">{fact.title || "Security Tip"}</h6>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className={`badge bg-${getPriorityColor(fact.priority)}-subtle text-${getPriorityColor(fact.priority)}`}>
              Priority {fact.priority || 3}
            </span>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete(fact.id)}
              title="Delete fact"
            >
              <i className="bi bi-trash me-1"></i>
              Delete
            </button>
          </div>
        </div>
        
        <p className="text-muted mb-3">{fact.message}</p>
        
        <div className="d-flex justify-content-between align-items-center">
          <span className={`badge bg-${target.color}-subtle text-${target.color}`}>
            <i className="bi bi-people me-1"></i>
            {target.text}
          </span>
          <small className="text-muted">
            <i className="bi bi-clock me-1"></i>
            {createdAtText(fact)}
          </small>
        </div>
      </div>
    </div>
  );
};

export default function FactsNotifications() {
  const db = useMemo(() => getFirestore(), []);
  const fun = useMemo(() => getFunctions(), []);

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [facts, setFacts] = useState([]);

  const [form, setForm] = useState({
    title: "",
    message: "",
    priority: 3,
    targetType: "all",
    roles: [],
    userIds: "",
  });

  // live list of facts
  useEffect(() => {
    const q = query(collection(db, "facts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setFacts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (e) => setErr(e.message || String(e))
    );
    return () => unsub();
  }, [db]);

  const resetStatus = () => {
    setErr("");
    setOk("");
  };

  const validate = () => {
    const title = (form.title || "").trim();
    const message = (form.message || "").trim();
    if (!message) return "Message is required.";
    if (title.length > 120) return "Title is too long (max 120 chars).";
    if (message.length > 2000) return "Message is too long (max 2000 chars).";

    if (form.targetType === "roles" && (!form.roles || form.roles.length === 0)) {
      return "Select at least one role.";
    }
    if (form.targetType === "users") {
      const ids = (form.userIds || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (ids.length === 0) return "Provide at least one user ID.";
    }
    const p = Number(form.priority);
    if (Number.isNaN(p) || p < 1 || p > 5) return "Priority must be between 1 and 5.";
    return "";
  };

  const create = async (e) => {
    e?.preventDefault();
    resetStatus();

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setSubmitting(true);
    try {
      // Prepare user IDs array
      const userIdsArray = form.targetType === "users" 
        ? (form.userIds || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [];

      // 1) create fact
      const factData = {
        title: (form.title || "Security Tip").trim(),
        message: (form.message || "").trim(),
        priority: Number(form.priority) || 3,
        targetType: form.targetType,
        roles: form.targetType === "roles" ? (form.roles || []) : [],
        userIds: userIdsArray,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "facts"), factData);

      // 2) broadcast notifications (callable function on your backend)
      const call = httpsCallable(fun, "broadcastFactNotification");
      await call({
        factId: docRef.id,
        title: factData.title,
        message: factData.message,
        targetType: factData.targetType,
        roles: factData.roles,
        userIds: userIdsArray,
      });

      setOk("Fact created and notifications sent successfully!");
      setForm({
        title: "",
        message: "",
        priority: 3,
        targetType: "all",
        roles: [],
        userIds: "",
      });
    } catch (e) {
      console.error("Error creating fact:", e);
      setErr(e?.message || "An error occurred while creating the fact.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (factId) => {
    if (!factId) {
      setErr("Invalid fact ID.");
      return;
    }

    resetStatus();
    const confirmed = window.confirm("Delete this fact? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "facts", factId));
      setOk("Fact deleted successfully.");
    } catch (e) {
      console.error("Error deleting fact:", e);
      setErr(e?.message || "An error occurred while deleting the fact.");
    }
  };

  const handleInputChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (err) {
      setErr("");
    }
  };

  return (
    <>
      <Topbar />
      <div className="container-fluid py-4 dashboard-bg">
        <div className="container" style={{ maxWidth: 1200 }}>
          {/* Header */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="users-header">
                <h3 className="fw-bold mb-0 users-title">
                  <i className="bi bi-lightbulb-fill me-2"></i>
                  Facts & Notifications
                </h3>
                <p className="text-muted mb-0 mt-1">Create security tips and broadcast notifications to users or roles</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {err && (
            <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {err}
            </div>
          )}
          {ok && (
            <div className="alert alert-success border-0 shadow-sm d-flex align-items-center mb-4" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              {ok}
            </div>
          )}

          <div className="row g-4">
            {/* Create Form */}
            <div className="col-12">
              <div className="card border-0 shadow-sm modern-card">
                <div className="card-header bg-white border-0 d-flex align-items-center py-3">
                  <i className="bi bi-plus-circle me-2 text-primary"></i>
                  <h5 className="mb-0 fw-semibold">Create New Fact</h5>
                </div>
                <div className="card-body">
                  <form onSubmit={create}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-type me-1"></i>
                          Title
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-modern"
                          placeholder="e.g., Password Security Reminder"
                          value={form.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          maxLength={120}
                        />
                        <small className="form-text text-muted">
                          {(form.title || "").length}/120 characters
                        </small>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          Priority Level
                        </label>
                        <select
                          className="form-select form-control-modern"
                          value={form.priority}
                          onChange={(e) => handleInputChange('priority', Number(e.target.value))}
                        >
                          <option value={1}>1 - Low Priority</option>
                          <option value={2}>2 - Medium-Low</option>
                          <option value={3}>3 - Medium</option>
                          <option value={4}>4 - High</option>
                          <option value={5}>5 - Critical</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-chat-text me-1"></i>
                          Message <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control form-control-modern"
                          rows={4}
                          placeholder="Write your security tip or important notification message..."
                          value={form.message}
                          onChange={(e) => handleInputChange('message', e.target.value)}
                          maxLength={2000}
                          required
                        />
                        <small className="form-text text-muted">
                          {(form.message || "").length}/2000 characters
                        </small>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-broadcast me-1"></i>
                          Broadcast To
                        </label>
                        <div className="d-flex flex-wrap gap-2">
                          {[
                            { value: "all", label: "All Users", icon: "people-fill" },
                            { value: "roles", label: "Specific Roles", icon: "person-badge" },
                            { value: "users", label: "Specific Users", icon: "person-check" }
                          ].map((option) => (
                            <label className="form-check form-check-modern" key={option.value}>
                              <input
                                className="form-check-input"
                                type="radio"
                                name="targetType"
                                value={option.value}
                                checked={form.targetType === option.value}
                                onChange={(e) => handleInputChange('targetType', e.target.value)}
                              />
                              <span className="form-check-label">
                                <i className={`bi bi-${option.icon} me-2`}></i>
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {form.targetType === "roles" && (
                        <div className="col-12">
                          <label className="form-label fw-semibold">
                            Select Roles <span className="text-danger">*</span>
                          </label>
                          <select
                            multiple
                            className="form-select form-control-modern"
                            value={form.roles}
                            onChange={(e) => {
                              const selectedRoles = Array.from(e.target.selectedOptions).map((o) => o.value);
                              handleInputChange('roles', selectedRoles);
                            }}
                            size={4}
                            required
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <small className="form-text text-muted">
                            Hold Ctrl/Cmd to select multiple roles
                          </small>
                        </div>
                      )}

                      {form.targetType === "users" && (
                        <div className="col-12">
                          <label className="form-label fw-semibold">
                            User IDs <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-modern"
                            placeholder="uid1, uid2, uid3..."
                            value={form.userIds}
                            onChange={(e) => handleInputChange('userIds', e.target.value)}
                            required
                          />
                          <small className="form-text text-muted">
                            Separate multiple user IDs with commas
                          </small>
                        </div>
                      )}

                      <div className="col-12 d-flex justify-content-end">
                        <button 
                          type="submit" 
                          className="btn btn-primary btn-modern" 
                          disabled={submitting || !form.message.trim()}
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Publishing...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-send me-2"></i>
                              Create & Notify
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Facts List */}
            <div className="col-12">
              <div className="card border-0 shadow-sm modern-card">
                <div className="card-header bg-white border-0 d-flex align-items-center justify-content-between py-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    <h5 className="mb-0 fw-semibold">Recent Facts</h5>
                  </div>
                  <span className="badge bg-primary-subtle text-primary">
                    {facts.length} {facts.length === 1 ? 'Fact' : 'Facts'}
                  </span>
                </div>
                <div className="card-body">
                  {facts.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="bi bi-lightbulb text-muted" style={{ fontSize: '3rem' }}></i>
                      <h6 className="text-muted mt-3">No facts created yet</h6>
                      <p className="text-muted small">
                        Create your first security fact or notification to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="facts-container">
                      <div className="row g-3">
                        {facts.map((fact) => (
                          <div key={fact.id} className="col-12 col-md-6 col-lg-4">
                            <FactCard 
                              fact={fact} 
                              onDelete={handleDelete}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Styling */}
          <style>{`
            /* Dashboard Background */
            .dashboard-bg {
              background-color: #f8f9fa;
              min-height: 100vh;
            }
            
            [data-bs-theme="dark"] .dashboard-bg {
              background-color: #1a1d29;
            }

            /* Header Styling */
            .users-header {
              padding: 1.5rem 0;
              border-bottom: 2px solid rgba(var(--bs-primary-rgb), 0.1);
              margin-bottom: 2rem !important;
            }

            .users-title {
              color: var(--bs-primary);
              font-size: 2rem;
              font-weight: 700;
              text-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }

            [data-bs-theme="dark"] .users-title {
              color: white;
            }

            /* Modern Cards */
            .modern-card {
              border-radius: 16px;
              transition: all 0.3s ease;
            }

            .modern-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
            }

            /* Modern Form Controls */
            .form-control-modern,
            .form-select {
              border: 2px solid #e5e7eb;
              border-radius: 12px;
              padding: 12px 16px;
              transition: all 0.2s ease;
              background-color: #f9fafb;
            }

            .form-control-modern:focus,
            .form-select:focus {
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
              background-color: #ffffff;
            }

            /* Modern Form Check */
            .form-check-modern {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px 16px;
              transition: all 0.2s ease;
              cursor: pointer;
            }

            .form-check-modern:has(.form-check-input:checked) {
              background: #dbeafe;
              border-color: #3b82f6;
            }

            .form-check-modern .form-check-input {
              margin-top: 0.125em;
            }

            .form-check-modern .form-check-label {
              cursor: pointer;
            }

            /* Modern Button */
            .btn-modern {
              border-radius: 12px;
              padding: 12px 24px;
              font-weight: 600;
              transition: all 0.2s ease;
            }

            .btn-modern:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .btn-modern:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }

            /* Fact Cards */
            .fact-card {
              border-radius: 16px;
              transition: all 0.2s ease;
              border-left: 4px solid #fbbf24;
              height: 100%;
            }

            .fact-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important;
            }

            .fact-icon {
              width: 40px;
              height: 40px;
              border-radius: 10px;
              background: #fef3c7;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              flex-shrink: 0;
            }

            /* Facts Container */
            .facts-container {
              max-height: 60vh;
              overflow-y: auto;
              padding-right: 8px;
            }

            .facts-container::-webkit-scrollbar {
              width: 6px;
            }

            .facts-container::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 10px;
            }

            .facts-container::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 10px;
            }

            /* Dark Theme Styles */
            [data-bs-theme="dark"] .modern-card,
            [data-bs-theme="dark"] .fact-card,
            [data-bs-theme="dark"] .card {
              background-color: #2d3748 !important;
              border-color: #4a5568 !important;
              color: #e2e8f0 !important;
            }

            [data-bs-theme="dark"] .card-header {
              background-color: #4a5568 !important;
              border-bottom: 1px solid #718096 !important;
              color: #e2e8f0 !important;
            }

            [data-bs-theme="dark"] .form-control-modern,
            [data-bs-theme="dark"] .form-select {
              background-color: #4a5568 !important;
              border-color: #718096 !important;
              color: #e2e8f0 !important;
            }

            [data-bs-theme="dark"] .form-control-modern:focus,
            [data-bs-theme="dark"] .form-select:focus {
              background-color: #2d3748 !important;
              border-color: #60a5fa !important;
              color: #e2e8f0 !important;
            }

            [data-bs-theme="dark"] .form-check-modern {
              background-color: #4a5568 !important;
              border-color: #718096 !important;
            }

            [data-bs-theme="dark"] .form-check-modern:has(.form-check-input:checked) {
              background-color: #1e3a8a !important;
              border-color: #60a5fa !important;
            }

            [data-bs-theme="dark"] .fact-icon {
              background-color: #744210 !important;
              color: #fbbf24 !important;
            }

            [data-bs-theme="dark"] .text-muted {
              color: #a0aec0 !important;
            }

            [data-bs-theme="dark"] .alert-danger {
              background-color: #7f1d1d !important;
              border-color: #991b1b !important;
              color: #fecaca !important;
            }

            [data-bs-theme="dark"] .alert-success {
              background-color: #14532d !important;
              border-color: #16a34a !important;
              color: #bbf7d0 !important;
            }

            [data-bs-theme="dark"] .facts-container::-webkit-scrollbar-track {
              background: #4a5568;
            }

            [data-bs-theme="dark"] .facts-container::-webkit-scrollbar-thumb {
              background: #718096;
            }

            /* Badge Styles */
            .badge {
              font-weight: 500;
              border-radius: 8px;
              padding: 6px 12px;
            }

            .bg-primary-subtle { background-color: #dbeafe !important; }
            .text-primary { color: #2563eb !important; }
            .bg-success-subtle { background-color: #dcfce7 !important; }
            .text-success { color: #16a34a !important; }
            .bg-warning-subtle { background-color: #fef3c7 !important; }
            .text-warning { color: #d97706 !important; }
            .bg-danger-subtle { background-color: #fee2e2 !important; }
            .text-danger { color: #dc2626 !important; }
            .bg-info-subtle { background-color: #dbeafe !important; }
            .text-info { color: #0891b2 !important; }
            .bg-secondary-subtle { background-color: #f1f5f9 !important; }
            .text-secondary { color: #64748b !important; }

            [data-bs-theme="dark"] .bg-primary-subtle { background-color: #1e3a8a !important; }
            [data-bs-theme="dark"] .text-primary { color: #60a5fa !important; }
            [data-bs-theme="dark"] .bg-success-subtle { background-color: #14532d !important; }
            [data-bs-theme="dark"] .text-success { color: #4ade80 !important; }
            [data-bs-theme="dark"] .bg-warning-subtle { background-color: #744210 !important; }
            [data-bs-theme="dark"] .text-warning { color: #fbbf24 !important; }
            [data-bs-theme="dark"] .bg-danger-subtle { background-color: #7f1d1d !important; }
            [data-bs-theme="dark"] .text-danger { color: #f87171 !important; }
            [data-bs-theme="dark"] .bg-info-subtle { background-color: #164e63 !important; }
            [data-bs-theme="dark"] .text-info { color: #38bdf8 !important; }
            [data-bs-theme="dark"] .bg-secondary-subtle { background-color: #374151 !important; }
            [data-bs-theme="dark"] .text-secondary { color: #9ca3af !important; }

            /* Responsive Improvements */
            @media (max-width: 768px) {
              .facts-container {
                max-height: 50vh;
              }
              
              .form-check-modern {
                padding: 10px 12px;
              }
              
              .btn-modern {
                padding: 10px 20px;
              }
            }
          `}</style>
        </div>
      </div>
    </>
  );
}