import React, { useEffect, useMemo, useState } from "react";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  query,
} from "firebase/firestore";
import Topbar from "../../components/Topbar";

/**
 * Admin → System Settings
 * - Centralized application & security settings
 * - Bulk user operations (role updates, enable/disable, metadata flags)
 *
 * Collections used:
 *   app_settings/system (single document)
 *   users (bulk updates)
 */

const DEFAULT_SETTINGS = {
  org: {
    companyName: "",
    supportEmail: "",
    timezone: "UTC",
    dashboardAccent: "primary",
  },
  security: {
    maintenanceMode: false,
    enforceMFA: false,          // informational flag (can't force enrollments client-side)
    sessionTimeoutMins: 30,     // UI-only; see your idle-logout hook implementation
    passwordPolicy: {
      minLength: 12,
      requireNumbers: true,
      requireSymbols: true,
      requireUppercase: true,
    },
    allowedDomains: "",         // comma-separated
    passwordRotationDays: 0,    // 0 = disabled
  },
  notifications: {
    defaultFactPriority: 3,
    broadcastThrottleSec: 0,
  },
  data: {
    retentionDaysFacts: 365,
    retentionDaysPolicies: 0, // 0 = keep forever
  },
};

const ROLE_OPTIONS = [
  "Admin",
  "Security",
  "Accounting",
  "Marketing",
  "Developer",
  "Design",
];

export default function SystemSettings() {
  const db = useMemo(() => getFirestore(), []);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // Bulk ops UI state
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulk, setBulk] = useState({
    target: "all", // all | nonAdmins | byRole
    roleFilter: "Accounting",
    action: "setRole", // setRole | disableAll | enableAll
    newRole: "Accounting",
  });

  useEffect(() => {
    const run = async () => {
      try {
        const ref = doc(collection(db, "app_settings"), "system");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          // merge with defaults to guard against missing fields
          const merged = deepMerge(DEFAULT_SETTINGS, snap.data());
          setSettings(merged);
        } else {
          await setDoc(ref, {
            ...DEFAULT_SETTINGS,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (e) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [db]);

  const resetBanners = () => {
    setErr("");
    setOk("");
  };

  const save = async (e) => {
    e?.preventDefault();
    resetBanners();
    setSaving(true);
    try {
      const ref = doc(collection(db, "app_settings"), "system");
      const prepared = sanitizeSettings(settings);
      await updateDoc(ref, { ...prepared, updatedAt: serverTimestamp() });
      setOk("Settings saved.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  // ---------- Bulk user operations ----------
  const runBulk = async () => {
    resetBanners();
    if (!window.confirm("Apply bulk change to users? This may take a moment.")) return;
    setBulkBusy(true);
    try {
      // Load all users (client-side pagination via batched writes)
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      const docs = snap.docs;

      // Filter targets
      const targets = docs.filter((d) => {
        const u = d.data();
        const role = (u.role || "").toLowerCase();
        if (bulk.target === "all") return true;
        if (bulk.target === "nonAdmins") return role !== "admin";
        if (bulk.target === "byRole") return role === (bulk.roleFilter || "").toLowerCase();
        return false;
      });

      // Chunk into groups of 450 to stay under 500 writes/batch
      const chunks = chunk(targets, 450);
      let updated = 0;

      for (const group of chunks) {
        const batch = writeBatch(db);
        for (const d of group) {
          if (bulk.action === "setRole") {
            batch.update(d.ref, {
              role: bulk.newRole,
              updatedAt: serverTimestamp(),
            });
          } else if (bulk.action === "disableAll") {
            batch.update(d.ref, {
              disabled: true,
              updatedAt: serverTimestamp(),
            });
          } else if (bulk.action === "enableAll") {
            batch.update(d.ref, {
              disabled: false,
              updatedAt: serverTimestamp(),
            });
          }
          updated++;
        }
        await batch.commit();
      }

      setOk(
        bulk.action === "setRole"
          ? `Updated role to "${bulk.newRole}" for ${updated} user(s).`
          : `${bulk.action === "disableAll" ? "Disabled" : "Enabled"} ${updated} user(s).`
      );
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBulkBusy(false);
    }
  };

  // helpers
  const handle = (path, value) => {
    setSettings((s) => setAtPath({ ...s }, path, value));
  };

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="text-muted">Loading system settings…</div>
      </div>
    );
  }

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
                  <i className="bi bi-gear-wide-connected me-2"></i>
                  System Settings
                </h3>
                <p className="text-muted mb-0 mt-1">Configure organization, security, notifications, data retention, and run bulk user changes</p>
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

          <form onSubmit={save}>
            <div className="row g-4">
              {/* Organization */}
              <div className="col-12">
                <div className="card border-0 shadow-sm modern-card">
                  <div className="card-header bg-white border-0 d-flex align-items-center py-3">
                    <i className="bi bi-building me-2 text-primary"></i>
                    <h5 className="mb-0 fw-semibold">Organization</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-5">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-card-text me-1"></i>
                          Company Name
                        </label>
                        <input
                          className="form-control form-control-modern"
                          value={settings.org.companyName}
                          onChange={(e) => handle(["org", "companyName"], e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-envelope me-1"></i>
                          Support Email
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-modern"
                          value={settings.org.supportEmail}
                          onChange={(e) => handle(["org", "supportEmail"], e.target.value)}
                          placeholder="support@company.com"
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-clock-history me-1"></i>
                          Timezone (display)
                        </label>
                        <input
                          className="form-control form-control-modern"
                          value={settings.org.timezone}
                          onChange={(e) => handle(["org", "timezone"], e.target.value)}
                          placeholder="e.g., Asia/Colombo"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="col-12">
                <div className="card border-0 shadow-sm modern-card">
                  <div className="card-header bg-white border-0 d-flex align-items-center py-3">
                    <i className="bi bi-shield-lock me-2 text-danger"></i>
                    <h5 className="mb-0 fw-semibold">Security</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-toggle2-on me-1"></i>
                          Maintenance Mode
                        </label>
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={!!settings.security.maintenanceMode}
                            onChange={(e) => handle(["security", "maintenanceMode"], e.target.checked)}
                          />
                          <label className="form-check-label">Show maintenance banner and limit non-admin access</label>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-fingerprint me-1"></i>
                          Enforce MFA (flag)
                        </label>
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={!!settings.security.enforceMFA}
                            onChange={(e) => handle(["security", "enforceMFA"], e.target.checked)}
                          />
                          <label className="form-check-label">Admins should enroll in MFA (tracked in settings)</label>
                        </div>
                        <small className="text-muted">Note: Client apps must respect this flag and block access for unenrolled admins.</small>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-hourglass-split me-1"></i>
                          Session Timeout (mins)
                        </label>
                        <input
                          type="number"
                          min={5}
                          className="form-control form-control-modern"
                          value={settings.security.sessionTimeoutMins}
                          onChange={(e) => handle(["security", "sessionTimeoutMins"], clampInt(e.target.value, 5, 480))}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-arrow-repeat me-1"></i>
                          Password Rotation (days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          className="form-control form-control-modern"
                          value={settings.security.passwordRotationDays}
                          onChange={(e) => handle(["security", "passwordRotationDays"], clampInt(e.target.value, 0, 3650))}
                        />
                      </div>

                      {/* Password policy */}
                      <div className="col-12">
                        <div className="p-3 rounded border bg-light">
                          <div className="d-flex align-items-center mb-2">
                            <i className="bi bi-key me-2"></i>
                            <strong>Password Policy</strong>
                          </div>
                          <div className="row g-3">
                            <div className="col-md-3">
                              <label className="form-label fw-semibold">Min Length</label>
                              <input
                                type="number"
                                min={6}
                                className="form-control form-control-modern"
                                value={settings.security.passwordPolicy.minLength}
                                onChange={(e) => handle(["security", "passwordPolicy", "minLength"], clampInt(e.target.value, 6, 128))}
                              />
                            </div>
                            <div className="col-md-9">
                              <div className="d-flex flex-wrap gap-4 pt-1">
                                {[
                                  ["requireNumbers", "Require numbers (0–9)"],
                                  ["requireSymbols", "Require symbols (!@#)"],
                                  ["requireUppercase", "Require uppercase (A–Z)"],
                                ].map(([k, label]) => (
                                  <div className="form-check form-switch" key={k}>
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={!!settings.security.passwordPolicy[k]}
                                      onChange={(e) => handle(["security", "passwordPolicy", k], e.target.checked)}
                                    />
                                    <label className="form-check-label">{label}</label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-at me-1"></i>
                          Allowed Sign‑in Domains (comma separated)
                        </label>
                        <input
                          className="form-control form-control-modern"
                          value={settings.security.allowedDomains}
                          onChange={(e) => handle(["security", "allowedDomains"], e.target.value)}
                          placeholder="company.com, subsidiary.co"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="col-12">
                <div className="card border-0 shadow-sm modern-card">
                  <div className="card-header bg-white border-0 d-flex align-items-center py-3">
                    <i className="bi bi-bell me-2 text-warning"></i>
                    <h5 className="mb-0 fw-semibold">Notifications</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-lightning me-1"></i>
                          Default Fact Priority
                        </label>
                        <select
                          className="form-select form-control-modern"
                          value={settings.notifications.defaultFactPriority}
                          onChange={(e) => handle(["notifications", "defaultFactPriority"], clampInt(e.target.value, 1, 5))}
                        >
                          {[1,2,3,4,5].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-hourglass-top me-1"></i>
                          Broadcast Throttle (seconds)
                        </label>
                        <input
                          type="number"
                          min={0}
                          className="form-control form-control-modern"
                          value={settings.notifications.broadcastThrottleSec}
                          onChange={(e) => handle(["notifications", "broadcastThrottleSec"], clampInt(e.target.value, 0, 3600))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data retention */}
              <div className="col-12">
                <div className="card border-0 shadow-sm modern-card">
                  <div className="card-header bg-white border-0 d-flex align-items-center py-3">
                    <i className="bi bi-archive me-2 text-info"></i>
                    <h5 className="mb-0 fw-semibold">Data Retention</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-lightbulb-fill me-1"></i>
                          Facts (days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          className="form-control form-control-modern"
                          value={settings.data.retentionDaysFacts}
                          onChange={(e) => handle(["data", "retentionDaysFacts"], clampInt(e.target.value, 0, 3650))}
                        />
                        <small className="text-muted">0 keeps indefinitely; build a cleanup job that respects this value.</small>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          <i className="bi bi-file-text me-1"></i>
                          Policies (days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          className="form-control form-control-modern"
                          value={settings.data.retentionDaysPolicies}
                          onChange={(e) => handle(["data", "retentionDaysPolicies"], clampInt(e.target.value, 0, 3650))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bulk user operations */}
              <div className="col-12">
                <div className="card border-0 shadow-sm modern-card">
                  <div className="card-header bg-white border-0 d-flex align-items-center py-3">
                    <i className="bi bi-people-gear me-2 text-secondary"></i>
                    <h5 className="mb-0 fw-semibold">Bulk User Operations</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Target</label>
                        <select
                          className="form-select"
                          value={bulk.target}
                          onChange={(e) => setBulk({ ...bulk, target: e.target.value })}
                        >
                          <option value="all">All users</option>
                          <option value="nonAdmins">Non‑admins</option>
                          <option value="byRole">Users with role…</option>
                        </select>
                      </div>
                      {bulk.target === "byRole" && (
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">Role filter</label>
                          <select
                            className="form-select"
                            value={bulk.roleFilter}
                            onChange={(e) => setBulk({ ...bulk, roleFilter: e.target.value })}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">Action</label>
                        <select
                          className="form-select"
                          value={bulk.action}
                          onChange={(e) => setBulk({ ...bulk, action: e.target.value })}
                        >
                          <option value="setRole">Set role</option>
                          <option value="disableAll">Disable</option>
                          <option value="enableAll">Enable</option>
                        </select>
                      </div>
                      {bulk.action === "setRole" && (
                        <div className="col-md-3">
                          <label className="form-label fw-semibold">New Role</label>
                          <select
                            className="form-select"
                            value={bulk.newRole}
                            onChange={(e) => setBulk({ ...bulk, newRole: e.target.value })}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="col-md-12 d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          disabled={bulkBusy}
                          onClick={runBulk}
                        >
                          {bulkBusy ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Applying…
                            </>
                          ) : (
                            <>
                              <i className="bi bi-gear-wide me-2"></i>
                              Apply Bulk Change
                            </>
                          )}
                        </button>
                        <small className="text-muted d-flex align-items-center">
                          Changes update Firestore user records. Firebase Auth account properties like MFA enrollment cannot be mass‑edited here.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="col-12 d-flex justify-content-end">
                <button className="btn btn-primary" disabled={saving} type="submit">
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Icons CDN (if not globally loaded) */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
      />
    </>
  );
}

// ---------- utilities ----------
function clampInt(v, min, max) {
  const n = Math.max(min, Math.min(max, parseInt(String(v || 0), 10) || 0));
  return n;
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (typeof base === "object" && base) {
    const out = { ...base };
    for (const k of Object.keys(incoming || {})) {
      out[k] = deepMerge(base[k], incoming[k]);
    }
    return out;
  }
  return incoming === undefined ? base : incoming;
}

function setAtPath(obj, path, value) {
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    cur[p] = cur[p] ?? {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
