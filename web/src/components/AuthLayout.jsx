import React from "react";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-vh-100 d-flex" style={{background:"linear-gradient(135deg,#0b1220,#0f172a 60%,#0b1220)"}}>
      <aside className="d-none d-lg-flex flex-column justify-content-between p-5" style={{width:"46%", color:"#e5e7eb"}}>
        <div>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-3"
               style={{background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.08)"}}>
            <span style={{fontSize:22}}>🛡️</span><strong>SecureMind</strong>
          </div>
          <h1 className="display-5 fw-bold mt-4 mb-2" style={{lineHeight:1.1}}>
            Security Awareness <span className="text-info">Portal</span>
          </h1>
          <p className="lead text-white-50 mb-4" style={{maxWidth:520}}>
            Role‑based training, announcements, and compliance tracking — all in one place.
          </p>
          <div className="row g-3" style={{maxWidth:520}}>
            {[
              ["🔒","MFA & SSO Ready"],
              ["📊","Compliance Reports"],
              ["🎯","Role‑specific modules"],
            ].map(([i,t])=>(
              <div className="col-12 col-sm-6" key={t}>
                <div className="d-flex align-items-center gap-2 small text-white-50">
                  <span style={{fontSize:18}}>{i}</span>{t}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-white-50 small">© {new Date().getFullYear()} SecureMind</div>
      </aside>

      <main className="d-flex align-items-center justify-content-center w-100 p-3 p-md-4">
        <div className="card border-0 shadow-lg rounded-4 w-100" style={{maxWidth:520}}>
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center"
                   style={{width:56,height:56,background:"rgba(13,110,253,.12)"}}>
                <span style={{fontSize:22}}>🔐</span>
              </div>
              <h2 className="h4 fw-bold mt-3 mb-1">{title}</h2>
              {subtitle && <p className="text-secondary mb-0">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
