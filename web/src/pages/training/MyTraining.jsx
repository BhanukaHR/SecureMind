// web/src/pages/training/MyTraining.jsx
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getFirestore, collection, query, where, onSnapshot, doc, getDoc, orderBy,
  getDocs
} from "firebase/firestore";
import { auth, db } from "../../firebase";

function useAuthUser() {
  const [u, setU] = useState(() => auth.currentUser);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setU);
    return () => unsub();
  }, []);
  return u;
}

function AttemptBadge({ attempt }) {
  if (!attempt) return null;
  const pct = attempt.percentage?.toFixed?.(0) ?? Math.round((attempt.score/attempt.total)*100);
  const cls = attempt.passed ? "text-bg-success" : "text-bg-secondary";
  return <span className={`badge ${cls}`}>{pct}% {attempt.passed ? "Passed" : "Attempted"}</span>;
}

export default function MyTraining() {
  const user = useAuthUser();
  const fire = useMemo(() => getFirestore(), []);
  const [role, setRole] = useState("");
  const [assigned, setAssigned] = useState([]); // [{assignment, quiz, latestAttempt, bestAttempt}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Load user's role
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setRole(snap.exists() ? (snap.data().role || "user") : "user");
      } catch (e) { setErr(e.message); }
    })();
  }, [user]);

  // Load assignments targeted to the user's role or uid and join quiz docs + attempts
  useEffect(() => {
    if (!user || !role) return;
    setLoading(true);
    setErr("");
    const col = collection(fire, "quiz_assignments");

    // Two queries (can't OR server-side). Merge client-side.
    const q1 = query(col, where("targetType", "==", "roles"), where("roles", "array-contains", role));
    const q2 = query(col, where("targetType", "==", "users"), where("userIds", "array-contains", user.uid));

    const cleanup = [];
    const buffer = {};

    function upsertAssignment(aDoc) {
      const a = { id: aDoc.id, ...aDoc.data() };
      buffer[a.id] = { assignment: a };
      // later we attach quiz, attempts
    }

    cleanup.push(onSnapshot(q1, (snap) => {
      snap.docChanges().forEach((chg) => upsertAssignment(chg.doc));
      hydrate();
    }, (e)=>setErr(e.message)));

    cleanup.push(onSnapshot(q2, (snap) => {
      snap.docChanges().forEach((chg) => upsertAssignment(chg.doc));
      hydrate();
    }, (e)=>setErr(e.message)));

    async function hydrate() {
      try {
        const items = Object.values(buffer);
        // fetch quizzes
        const quizIds = [...new Set(items.map(i => i.assignment.quizId))];
        const quizDocs = await Promise.all(quizIds.map(async (id) => {
          const s = await getDoc(doc(fire, "quizzes", id));
          return s.exists() ? { id, ...s.data() } : null;
        }));
        const quizMap = Object.fromEntries(quizDocs.filter(Boolean).map(q => [q.id, q]));

        // fetch attempts for this user for all assigned quizzes
        const attemptsCol = collection(fire, "quiz_attempts");
        const allAttempts = [];
        for (const qid of quizIds) {
          const qAttempts = await getDocs(
            query(attemptsCol, where("userId", "==", user.uid), where("quizId", "==", qid), orderBy("submittedAt","desc"))
          );
          qAttempts.forEach(d => allAttempts.push({ id: d.id, ...d.data() }));
        }
        const byQuiz = {};
        allAttempts.forEach(a => {
          const arr = byQuiz[a.quizId] || (byQuiz[a.quizId] = []);
          arr.push(a);
        });

        const merged = items.map(i => {
          const quiz = quizMap[i.assignment.quizId] || null;
          const attempts = byQuiz[i.assignment.quizId] || [];
          const latestAttempt = attempts[0] || null;
          const bestAttempt = attempts.reduce((b, x) => !b || (x.percentage > b.percentage) ? x : b, null);
          return { ...i, quiz, latestAttempt, bestAttempt };
        }).filter(m => !!m.quiz);

        // sort by due date asc then title
        merged.sort((a,b) => {
          const ad = a.assignment.dueDate?.seconds || 0;
          const bd = b.assignment.dueDate?.seconds || 0;
          if (ad !== bd) return ad - bd;
          return (a.quiz.title || "").localeCompare(b.quiz.title || "");
        });

        setAssigned(merged);
        setLoading(false);
      } catch (e) {
        setErr(e.message); setLoading(false);
      }
    }

    return () => cleanup.forEach(u => u && u());
  }, [fire, user, role]);

  return (
    <div className="container py-4" style={{maxWidth: 1100}}>
      <h3 className="fw-bold mb-3">My Training</h3>
      {err && <div className="alert alert-danger">{err}</div>}
      {loading ? <div className="text-secondary">Loading…</div> : (
        <div className="row g-3">
          {assigned.map(({ assignment, quiz, latestAttempt, bestAttempt }) => {
            const due = assignment.dueDate?.seconds ? new Date(assignment.dueDate.seconds*1000) : null;
            const overdue = due && Date.now() > due.getTime() && !latestAttempt?.passed;
            return (
              <div className="col-12 col-md-6 col-lg-4" key={assignment.id}>
                <div className={`card h-100 border-0 glass-card ${overdue ? "border border-danger" : ""}`}>
                  <div className="card-body d-flex flex-column">
                    <div className="fw-semibold mb-1">{quiz.title}</div>
                    <div className="small text-secondary mb-2">{quiz.description}</div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="small">
                        {due ? <>Due: <strong>{due.toLocaleDateString()}</strong></> : <span className="text-secondary">No due date</span>}
                      </div>
                      <AttemptBadge attempt={bestAttempt || latestAttempt} />
                    </div>
                    <div className="mt-auto d-flex gap-2">
                      <Link className="btn btn-primary btn-sm" to={`/training/quiz/${quiz.id}`}>Start / Continue</Link>
                      {latestAttempt && (
                        <button className="btn btn-outline-secondary btn-sm" onClick={()=>{
                          alert(`Latest attempt: ${latestAttempt.score}/${latestAttempt.total} (${latestAttempt.percentage.toFixed(0)}%)`);
                        }}>Details</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {assigned.length===0 && <div className="col-12 text-secondary">No assigned quizzes yet.</div>}
        </div>
      )}

      <style>{`
        .glass-card { background: rgba(255,255,255,.8); backdrop-filter: blur(8px); }
      `}</style>
    </div>
  );
}
