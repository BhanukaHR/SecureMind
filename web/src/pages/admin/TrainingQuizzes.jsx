// web/src/pages/admin/TrainingQuizzes.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDocs,
  where,
  writeBatch,
  doc,
  deleteDoc,
} from "firebase/firestore";
import Topbar from "../../components/Topbar";

const ROLES = ["Admin", "Security", "Accounting", "Marketing", "Developer", "Design"];

export default function TrainingQuizzes() {
  const db = useMemo(() => getFirestore(), []);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // quiz or assignment id

  const [qForm, setQForm] = useState({
    title: "",
    description: "",
    roles: ["Accounting"],
    questions: [{ text: "", options: ["", "", "", ""], correctIndex: 0 }],
  });

  const [aForm, setAForm] = useState({
    quizId: "",
    targetType: "roles",
    roles: ["Accounting"],
    userIds: "",
    dueDate: "",
  });

  const resetBanners = () => {
    setErr("");
    setOk("");
  };

  // Live data
  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "quizzes"), orderBy("createdAt", "desc")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setQuizzes(list);
        // default selection for assignment form
        setAForm((s) => (!s.quizId && list[0] ? { ...s, quizId: list[0].id } : s));
      },
      (e) => setErr(e.message || String(e))
    );
    const u2 = onSnapshot(
      query(collection(db, "quiz_assignments"), orderBy("createdAt", "desc")),
      (snap) => setAssignments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => setErr(e.message || String(e))
    );
    return () => {
      u1();
      u2();
    };
  }, [db]);

  // ---- Quiz helpers
  const addQuestion = () =>
    setQForm((f) => ({
      ...f,
      questions: [...f.questions, { text: "", options: ["", "", "", ""], correctIndex: 0 }],
    }));

  const validateQuiz = () => {
    const title = (qForm.title || "").trim();
    if (!title) return "Quiz title is required.";
    for (let i = 0; i < qForm.questions.length; i++) {
      const q = qForm.questions[i];
      if (!q.text.trim()) return `Question ${i + 1}: text is required.`;
      if (!Array.isArray(q.options) || q.options.length !== 4) return `Question ${i + 1}: needs 4 options.`;
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) return `Question ${i + 1}, Option ${j + 1}: text is required.`;
      }
      if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex > 3) {
        return `Question ${i + 1}: correct answer index must be 0–3.`;
      }
    }
    return "";
  };

  const createQuiz = async (e) => {
    e.preventDefault();
    resetBanners();
    const v = validateQuiz();
    if (v) return setErr(v);
    setSavingQuiz(true);
    try {
      await addDoc(collection(db, "quizzes"), {
        title: qForm.title.trim(),
        description: (qForm.description || "").trim(),
        roles: qForm.roles || [],
        questions: qForm.questions,
        createdAt: serverTimestamp(),
      });
      setQForm({
        title: "",
        description: "",
        roles: ["Accounting"],
        questions: [{ text: "", options: ["", "", "", ""], correctIndex: 0 }],
      });
      setOk("Quiz saved.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSavingQuiz(false);
    }
  };

  // ---- Assignment helpers
  const validateAssignment = () => {
    if (!aForm.quizId) return "Select a quiz to assign.";
    if (aForm.targetType === "roles" && (!aForm.roles || aForm.roles.length === 0)) {
      return "Select at least one role.";
    }
    if (aForm.targetType === "users") {
      const ids = (aForm.userIds || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length === 0) return "Provide at least one user ID.";
    }
    return "";
  };

  const assignQuiz = async (e) => {
    e.preventDefault();
    resetBanners();
    const v = validateAssignment();
    if (v) return setErr(v);
    setSavingAssign(true);
    try {
      const ids =
        aForm.targetType === "users"
          ? (aForm.userIds || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      const dueTs = aForm.dueDate ? Timestamp.fromDate(new Date(aForm.dueDate)) : null;

      await addDoc(collection(db, "quiz_assignments"), {
        quizId: aForm.quizId,
        targetType: aForm.targetType, // "roles" | "users"
        roles: aForm.targetType === "roles" ? aForm.roles : [],
        userIds: aForm.targetType === "users" ? ids : [],
        dueDate: dueTs,
        createdAt: serverTimestamp(),
      });

      setAForm({
        quizId: aForm.quizId,
        targetType: "roles",
        roles: ["Accounting"],
        userIds: "",
        dueDate: "",
      });
      setOk("Quiz assigned.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSavingAssign(false);
    }
  };

  // ---- Deletes
  const deleteQuiz = async (quizId, quizTitle) => {
    resetBanners();
    const okGo = window.confirm(
      `Delete quiz "${quizTitle || quizId}"?\nThis will also delete all its assignments.`
    );
    if (!okGo) return;

    setDeletingId(quizId);
    try {
      // delete assignments for this quiz
      const q = query(collection(db, "quiz_assignments"), where("quizId", "==", quizId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      // delete quiz
      batch.delete(doc(db, "quizzes", quizId));
      await batch.commit();
      setOk("Quiz and its assignments deleted.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAssignment = async (assignmentId) => {
    resetBanners();
    const okGo = window.confirm("Delete this assignment?");
    if (!okGo) return;
    setDeletingId(assignmentId);
    try {
      await deleteDoc(doc(db, "quiz_assignments", assignmentId));
      setOk("Assignment deleted.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const mapQuizTitle = useMemo(
    () => Object.fromEntries(quizzes.map((q) => [q.id, q.title])),
    [quizzes]
  );

  return (
    <>
      <Topbar />
      <div className="container py-4" style={{ maxWidth: 1100 }}>
        <div className="policies-header mb-4">
          <h3 className="fw-bold mb-0 policies-title">
            <i className="bi bi-patch-question me-2"></i>
            Training & Quizzes
          </h3>
          <p className="text-muted mb-0 mt-1">Create quizzes and assign them to users or roles</p>
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

        {/* Create Quiz */}
        <div className="card border-0 policy-card mb-4">
          <div className="card-header policy-card-header">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-plus-circle me-2"></i>
              Create Quiz
            </h5>
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={createQuiz}>
              <div className="col-md-6">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-card-text me-1"></i>
                  Title
                </label>
                <input
                  className="form-control form-control-enhanced"
                  required
                  value={qForm.title}
                  onChange={(e) => setQForm({ ...qForm, title: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-people me-1"></i>
                  Roles (Target)
                </label>
                <select
                  className="form-select form-control-enhanced"
                  multiple
                  value={qForm.roles}
                  onChange={(e) =>
                    setQForm({
                      ...qForm,
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
                  <i className="bi bi-text-paragraph me-1"></i>
                  Description
                </label>
                <input
                  className="form-control form-control-enhanced"
                  value={qForm.description}
                  onChange={(e) => setQForm({ ...qForm, description: e.target.value })}
                />
              </div>

              {qForm.questions.map((q, qi) => (
                <div className="col-12" key={qi}>
                  <div className="card border-0 question-card">
                    <div className="card-body">
                      <div className="mb-3">
                        <label className="form-label form-label-enhanced">
                          <i className="bi bi-question-circle me-1"></i>
                          Question {qi + 1}
                        </label>
                        <input
                          className="form-control form-control-enhanced"
                          value={q.text}
                          onChange={(e) => {
                            const qs = [...qForm.questions];
                            qs[qi] = { ...qs[qi], text: e.target.value };
                            setQForm({ ...qForm, questions: qs });
                          }}
                        />
                      </div>
                      <div className="row g-2">
                        {q.options.map((op, oi) => (
                          <div className="col-md-6" key={oi}>
                            <label className="form-label form-label-enhanced">
                              <i className="bi bi-list-ul me-1"></i>
                              Option {oi + 1}
                            </label>
                            <input
                              className="form-control form-control-enhanced"
                              value={op}
                              onChange={(e) => {
                                const qs = [...qForm.questions];
                                const opts = [...qs[qi].options];
                                opts[oi] = e.target.value;
                                qs[qi] = { ...qs[qi], options: opts };
                                setQForm({ ...qForm, questions: qs });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 d-flex align-items-center gap-2">
                        <label className="form-label form-label-enhanced mb-0">
                          <i className="bi bi-check-circle me-1"></i>
                          Correct Answer
                        </label>
                        <select
                          className="form-select form-control-enhanced w-auto"
                          value={q.correctIndex}
                          onChange={(e) => {
                            const qs = [...qForm.questions];
                            qs[qi] = { ...qs[qi], correctIndex: Number(e.target.value) };
                            setQForm({ ...qForm, questions: qs });
                          }}
                        >
                          {[0, 1, 2, 3].map((i) => (
                            <option key={i} value={i}>
                              Option {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="col-12 d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary btn-enhanced" onClick={addQuestion}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Question
                </button>
                <button className="btn btn-primary btn-enhanced" disabled={savingQuiz}>
                  {savingQuiz ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      Save Quiz
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Assignments */}
        <div className="card border-0 policy-card">
          <div className="card-header policy-card-header">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-send me-2"></i>
              Assign Quiz
            </h5>
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={assignQuiz}>
              <div className="col-md-4">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-patch-question me-1"></i>
                  Quiz
                </label>
                <select
                  className="form-select form-control-enhanced"
                  value={aForm.quizId}
                  onChange={(e) => setAForm({ ...aForm, quizId: e.target.value })}
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-bullseye me-1"></i>
                  Target
                </label>
                <select
                  className="form-select form-control-enhanced"
                  value={aForm.targetType}
                  onChange={(e) => setAForm({ ...aForm, targetType: e.target.value })}
                >
                  <option value="roles">Role(s)</option>
                  <option value="users">User(s)</option>
                </select>
              </div>

              {aForm.targetType === "roles" ? (
                <div className="col-md-3">
                  <label className="form-label form-label-enhanced">
                    <i className="bi bi-people me-1"></i>
                    Roles
                  </label>
                  <select
                    className="form-select form-control-enhanced"
                    multiple
                    value={aForm.roles}
                    onChange={(e) =>
                      setAForm({
                        ...aForm,
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
                </div>
              ) : (
                <div className="col-md-3">
                  <label className="form-label form-label-enhanced">
                    <i className="bi bi-person me-1"></i>
                    User IDs
                  </label>
                  <input
                    className="form-control form-control-enhanced"
                    placeholder="uid1, uid2"
                    value={aForm.userIds}
                    onChange={(e) => setAForm({ ...aForm, userIds: e.target.value })}
                  />
                </div>
              )}

              <div className="col-md-2">
                <label className="form-label form-label-enhanced">
                  <i className="bi bi-calendar-event me-1"></i>
                  Due Date
                </label>
                <input
                  className="form-control form-control-enhanced"
                  type="date"
                  value={aForm.dueDate}
                  onChange={(e) => setAForm({ ...aForm, dueDate: e.target.value })}
                />
              </div>

              <div className="col-md-12 d-flex gap-2">
                <button className="btn btn-primary btn-enhanced" disabled={savingAssign}>
                  {savingAssign ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Assigning…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Assign
                    </>
                  )}
                </button>
              </div>
            </form>

            <hr className="my-4" />
            <div className="d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-semibold">
                <i className="bi bi-list-check me-2"></i>
                Recent Assignments
              </h5>
            </div>

            <div className="table-responsive mt-3">
              <table className="table policy-table align-middle">
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Target</th>
                    <th>Due</th>
                    <th>Created</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="policy-row">
                      <td>{mapQuizTitle[a.quizId] || a.quizId}</td>
                      <td>
                        {a.targetType === "roles"
                          ? (a.roles || []).join(", ")
                          : `${(a.userIds || []).length} user(s)`}
                      </td>
                      <td>
                        {a.dueDate
                          ? new Date(
                              a.dueDate.seconds ? a.dueDate.seconds * 1000 : a.dueDate
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {a.createdAt?.seconds
                          ? new Date(a.createdAt.seconds * 1000).toLocaleString()
                          : "—"}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-danger btn-action"
                          onClick={() => deleteAssignment(a.id)}
                          disabled={deletingId === a.id}
                        >
                          {deletingId === a.id ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Deleting…
                            </>
                          ) : (
                            <>
                              <i className="bi bi-trash me-1"></i>
                              Delete
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary empty-state">
                        <div className="py-4">
                          <i className="bi bi-inbox display-4 mb-3 d-block"></i>
                          <p className="mb-0">No assignments found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quizzes list with delete */}
        <div className="card border-0 policy-card mt-4">
          <div className="card-header policy-card-header">
            <h5 className="mb-0 fw-semibold">
              <i className="bi bi-list-ul me-2"></i>
              Quizzes
            </h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table policy-table align-middle">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Created</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map((q) => (
                    <tr key={q.id} className="policy-row">
                      <td>
                        <div className="fw-semibold policy-title-cell">{q.title}</div>
                        <div className="small text-secondary">{q.description}</div>
                      </td>
                      <td>
                        {q.createdAt?.seconds
                          ? new Date(q.createdAt.seconds * 1000).toLocaleString()
                          : "—"}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-danger btn-action"
                          onClick={() => deleteQuiz(q.id, q.title)}
                          disabled={deletingId === q.id}
                          title="Delete quiz and its assignments"
                        >
                          {deletingId === q.id ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1"></span>
                              Deleting…
                            </>
                          ) : (
                            <>
                              <i className="bi bi-trash me-1"></i>
                              Delete Quiz
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {quizzes.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-secondary empty-state">
                        <div className="py-4">
                          <i className="bi bi-inbox display-4 mb-3 d-block"></i>
                          <p className="mb-0">No quizzes found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="small text-secondary mt-3">
              <i className="bi bi-info-circle me-1"></i>
              Deleting a quiz also removes all related assignments.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Quiz-specific styles */
        .question-card {
          background: rgba(var(--bs-light-rgb), 0.5) !important;
          border-radius: 12px;
          border-left: 4px solid var(--bs-primary);
          margin-bottom: 1rem;
        }
        
        [data-bs-theme="dark"] .question-card {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        
        /* Inherit all the enhanced styles from Policies component */
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

        .empty-state {
          padding: 3rem 1rem !important;
        }

        .empty-state i {
          color: var(--bs-secondary);
          opacity: 0.5;
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

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .policies-title {
            font-size: 1.5rem;
          }
          
          .btn-enhanced {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
          }
          
          .policy-card-header {
            padding: 1rem;
          }
        }
      `}</style>
    </>
  );
}