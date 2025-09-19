// web/src/pages/admin/Policies.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import Topbar from "../../components/Topbar";

const ROLES = ["Admin", "Security", "Accounting", "Marketing", "Developer", "Design"];

export default function Policies() {
  // Firestore + Functions
  const db = useMemo(() => getFirestore(), []);
  const functions = useMemo(() => getFunctions(), []);

  // UI state
  const [policies, setPolicies] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [publishingId, setPublishingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  // Create form
  const [form, setForm] = useState({
    title: "",
    roles: ["Admin"],
    content: "",
  });

  const resetBanners = () => {
    setErr("");
    setOk("");
  };

  // Live list
  useEffect(() => {
    const q = query(collection(db, "policies"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPolicies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (e) => setErr(e?.message || String(e))
    );
    return () => unsub();
  }, [db]);

  // Create policy (text only)
  const createPolicy = async (e) => {
    e?.preventDefault();
    resetBanners();

    const title = (form.title || "").trim();
    const content = (form.content || "").trim();
    if (!title) return setErr("Policy title is required.");
    if (!content) return setErr("Policy content is required.");

    try {
      await addDoc(collection(db, "policies"), {
        title,
        roles: form.roles || [],
        version: 1,
        status: "draft", // draft | published
        content, // <-- store the text content directly
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setOk("Policy saved as draft.");
      setForm({ title: "", roles: ["Admin"], content: "" });
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  // Start editing a policy's content (creates a new version on save)
  const startEdit = (p) => {
    resetBanners();
    setEditingId(p.id);
    setEditDraft(p.content || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  // Save new version (from text draft)
  const saveNewVersion = async (p) => {
    resetBanners();
    const content = (editDraft || "").trim();
    if (!content) return setErr("Content cannot be empty.");

    try {
      await updateDoc(doc(db, "policies", p.id), {
        content,
        version: (p.version || 1) + 1,
        updatedAt: serverTimestamp(),
        // keep status as-is; you can republish after edits if needed
      });
      setOk(`v${(p.version || 1) + 1} saved.`);
      cancelEdit();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  // Publish & notify assigned roles
  const publish = async (p) => {
    resetBanners();
    try {
      setPublishingId(p.id);
      await updateDoc(doc(db, "policies", p.id), {
        status: "published",
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const call = httpsCallable(functions, "broadcastPolicyNotification");
      await call({ policyId: p.id, title: p.title, roles: p.roles });

      setOk("Policy published and notifications sent.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setPublishingId(null);
    }
  };

  // Delete policy
  const remove = async (p) => {
    resetBanners();
    const confirmed = window.confirm(`Delete policy "${p.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "policies", p.id));
      setOk("Policy deleted.");
      if (editingId === p.id) cancelEdit();
    } catch (e) {
      setErr(e?.message || String(e));
    }
  };

  // Helpers
  const rolesToText = (arr) => (arr && arr.length ? arr.join(", ") : "—");

  return (
    <>
      <Topbar />
      <div className="container py-4" style={{ maxWidth: 1100 }}>
        <div className="policies-header mb-4">
          <h3 className="fw-bold mb-0 policies-title">
            <i className="bi bi-shield-check me-2"></i>
            Policy Management
          </h3>
          <p className="text-muted mb-0 mt-1">Create, manage and distribute company policies</p>
        </div>

        {err && (
          <div className="alert alert-danger alert-enhanced" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {err}
          </div>
        )}
        {ok && (
          <div className="alert alert-success alert-enhanced" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            {ok}
          </div>
        )}

        {/* Create (text-based) */}
        <div className="card border-0 policy-card mb-4">
          <div className="card-header policy-card-header">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-plus-circle me-2"></i>
              Create New Policy
            </h5>
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={createPolicy}>
              <div className="col-md-5">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-card-text me-1"></i>
                  Policy Title
                </label>
                <input
                  className="form-control form-control-enhanced"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Acceptable Use Policy"
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-people me-1"></i>
                  Assign to Roles
                </label>
                <select
                  multiple
                  className="form-select form-control-enhanced"
                  value={form.roles}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      roles: Array.from(e.target.selectedOptions).map((o) => o.value),
                    })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="form-text form-text-enhanced">
                  <i className="bi bi-info-circle me-1"></i>
                  Hold Ctrl/Cmd to select multiple roles.
                </div>
              </div>

              <div className="col-12">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-file-text me-1"></i>
                  Policy Content
                </label>
                <textarea
                  className="form-control form-control-enhanced"
                  rows={8}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Type or paste your policy text here..."
                  required
                />
              </div>

              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-primary btn-enhanced">
                  <i className="bi bi-save me-2"></i>
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 policy-card">
          <div className="card-header policy-card-header">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-list-ul me-2"></i>
              Existing Policies
            </h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table policy-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>
                      <i className="bi bi-card-heading me-1"></i>
                      Title
                    </th>
                    <th>
                      <i className="bi bi-git me-1"></i>
                      Version
                    </th>
                    <th>
                      <i className="bi bi-people me-1"></i>
                      Roles
                    </th>
                    <th>
                      <i className="bi bi-circle-fill me-1"></i>
                      Status
                    </th>
                    <th className="text-end">
                      <i className="bi bi-gear me-1"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => {
                    const isEditing = editingId === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <tr className="policy-row">
                          <td>
                            <div className="fw-semibold policy-title-cell">{p.title}</div>
                            <details className="mt-1 policy-details">
                              <summary className="small text-primary policy-summary">
                                <i className="bi bi-eye me-1"></i>
                                View content
                              </summary>
                              <div className="policy-content-preview mt-2">
                                <pre className="small mb-0">{p.content || "—"}</pre>
                              </div>
                            </details>
                          </td>
                          <td>
                            <span className="badge version-badge">v{p.version || 1}</span>
                          </td>
                          <td className="small roles-cell">{rolesToText(p.roles)}</td>
                          <td>
                            {p.status === "published" ? (
                              <span className="badge status-badge status-published">
                                <i className="bi bi-check-circle-fill me-1"></i>
                                Published
                              </span>
                            ) : (
                              <span className="badge status-badge status-draft">
                                <i className="bi bi-pencil-fill me-1"></i>
                                Draft
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="d-flex gap-2 justify-content-end action-buttons">
                              {p.status !== "published" && (
                                <button
                                  className="btn btn-sm btn-primary btn-action btn-publish"
                                  disabled={publishingId === p.id}
                                  onClick={() => publish(p)}
                                >
                                  {publishingId === p.id ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-1"></span>
                                      Publishing…
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-broadcast me-1"></i>
                                      Publish & Notify
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-outline-secondary btn-action btn-edit"
                                onClick={() => startEdit(p)}
                              >
                                <i className="bi bi-pencil-square me-1"></i>
                                Edit / New Version
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger btn-action btn-delete"
                                onClick={() => remove(p)}
                                title="Delete policy"
                              >
                                <i className="bi bi-trash me-1"></i>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline editor row */}
                        {isEditing && (
                          <tr>
                            <td colSpan={5}>
                              <div className="policy-editor">
                                <div className="policy-editor-header">
                                  <i className="bi bi-pencil-square me-2"></i>
                                  <span className="fw-semibold">Edit Content (new version)</span>
                                </div>
                                <textarea
                                  className="form-control form-control-enhanced mb-3"
                                  rows={8}
                                  value={editDraft}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                />
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-success btn-enhanced"
                                    onClick={() => saveNewVersion(p)}
                                  >
                                    <i className="bi bi-check-lg me-2"></i>
                                    Save New Version
                                  </button>
                                  <button className="btn btn-outline-secondary btn-enhanced" onClick={cancelEdit}>
                                    <i className="bi bi-x-lg me-2"></i>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {policies.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary empty-state">
                        <div className="py-4">
                          <i className="bi bi-inbox display-4 mb-3 d-block"></i>
                          <p className="mb-0">No policies found</p>
                          <small className="text-muted">Create your first policy above to get started</small>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="policy-footer-note">
              <i className="bi bi-info-circle me-2"></i>
              Acknowledgements are tracked via <code className="code-enhanced">policy_acks</code> where users mark policies as "read".
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Policy Management Enhanced Styles */
        .policies-header {
          padding: 1.5rem 0;
          border-bottom: 2px solid rgba(var(--bs-primary-rgb), 0.1);
          margin-bottom: 2rem !important;
        }

        .policies-title {
          color: var(--bs-primary);
          font-size: 2rem;
          font-weight: 700;
          text-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .policy-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .policy-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 48px rgba(0,0,0,0.12);
        }

        .policy-card-header {
          background: linear-gradient(135deg, var(--bs-primary), #0056b3);
          color: white;
          border: none !important;
          padding: 1.25rem 1.5rem;
          font-weight: 600;
        }

        .policy-card-header h5 {
          margin: 0;
          display: flex;
          align-items: center;
        }

        .form-label-enhanced {
          font-weight: 600;
          color: var(--bs-dark);
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }

        .form-control-enhanced,
        .form-select {
          border: 2px solid rgba(var(--bs-primary-rgb), 0.1);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.9);
        }

        .form-control-enhanced:focus,
        .form-select:focus {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
          background: white;
          transform: translateY(-1px);
        }

        .form-text-enhanced {
          color: var(--bs-secondary);
          font-size: 0.875rem;
          margin-top: 0.25rem;
          display: flex;
          align-items: center;
        }

        .btn-enhanced {
          border-radius: 20px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          transition: all 0.3s ease;
          border-width: 2px;
          display: inline-flex;
          align-items: center;
        }

        .btn-enhanced:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        .btn-action {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
        }

        .btn-action:hover {
          transform: translateY(-1px);
        }

        .btn-publish:hover {
          background-color: #0056b3 !important;
          border-color: #0056b3 !important;
        }

        .btn-edit:hover {
          background-color: var(--bs-secondary);
          color: white !important;
          border-color: var(--bs-secondary) !important;
        }

        .btn-delete:hover {
          background-color: var(--bs-danger);
          color: white !important;
          border-color: var(--bs-danger) !important;
        }

        .policy-table {
          margin: 0;
        }

        .policy-table thead th {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border: none;
          font-weight: 600;
          color: var(--bs-dark);
          padding: 1rem;
          border-radius: 0;
          position: relative;
        }

        .policy-table thead th::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--bs-primary), transparent);
        }

        .policy-row {
          transition: all 0.3s ease;
        }

        .policy-row:hover {
          background: rgba(var(--bs-primary-rgb), 0.02);
          transform: scale(1.002);
        }

        .policy-row td {
          padding: 1rem;
          border-color: rgba(0,0,0,0.05);
          vertical-align: middle;
        }

        .policy-title-cell {
          color: var(--bs-dark);
          font-size: 1.1rem;
        }

        .policy-details summary {
          cursor: pointer;
          user-select: none;
          transition: all 0.3s ease;
        }

        .policy-details summary:hover {
          color: var(--bs-primary) !important;
          transform: translateX(2px);
        }

        .policy-content-preview {
          background: rgba(var(--bs-light-rgb), 0.5);
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid var(--bs-primary);
          max-height: 200px;
          overflow-y: auto;
        }

        .policy-content-preview pre {
          white-space: pre-wrap;
          word-break: break-word;
          margin: 0;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          line-height: 1.5;
        }

        .version-badge {
          background: linear-gradient(135deg, var(--bs-info), #0dcaf0);
          color: white;
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
        }

        .status-badge {
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
        }

        .status-published {
          background: linear-gradient(135deg, var(--bs-success), #28a745);
          color: white;
        }

        .status-draft {
          background: linear-gradient(135deg, var(--bs-warning), #ffc107);
          color: var(--bs-dark);
        }

        .roles-cell {
          font-weight: 500;
          color: var(--bs-secondary);
        }

        .action-buttons {
          gap: 0.5rem;
        }

        .policy-editor {
          background: linear-gradient(135deg, rgba(var(--bs-light-rgb), 0.8), rgba(var(--bs-light-rgb), 0.6));
          border-radius: 12px;
          padding: 1.5rem;
          margin: 0.5rem 0;
          border: 2px dashed rgba(var(--bs-primary-rgb), 0.3);
        }

        .policy-editor-header {
          color: var(--bs-primary);
          font-size: 1.1rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
        }

        .empty-state {
          padding: 3rem 1rem !important;
        }

        .empty-state i {
          color: var(--bs-secondary);
          opacity: 0.5;
        }

        .policy-footer-note {
          background: rgba(var(--bs-info-rgb), 0.1);
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
          border-left: 4px solid var(--bs-info);
          font-size: 0.875rem;
          color: var(--bs-secondary);
          display: flex;
          align-items: flex-start;
        }

        .code-enhanced {
          background: rgba(var(--bs-dark-rgb), 0.1);
          color: var(--bs-dark);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
        }

        .alert-enhanced {
          border: none;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          font-weight: 500;
        }

        /* Dark theme adjustments */
        [data-bs-theme="dark"] .policies-title {
          color: white;
        }

        [data-bs-theme="dark"] .policy-title-cell {
          color: var(--bs-light) !important;
        }

        [data-bs-theme="dark"] .form-label-enhanced {
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .policy-card {
          background: rgba(33, 37, 41, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        [data-bs-theme="dark"] .policy-card {
          background: rgba(33, 37, 41, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        [data-bs-theme="dark"] .form-control-enhanced,
        [data-bs-theme="dark"] .form-select {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .form-control-enhanced:focus,
        [data-bs-theme="dark"] .form-select:focus {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--bs-primary);
        }

        [data-bs-theme="dark"] .policy-table thead th {
          background: linear-gradient(135deg, #2c3034, #1a1d20);
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .policy-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        [data-bs-theme="dark"] .policy-content-preview {
          background: rgba(255, 255, 255, 0.05);
        }

        [data-bs-theme="dark"] .policy-editor {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
          border-color: rgba(var(--bs-primary-rgb), 0.3);
        }

        [data-bs-theme="dark"] .policy-footer-note {
          background: rgba(var(--bs-info-rgb), 0.15);
        }

        [data-bs-theme="dark"] .code-enhanced {
          background: rgba(255, 255, 255, 0.1);
          color: var(--bs-light);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .policies-title {
            font-size: 1.5rem;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .btn-action {
            font-size: 0.875rem;
            padding: 0.5rem 0.75rem;
          }
          
          .policy-card-header {
            padding: 1rem;
          }
        }

        /* Animation for loading states */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </>
  );
}
