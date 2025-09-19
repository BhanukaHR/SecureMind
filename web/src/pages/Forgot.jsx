import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, resetAction } from "../firebase";
import { sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";

export default function Forgot() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const oobCode = params.get("oobCode");
  const mode = params.get("mode"); // "resetPassword"
  const resetMode = !!(oobCode && mode === "resetPassword");

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const send = async (e) => {
    e?.preventDefault();
    setErr(""); setOk("");
    try {
      await sendPasswordResetEmail(auth, email.trim(), resetAction);
      setOk("If that email exists, a reset link was sent.");
    } catch (ex) { setErr(ex?.message || "Unable to send reset email."); }
  };

  const confirm = async (e) => {
    e?.preventDefault();
    setErr(""); setOk("");
    if (pwd !== pwd2 || pwd.length < 8) return setErr("Passwords must match and be at least 8 characters.");
    try {
      // (optional) check code valid before confirm for nicer errors
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, pwd);
      setOk("Password updated. Redirecting…");
      setTimeout(()=>nav("/login"), 800);
    } catch (ex) { setErr(ex?.message || "Could not update password."); }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{background:"#0b1220"}}>
      <div className="card shadow-lg border-0 rounded-4" style={{width: 420, background:"#0f172a", color:"#e5e7eb", borderColor:"#1f2a44"}}>
        <div className="card-body p-4">
          <h1 className="h5 fw-semibold text-center mb-2">{resetMode ? "Set a new password" : "Forgot your password?"}</h1>
          <p className="text-secondary small text-center">
            {resetMode ? "Choose a new password." : "Enter your email to receive a reset link."}
          </p>

          {err && <div className="alert alert-danger py-2">{err}</div>}
          {ok && <div className="alert alert-success py-2">{ok}</div>}

          {!resetMode ? (
            <form onSubmit={send} className="vstack gap-3">
              <div>
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                       required autoFocus />
              </div>
              <button className="btn btn-primary w-100">Send reset link</button>
            </form>
          ) : (
            <form onSubmit={confirm} className="vstack gap-3">
              <div>
                <label className="form-label">New password</label>
                <input className="form-control" type="password" value={pwd} onChange={e=>setPwd(e.target.value)}
                       minLength={8} required autoFocus />
              </div>
              <div>
                <label className="form-label">Confirm new password</label>
                <input className="form-control" type="password" value={pwd2} onChange={e=>setPwd2(e.target.value)}
                       minLength={8} required />
              </div>
              <button className="btn btn-primary w-100" disabled={pwd !== pwd2 || pwd.length < 8}>Update password</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
