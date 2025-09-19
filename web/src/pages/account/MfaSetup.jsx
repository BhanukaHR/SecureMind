import React, { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { TotpMultiFactorGenerator, multiFactor } from "firebase/auth";
import QRCode from "qrcode";

export default function MfaSetup() {
  const [uri, setUri] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setErr(""); setMsg(""); setBusy(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not signed in.");
        const mfa = multiFactor(user);
        if ((mfa.enrolledFactors || []).length > 0) {
          setMsg("Authenticator already set up.");
          return;
        }
        const session = await mfa.getSession();
        const secret = await TotpMultiFactorGenerator.generateSecret(session);
        const url = secret.generateQrCodeUrl({
          accountName: user.email || "user",
          issuer: "SecureMind",
        });
        setUri(url);
        const png = await QRCode.toDataURL(url);
        if (alive) setQr(png);
      } catch (e) {
        setErr(e?.message || "Failed to start MFA setup.");
      } finally {
        setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const verify = async (e) => {
    e?.preventDefault();
    setErr(""); setMsg(""); setBusy(true);
    try {
      const user = auth.currentUser;
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(code.trim());
      await multiFactor(user).enroll(assertion, "Authenticator");
      setMsg("✅ Authenticator app added successfully.");
      setCode("");
    } catch (e) {
      setErr(e?.message || "Invalid code. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-4" style={{maxWidth: 560}}>
      <h3 className="fw-bold mb-3">Set up Authenticator app</h3>
      <p className="text-body-secondary">Scan the QR code with Microsoft/Google Authenticator, then enter the 6‑digit code.</p>
      {err && <div className="alert alert-danger">{err}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}
      {qr ? (
        <div className="text-center mb-3">
          <img alt="Authenticator QR" src={qr} style={{ width: 220, height: 220 }} />
          <div className="small text-secondary mt-2"><code style={{wordBreak:'break-all'}}>{uri}</code></div>
        </div>
      ) : (
        <div className="text-body-secondary mb-3">{busy ? "Generating QR…" : ""}</div>
      )}
      <form onSubmit={verify} className="vstack gap-2">
        <label className="form-label">6‑digit code</label>
        <input className="form-control" inputMode="numeric" pattern="[0-9]*" value={code}
               onChange={e => setCode(e.target.value)} placeholder="123456" required maxLength={6}/>
        <button className="btn btn-primary mt-2" disabled={busy}>{busy ? "Verifying…" : "Add authenticator"}</button>
      </form>
    </div>
  );
}
