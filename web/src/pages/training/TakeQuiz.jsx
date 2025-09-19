// web/src/pages/training/TakeQuiz.jsx
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getFirestore, doc, getDoc, addDoc, collection, serverTimestamp, query, where, orderBy, onSnapshot
} from "firebase/firestore";
import { auth, db } from "../../firebase";

export default function TakeQuiz() {
  const { id: quizId } = useParams();
  const nav = useNavigate();
  const fire = useMemo(() => getFirestore(), []);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]); // number | null per question
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [startedAt] = useState(() => new Date());
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getDoc(doc(fire, "quizzes", quizId));
        if (!s.exists()) { setErr("Quiz not found"); return; }
        const qz = { id: s.id, ...s.data() };
        setQuiz(qz);
        setAnswers((qz.questions || []).map(() => null));
      } catch (e) { setErr(e.message); }
    })();
  }, [fire, quizId]);

  // Observe previous attempts for this quiz/user
  useEffect(() => {
    if (!auth.currentUser) return;
    const col = collection(fire, "quiz_attempts");
    const q = query(col, where("userId","==", auth.currentUser.uid), where("quizId","==", quizId), orderBy("submittedAt","desc"));
    const unsub = onSnapshot(q, (snap)=>{
      setAttempts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [fire, quizId]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!quiz || !auth.currentUser) return;
    setSubmitting(true); setErr("");

    try {
      // Auto‑grade
      const qs = quiz.questions || [];
      const total = qs.length;
      const responses = qs.map((q, idx) => {
        const chosen = answers[idx];
        const correct = Number(q.correctIndex) === Number(chosen);
        return { questionIndex: idx, chosenIndex: chosen, correct };
      });
      const score = responses.reduce((s, r) => s + (r.correct ? 1 : 0), 0);
      const percentage = total ? (score / total) * 100 : 0;

      const durationSec = Math.round((Date.now() - startedAt.getTime()) / 1000);
      const passed = percentage >= 70; // tweak threshold if needed

      // Write attempt
      const payload = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || null,
        quizId,
        quizTitle: quiz.title || null,
        responses,
        score,
        total,
        percentage,
        passed,
        startedAt: startedAt, // client time (optional)
        submittedAt: serverTimestamp(), // server truth for ordering
        durationSec,
      };
      await addDoc(collection(db, "quiz_attempts"), payload);

      // simple toast
      alert(`Submitted! You scored ${score}/${total} (${percentage.toFixed(0)}%)`);

      // optional: navigate back to list
      nav("/training");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (err) return <div className="container py-4"><div className="alert alert-danger">{err}</div></div>;
  if (!quiz) return <div className="container py-4"><div className="text-secondary">Loading…</div></div>;

  return (
    <div className="container py-4" style={{maxWidth: 900}}>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h3 className="fw-bold mb-1">{quiz.title}</h3>
          <div className="text-secondary">{quiz.description}</div>
        </div>
        <div>
          {attempts[0] && (
            <span className={`badge ${attempts[0].passed ? "text-bg-success" : "text-bg-secondary"}`}>
              Latest: {Math.round(attempts[0].percentage)}%
            </span>
          )}
        </div>
      </div>

      <form onSubmit={submit}>
        {(quiz.questions || []).map((q, idx) => (
          <div className="card border-0 glass-card mb-3" key={idx}>
            <div className="card-body">
              <div className="fw-semibold mb-2">Q{idx+1}. {q.text}</div>
              <div className="d-flex flex-column gap-1">
                {(q.options || []).map((op, oi) => (
                  <label className="form-check" key={oi}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name={`q${idx}`}
                      checked={answers[idx] === oi}
                      onChange={() => setAnswers(a => {
                        const next = [...a]; next[idx] = oi; return next;
                      })}
                    />
                    <span className="form-check-label">{op}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="d-flex gap-2">
          <button className="btn btn-primary" disabled={submitting}>Submit</button>
          <button type="button" className="btn btn-outline-secondary" onClick={()=>window.print()}>Print / Save PDF</button>
        </div>
      </form>

      <hr className="my-4"/>

      <h6 className="mb-3">Previous Attempts</h6>
      <div className="table-responsive">
        <table className="table align-middle small">
          <thead><tr><th>Date</th><th>Score</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            {attempts.map(a => (
              <tr key={a.id}>
                <td>{a.submittedAt?.seconds ? new Date(a.submittedAt.seconds*1000).toLocaleString() : "—"}</td>
                <td>{a.score}/{a.total} ({Math.round(a.percentage)}%)</td>
                <td>{a.durationSec ? `${a.durationSec}s` : "—"}</td>
                <td>{a.passed ? <span className="badge text-bg-success">Passed</span> : <span className="badge text-bg-secondary">Attempted</span>}</td>
              </tr>
            ))}
            {attempts.length===0 && <tr><td colSpan={4} className="text-secondary">No attempts yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <style>{`.glass-card { background: rgba(255,255,255,.8); backdrop-filter: blur(8px); }`}</style>
    </div>
  );
}
