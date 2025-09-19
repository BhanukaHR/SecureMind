// web/src/pages/admin/Users.jsx
import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getFirestore, collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile,
  deleteUser as authDeleteUser,
  signOut
} from "firebase/auth";
import Topbar from "../../components/Topbar";

const ROLES = ["Admin","Security","Accounting","Marketing","Developer","Design"];

export default function Users() {
  const db = useMemo(() => getFirestore(), []);
  const auth = useMemo(() => getAuth(), []);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({ email: "", role: "Accounting", tempPassword: "" });
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt","desc")), 
      (snap) => {
        setUsers(snap.docs.map(d => ({id:d.id, ...d.data()})));
        setLoading(false);
      }, 
      (e) => { 
        setErr(e.message); 
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db]);

  const createUser = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const email = form.email.trim();
      const password = form.tempPassword || generateRandomPassword();
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await addDoc(collection(db, "users"), {
        uid: user.uid,
        email: email,
        role: form.role,
        disabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Sign out the newly created user so admin stays signed in
      await signOut(auth);
      
      setForm({ email: "", role: "Accounting", tempPassword: "" });
      setErr("User created successfully. They can sign in with the provided credentials.");
      
    } catch (e) {
      console.error("Create user error:", e);
      setErr(e.message);
    }
  };

  const generateRandomPassword = () => {
    return Math.random().toString(36).slice(-12) + "A1!";
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (!edit) return;
      
      // Update user document in Firestore
      await updateDoc(doc(db, "users", edit.id), {
        role: edit.role,
        disabled: !!edit.disabled,
        updatedAt: serverTimestamp(),
      });
      
      setEdit(null);
      setErr("User updated successfully. Note: Role changes require the user to sign in again to take effect.");
      
    } catch (e) {
      console.error("Update user error:", e);
      setErr(e.message);
    }
  };

  const toggleDisable = async (u) => {
    setErr("");
    try {
      // Update user document in Firestore
      await updateDoc(doc(db, "users", u.id), {
        disabled: !u.disabled,
        updatedAt: serverTimestamp()
      });
      
      setErr(`User ${!u.disabled ? 'disabled' : 'enabled'} successfully. Note: This only updates the database record.`);
      
    } catch (e) { 
      console.error("Toggle disable error:", e);
      setErr(e.message); 
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This will only remove the user record from the database. The Firebase Auth account may still exist.`)) return;
    setErr("");
    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, "users", u.id));
      setErr("User record deleted from database successfully.");
      
    } catch (e) { 
      console.error("Delete user error:", e);
      setErr(e.message); 
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      Admin: 'danger',
      Security: 'warning',
      Accounting: 'info',
      Marketing: 'success',
      Developer: 'primary',
      Design: 'secondary'
    };
    return colors[role] || 'primary';
  };

  return (
    <>
      <Topbar />
      <div className="container py-4" style={{maxWidth: 1100}}>
        <div className="users-header mb-4">
          <h3 className="fw-bold mb-0 users-title">
            <i className="bi bi-people-fill me-2"></i>
            Manage Users
          </h3>
          <p className="text-muted mb-0 mt-1">Create and manage user accounts and permissions</p>
        </div>

        {err && (
          <div className={`alert ${err.includes('successfully') ? 'alert-success' : 'alert-danger'} alert-enhanced`} role="alert">
            <i className={`bi ${err.includes('successfully') ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
            {err}
          </div>
        )}

        {/* Create */}
        <div className="card border-0 users-card mb-4">
          <div className="card-header users-card-header">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-person-plus me-2"></i>
              Add New User
            </h5>
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={createUser}>
              <div className="col-md-4">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-envelope me-1"></i>
                  Email Address
                </label>
                <input 
                  required 
                  type="email" 
                  className="form-control form-control-enhanced" 
                  value={form.email}
                  onChange={e=>setForm({...form,email:e.target.value})}
                  placeholder="user@company.com"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-person-badge me-1"></i>
                  Role
                </label>
                <select 
                  className="form-select" 
                  value={form.role} 
                  onChange={e=>setForm({...form,role:e.target.value})}
                >
                  {ROLES.map(r=> <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-key me-1"></i>
                  Temp Password (optional)
                </label>
                <input 
                  type="text" 
                  className="form-control form-control-enhanced" 
                  placeholder="Auto-generated if blank"
                  value={form.tempPassword} 
                  onChange={e=>setForm({...form,tempPassword:e.target.value})}
                />
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button 
                  className="btn btn-primary btn-enhanced w-100" 
                  disabled={!form.email}
                  type="submit"
                >
                  <i className="bi bi-plus-lg me-2"></i>
                  Add User
                </button>
              </div>
            </form>
            <div className="users-info-note mt-3">
              <i className="bi bi-info-circle me-2"></i>
              Creates Firebase Auth user and writes profile to <code className="code-enhanced">users</code> collection. 
              <strong>Note:</strong> Role-based access control requires custom implementation since Cloud Functions are not being used.
            </div>
          </div>
        </div>

        {/* List */}
        <div className="card border-0 users-card">
          <div className="card-header users-card-header">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-list-ul me-2"></i>
              User Directory ({users.length})
            </h5>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="text-secondary">Loading users...</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table users-table">
                  <thead>
                    <tr>
                      <th>
                        <i className="bi bi-envelope me-1"></i>
                        Email
                      </th>
                      <th>
                        <i className="bi bi-person-badge me-1"></i>
                        Role
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
                    {users.map(u=>(
                      <tr key={u.id} className="user-row">
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="user-avatar me-2">
                              <i className="bi bi-person-circle"></i>
                            </div>
                            <div>
                              <div className="user-email">{u.email}</div>
                              <div className="user-id">ID: {u.id ? u.id.substring(0, 8) : 'N/A'}...</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge role-badge role-badge-${getRoleColor(u.role)}`}>
                            <i className="bi bi-person-badge-fill me-1"></i>
                            {u.role || "user"}
                          </span>
                        </td>
                        <td>
                          {u.disabled ? (
                            <span className="badge status-badge status-disabled">
                              <i className="bi bi-x-circle-fill me-1"></i>
                              Disabled
                            </span>
                          ) : (
                            <span className="badge status-badge status-active">
                              <i className="bi bi-check-circle-fill me-1"></i>
                              Active
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm action-buttons">
                            <button 
                              className="btn btn-outline-secondary btn-action"
                              onClick={()=>setEdit({...u})}
                              title="Edit user"
                              type="button"
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button 
                              className={`btn btn-action ${u.disabled ? 'btn-outline-success' : 'btn-outline-warning'}`}
                              onClick={()=>toggleDisable(u)}
                              title={u.disabled ? "Enable user" : "Disable user"}
                              type="button"
                            >
                              <i className={`bi ${u.disabled ? 'bi-check-circle' : 'bi-x-circle'}`}></i>
                            </button>
                            <button 
                              className="btn btn-outline-danger btn-action"
                              onClick={()=>remove(u)}
                              title="Delete user"
                              type="button"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length===0 && (
                      <tr>
                        <td colSpan={4} className="text-center empty-state">
                          <div className="py-4">
                            <i className="bi bi-people display-4 mb-3 d-block text-muted"></i>
                            <p className="mb-0">No users found</p>
                            <small className="text-muted">Add your first user above to get started</small>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Edit modal */}
        {edit && (
          <>
            <div className="modal-backdrop fade show" onClick={()=>setEdit(null)}></div>
            <div className="modal fade show" style={{display:"block"}} tabIndex="-1" role="dialog">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content users-modal">
                  <div className="modal-header users-modal-header">
                    <h5 className="modal-title">
                      <i className="bi bi-person-gear me-2"></i>
                      Edit User
                    </h5>
                    <button 
                      type="button"
                      className="btn-close btn-close-white" 
                      onClick={()=>setEdit(null)}
                      aria-label="Close"
                    />
                  </div>
                  <form onSubmit={saveEdit}>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label text-muted small">Email Address</label>
                        <div className="user-email-display">
                          <i className="bi bi-envelope me-2"></i>
                          {edit.email}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label form-label-enhanced">
                          <i className="bi bi-person-badge me-1"></i>
                          Role
                        </label>
                        <select 
                          className="form-select" 
                          value={edit.role || 'Accounting'} 
                          onChange={e=>setEdit({...edit,role:e.target.value})}
                        >
                          {ROLES.map(r=> <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="form-check form-check-enhanced">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="disabled" 
                          checked={!!edit.disabled}
                          onChange={e=>setEdit({...edit,disabled:e.target.checked})}
                        />
                        <label className="form-check-label" htmlFor="disabled">
                          <i className="bi bi-x-circle me-1"></i>
                          Disable user account
                        </label>
                      </div>
                      <div className="alert alert-info mt-3" role="alert">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>Note: Role changes only update the database record. For full role-based access control, consider implementing custom security rules or using Firebase Cloud Functions.</small>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary btn-enhanced" 
                        onClick={()=>setEdit(null)}
                      >
                        <i className="bi bi-x-lg me-2"></i>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-enhanced">
                        <i className="bi bi-check-lg me-2"></i>
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bootstrap Icons CDN */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" 
      />

      <style>{`
        /* Users Management Enhanced Styles */
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

        .users-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .users-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 48px rgba(0,0,0,0.12);
        }

        .users-card-header {
          background: linear-gradient(135deg, var(--bs-primary), #0056b3);
          color: white;
          border: none !important;
          padding: 1.25rem 1.5rem;
          font-weight: 600;
        }

        .users-card-header h5 {
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

        .form-control-enhanced {
          border: 2px solid rgba(var(--bs-primary-rgb), 0.1);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.9);
          font-family: inherit;
        }

        .form-select {
          border: 2px solid rgba(var(--bs-primary-rgb), 0.1);
          border-radius: 12px;
          padding: 0.75rem 2.5rem 0.75rem 1rem;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.9);
          font-family: inherit;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='%23343a40' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e") !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 16px 12px !important;
        }

        /* Additional browser-specific overrides */
        .form-select::-ms-expand {
          display: none;
        }

        .form-select::-webkit-appearance {
          -webkit-appearance: none !important;
        }

        .form-select::-moz-appearance {
          -moz-appearance: none !important;
        }

        .form-control-enhanced:focus {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
          background: white;
          transform: translateY(-1px);
        }

        .form-select:focus {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
          background: white;
          transform: translateY(-1px);
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='%230052b8' stroke='%230052b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
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

        .users-info-note {
          background: rgba(var(--bs-info-rgb), 0.1);
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid var(--bs-info);
          font-size: 0.875rem;
          color: var(--bs-secondary);
          display: flex;
          align-items: flex-start;
          line-height: 1.5;
        }

        .code-enhanced {
          background: rgba(var(--bs-dark-rgb), 0.1);
          color: var(--bs-dark);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875em;
        }

        .users-table {
          margin: 0;
        }

        .users-table thead th {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border: none;
          font-weight: 600;
          color: var(--bs-dark);
          padding: 1rem;
          border-radius: 0;
          position: relative;
        }

        .users-table thead th::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--bs-primary), transparent);
        }

        .user-row {
          transition: all 0.3s ease;
        }

        .user-row:hover {
          background: rgba(var(--bs-primary-rgb), 0.02);
          transform: scale(1.002);
        }

        .user-row td {
          padding: 1rem;
          border-color: rgba(0,0,0,0.05);
          vertical-align: middle;
        }

        .user-avatar {
          color: var(--bs-secondary);
          font-size: 1.5rem;
        }

        .user-email {
          font-weight: 600;
          color: var(--bs-dark);
          font-size: 0.95rem;
        }

        .user-id {
          font-size: 0.75rem;
          color: var(--bs-secondary);
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .role-badge {
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
        }

        .role-badge-danger {
          background: linear-gradient(135deg, var(--bs-danger), #dc3545);
          color: white;
        }

        .role-badge-warning {
          background: linear-gradient(135deg, var(--bs-warning), #ffc107);
          color: var(--bs-dark);
        }

        .role-badge-info {
          background: linear-gradient(135deg, var(--bs-info), #0dcaf0);
          color: white;
        }

        .role-badge-success {
          background: linear-gradient(135deg, var(--bs-success), #28a745);
          color: white;
        }

        .role-badge-primary {
          background: linear-gradient(135deg, var(--bs-primary), #0056b3);
          color: white;
        }

        .role-badge-secondary {
          background: linear-gradient(135deg, var(--bs-secondary), #6c757d);
          color: white;
        }

        .status-badge {
          font-weight: 600;
          padding: 0.5rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          display: inline-flex;
          align-items: center;
        }

        .status-active {
          background: linear-gradient(135deg, var(--bs-success), #28a745);
          color: white;
        }

        .status-disabled {
          background: linear-gradient(135deg, var(--bs-secondary), #6c757d);
          color: white;
        }

        .btn-action {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.3s ease;
          padding: 0.5rem 0.75rem;
        }

        .btn-action:hover {
          transform: translateY(-1px);
        }

        .action-buttons {
          gap: 0.25rem;
        }

        .empty-state {
          padding: 3rem 1rem !important;
        }

        .empty-state i {
          opacity: 0.3;
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

        /* Modal Styles */
        .users-modal {
          border-radius: 16px;
          overflow: hidden;
          border: none;
        }

        .users-modal-header {
          background: linear-gradient(135deg, var(--bs-dark), #495057);
          color: white;
          border: none;
        }

        .user-email-display {
          background: rgba(var(--bs-primary-rgb), 0.1);
          border-radius: 8px;
          padding: 0.75rem;
          font-weight: 600;
          color: var(--bs-primary);
          display: flex;
          align-items: center;
        }

        .form-check-enhanced {
          background: rgba(var(--bs-light-rgb), 0.5);
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid var(--bs-warning);
        }

        .form-check-enhanced .form-check-label {
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .modal-backdrop {
          z-index: 1040;
        }

        .modal {
          z-index: 1050;
        }

        /* Success and error alert styles */
        .alert-success {
          background: linear-gradient(135deg, var(--bs-success), #28a745);
          color: white;
          border: none;
        }

        .alert-danger {
          background: linear-gradient(135deg, var(--bs-danger), #dc3545);
          color: white;
          border: none;
        }

        /* Additional utility styles */
        .users-info-note strong {
          color: var(--bs-warning);
          font-weight: 700;
        }

        .modal-body .alert {
          font-size: 0.875rem;
          padding: 0.75rem 1rem;
        }

        /* Improved form validation styles */
        .form-control-enhanced:invalid {
          border-color: var(--bs-danger);
        }

        .form-control-enhanced:valid {
          border-color: var(--bs-success);
        }

        /* Enhanced button states */
        .btn-enhanced:disabled {
          opacity: 0.6;
          transform: none !important;
          cursor: not-allowed;
        }

        .btn-enhanced:disabled:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        /* Dark theme adjustments */
        [data-bs-theme="dark"] .users-title {
          color: white;
        }

        [data-bs-theme="dark"] .users-card {
          background: rgba(33, 37, 41, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        [data-bs-theme="dark"] .form-control-enhanced {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .form-select {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
          color: var(--bs-light);
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='%23ffffff' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
        }

        [data-bs-theme="dark"] .form-control-enhanced:focus {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--bs-primary);
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .form-select:focus {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--bs-primary);
          color: var(--bs-light);
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='%236ea8fe' stroke='%236ea8fe' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
        }

        [data-bs-theme="dark"] .form-select option {
          background-color: #2d3748;
          color: white;
        }

        [data-bs-theme="dark"] .users-table thead th {
          background: linear-gradient(135deg, #2c3034, #1a1d20);
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .user-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        [data-bs-theme="dark"] .user-email {
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .users-info-note {
          background: rgba(var(--bs-info-rgb), 0.15);
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .code-enhanced {
          background: rgba(255, 255, 255, 0.1);
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .user-email-display {
          background: rgba(var(--bs-primary-rgb), 0.2);
        }

        [data-bs-theme="dark"] .form-check-enhanced {
          background: rgba(255, 255, 255, 0.05);
        }

        [data-bs-theme="dark"] .users-modal {
          background: var(--bs-dark);
          color: var(--bs-light);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .users-title {
            font-size: 1.5rem;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .btn-action {
            font-size: 0.875rem;
            padding: 0.5rem;
          }
          
          .users-card-header {
            padding: 1rem;
          }

          .user-row td {
            padding: 0.75rem;
          }

          .user-email {
            font-size: 0.875rem;
          }

          .role-badge,
          .status-badge {
            font-size: 0.75rem;
            padding: 0.375rem 0.5rem;
          }
        }

        /* Improved table responsiveness */
        @media (max-width: 576px) {
          .users-table {
            font-size: 0.875rem;
          }
          
          .user-id {
            display: none;
          }
          
          .role-badge,
          .status-badge {
            font-size: 0.7rem;
            padding: 0.25rem 0.4rem;
          }
          
          .btn-action {
            padding: 0.375rem 0.5rem;
          }
          
          .action-buttons .btn-action i {
            font-size: 0.875rem;
          }
        }

        /* Loading animation */
        .spinner-border {
          width: 2rem;
          height: 2rem;
        }
      `}
      </style>
    </>
  );
}