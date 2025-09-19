import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, setAuthPersistence } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const db = getFirestore();

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function resolveRole() {
    const u = auth.currentUser;
    if (!u) return null;
    try {
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const userData = snap.data();
        const role = userData.role;
        console.log("User role resolved:", role); // Debug log
        return role ? String(role).toLowerCase() : "user";
      }
      return "user"; // Default role if no user document exists
    } catch (error) {
      console.error("Error resolving role:", error);
      return "user"; // Default role on error
    }
  }

  const redirectByRole = async () => {
    try {
      const role = await resolveRole();
      console.log("Redirecting with role:", role); // Debug log
      
      // Check if there's a specific redirect location
      const redirectPath = loc.state?.from?.pathname;
      
      if (redirectPath) {
        nav(redirectPath, { replace: true });
      } else {
        // Role-based dashboard redirect
        switch (role) {
          case "admin":
            nav("/dashboard/admin", { replace: true });
            break;
          case "trainer":
            nav("/dashboard/trainer", { replace: true });
            break;
          case "security":
            nav("/dashboard/security", { replace: true });
            break;
          case "accounting":
            nav("/dashboard/accounting", { replace: true });
            break;
          case "marketing":
            nav("/dashboard/marketing", { replace: true });
            break;
          case "developer":
            nav("/dashboard/developer", { replace: true });
            break;
          case "design":
            nav("/dashboard/design", { replace: true });
            break;
          default:
            nav("/dashboard/user", { replace: true });
        }
      }
    } catch (error) {
      console.error("Error during redirect:", error);
      nav("/dashboard/user", { replace: true }); // Fallback
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setErr("");
    setBusy(true);
    
    try {
      // Set auth persistence based on remember me checkbox
      await setAuthPersistence(remember);
      
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pwd);
      const user = userCredential.user;
      
      console.log("User signed in:", user.uid); // Debug log
      
      // Wait a moment for the user to be fully authenticated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirect based on role
      await redirectByRole();
      
    } catch (ex) {
      console.error("Sign in error:", ex);
      let errorMessage = "Unable to sign in. Please check your credentials and try again.";
      
      // Provide more specific error messages
      switch (ex.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password. Please try again.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled. Please contact support.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please wait a moment before trying again.";
          break;
        default:
          errorMessage = ex?.message || errorMessage;
      }
      
      setErr(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style>{`
        :root{
          --bg-1:#0b1020; --bg-2:#0e1326; --ink-1:#e5e7eb; --ink-2:#c7c9d1; --ink-dim:#9aa0ab;
          --primary:#7c8cff; --primary-2:#9a7cff; --surface:#0f152b; --surface-2:#141b34; --border:#24304f;
          --success:#22c55e; --danger:#ef4444; --shadow:0 10px 30px rgba(0,0,0,.35);
        }

        /* Allow page to scroll if content exceeds viewport */
        .screen {
          min-height: 100vh;                    
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: stretch;
          background:
            radial-gradient(1200px 600px at -10% -10%, #1e2a5a 0%, transparent 60%),
            radial-gradient(1000px 600px at 110% 110%, #442a6b 0%, transparent 60%),
            linear-gradient(180deg, var(--bg-1), var(--bg-2));
          color: var(--ink-1);
          /* removed overflow:hidden */
        }

        .welcome {
          position: relative;
          display: flex; flex-direction: column;
          justify-content: flex-start; align-items: flex-start;
          padding: 20% 4rem 2.5rem;
          overflow: hidden;
        }

        .welcome-inner { width: 100%; max-width: 720px; position: relative; z-index: 2; }

        .glow {
          position: absolute; inset: -20%;
          background:
            radial-gradient(600px 300px at 30% 20%, rgba(124,140,255,.18), transparent 60%),
            radial-gradient(500px 280px at 70% 80%, rgba(154,124,255,.16), transparent 60%);
          filter: blur(10px); z-index: 1;
        }

        .logo-badge{display:inline-flex;gap:.6rem;align-items:center;padding:.6rem .85rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:999px;backdrop-filter:saturate(140%) blur(4px);font-weight:600;letter-spacing:.2px;}
        .logo-dot{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,var(--primary),var(--primary-2));box-shadow:0 8px 22px rgba(124,140,255,.35);display:inline-block;}

        .title{margin:1rem 0 .4rem;font-size:clamp(28px,3.3vw,44px);line-height:1.1;font-weight:800;}
        .subtitle{margin:0 0 1rem;color:var(--ink-2);font-size:clamp(14px,1.3vw,17px);max-width:52ch;}

        .bullets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem 1rem;margin:1rem 0 1.25rem;}
        .bullet{display:flex;gap:.65rem;align-items:flex-start;color:var(--ink-2);}
        .bullet i{margin-top:.2rem;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:rgba(124,140,255,.15);border:1px solid rgba(124,140,255,.25);}
        .action-row{display:flex;gap:.75rem;flex-wrap:wrap;}
        .btn-ghost{display:inline-flex;align-items:center;gap:.5rem;color:var(--ink-1);text-decoration:none;padding:.7rem 1rem;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);transition:.2s ease;}
        .btn-ghost:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.22);}

        .panel{
          position: relative;
          display:flex; flex-direction:column; justify-content:center;
          padding: 2.5rem 3rem;
          background:
            radial-gradient(600px 120px at 50% 0%, rgba(124,140,255,.15), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.00));
          border-left: 1px solid rgba(255,255,255,.05);
          overflow-y: visible;                /* allow page scroll */
          overscroll-behavior: contain;
        }

        .card{width:100%;max-width:520px;background:linear-gradient(180deg,var(--surface),var(--surface-2));border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow);padding:2rem;}

        .brand{display:flex;align-items:center;justify-content:center;gap:.6rem;margin-bottom:.75rem;}
        .brand .glyph{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--primary),var(--primary-2));box-shadow:0 10px 26px rgba(124,140,255,.35);font-weight:800;}
        .brand span{color:var(--ink-2);font-weight:600;letter-spacing:.3px;}

        .head{text-align:center;margin-bottom:1rem;}
        .head h2{margin:.25rem 0 .35rem;font-weight:800;color:#fff;}
        .muted{color:var(--ink-dim);font-size:.95rem;}

        .form-group{margin-bottom:1rem;}
        label{display:block;margin:0 0 .45rem;color:var(--ink-2);font-weight:600;}
        .input{width:100%;color:var(--ink-1);background:#0e142a;border:1px solid var(--border);border-radius:12px;padding:.9rem 1rem;transition:.2s ease;}
        .input:focus{outline:none;border-color:rgba(124,140,255,.65);box-shadow:0 0 0 4px rgba(124,140,255,.15);}

        .pw-wrap{position:relative;}
        .toggle{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--ink-dim);cursor:pointer;padding:.35rem .5rem;border-radius:8px;}
        .toggle:hover{color:var(--ink-1);background:rgba(255,255,255,.05);}

        .row-between{display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin:.5rem 0 1rem;}
        .check{display:flex;align-items:center;gap:.55rem;color:var(--ink-2);}
        .checkbox{appearance:none;width:18px;height:18px;border-radius:5px;border:1px solid var(--border);background:#0e142a;cursor:pointer;position:relative;}
        .checkbox:checked{background:linear-gradient(135deg,var(--primary),var(--primary-2));border-color:transparent;}
        .checkbox:checked:after{content:"";position:absolute;inset:3px;background:white;border-radius:3px;}

        .alert{display:flex;gap:.7rem;align-items:flex-start;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.35);color:#fecaca;padding:.85rem .9rem;border-radius:12px;margin:.25rem 0 1rem;}

        .btn{width:100%;border:0;cursor:pointer;border-radius:12px;padding:.95rem 1rem;font-weight:700;background:linear-gradient(135deg,var(--primary),var(--primary-2));color:white;transition:.2s ease;display:flex;align-items:center;justify-content:center;gap:.6rem;}
        .btn:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(124,140,255,.35);}
        .btn:disabled{opacity:.7;cursor:not-allowed;transform:none;box-shadow:none;}

        .outline{display:inline-flex;gap:.6rem;align-items:center;justify-content:center;margin-top:.6rem;width:100%;border:1px solid var(--border);background:transparent;color:var(--ink-1);padding:.9rem 1rem;border-radius:12px;text-decoration:none;font-weight:700;}
        .outline:hover{border-color:rgba(124,140,255,.6);background:rgba(124,140,255,.06);}

        .split{display:flex;align-items:center;gap:.75rem;margin:1rem 0;color:var(--ink-dim);}
        .split hr{flex:1;border:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);}

        .back-home{background:transparent;border:0;color:var(--ink-2);text-decoration:underline;cursor:pointer;margin-top:.9rem;}
        .link{color:var(--primary-2);text-decoration:none;}
        .link:hover{text-decoration:underline;}

        /* Mobile */
        @media (max-width: 992px){
          .screen{grid-template-columns:1fr;}
          .welcome{order:2;padding:1.5rem 1.25rem 2rem;}
          .panel{order:1;padding:1.5rem 1.25rem;}
          .bullets{grid-template-columns:1fr;}
        }
      `}</style>

      <main className="screen">
        {/* Left: info */}
        <section className="welcome">
          <div className="glow" aria-hidden="true" />
          <div className="welcome-inner">
            <span className="logo-badge">
              <span className="logo-dot" />
              SecureMind
            </span>
            <h1 className="title">Welcome back, defender</h1>
            <p className="subtitle">
              Pick up right where you left off. Train smarter with role-based modules,
              quizzes, and real-world simulations — all aligned to your company's security policy.
            </p>

            <div className="bullets">
              <div className="bullet"><i>✓</i><div><strong>Role-aware learning</strong><div className="muted">Admin, Security, Accounting, Dev, and more.</div></div></div>
              <div className="bullet"><i>✓</i><div><strong>Compliance tracking</strong><div className="muted">See progress, scores, and deadlines.</div></div></div>
              <div className="bullet"><i>✓</i><div><strong>Gamified drills</strong><div className="muted">Phishing spotters, bug hunts, invoice checks.</div></div></div>
              <div className="bullet"><i>✓</i><div><strong>Policy updates</strong><div className="muted">Acknowledge and stay compliant in minutes.</div></div></div>
            </div>

          
          </div>
        </section>

        {/* Right: login */}
        <aside className="panel">
          <div className="card" role="dialog" aria-label="Sign in to SecureMind">
            <div className="brand">
              <div className="glyph">S</div>
              <span>SecureMind Portal</span>
            </div>

            <div className="head">
              <h2>Sign in</h2>
              <div className="muted">Access your training and dashboard</div>
            </div>

            <form onSubmit={submit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" className="input" placeholder="you@company.com"
                  value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="username" required autoFocus />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="pw-wrap">
                  <input id="password" type={show ? "text" : "password"} className="input" placeholder="••••••••••"
                    value={pwd} onChange={(e)=>setPwd(e.target.value)} autoComplete="current-password" required aria-describedby="pw-help" />
                  <button type="button" className="toggle" onClick={()=>setShow(s=>!s)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
                </div>
                <div id="pw-help" className="muted" style={{marginTop:6}}>Use your company credentials.</div>
              </div>

              <div className="row-between">
                <label className="check">
                  <input type="checkbox" className="checkbox" checked={remember}
                    onChange={(e)=>setRemember(e.target.checked)} aria-label="Remember this device" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot" className="link">Forgot password?</Link>
              </div>

              {/* ERROR MOVED HERE (not at the top) */}
              {err && (
                <div className="alert" role="alert">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M11 7h2v6h-2V7zm0 8h2v2h-2v-2z" />
                  </svg>
                  <div>
                    <strong>Sign in failed</strong>
                    <div className="muted" style={{ marginTop: 4 }}>{err}</div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn" disabled={busy}>
                {busy ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M10 7l5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M3 12h12" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                    Sign In
                  </>
                )}
              </button>

              <div className="split" aria-hidden="true">
                <hr /><span>New to SecureMind?</span><hr />
              </div>

              <Link to="/register" className="outline">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M22 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                Create Account
              </Link>
            </form>

            <div style={{ textAlign: "center" }}>
              <button onClick={() => nav("/")} className="back-home">← Back to Home</button>
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}