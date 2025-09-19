import React from "react";
import { Link } from "react-router-dom";

const Page = ({ title, children }) => (
  <section className="glass-card shadow-lg border-0 mb-4">
    <div className="card-header glass-header d-flex justify-content-between align-items-center py-3">
      <h5 className="mb-0 fw-bold text-gradient">{title}</h5>
    </div>
    <div className="card-body p-4">{children}</div>
  </section>
);

export default function SecurityDashboard() {{
  return (
    <div className="container my-4" style={{maxWidth:1200}}>
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-gradient mb-3">Welcome, Security Team</h1>
        <p className="lead text-body-secondary mb-4">Your role-specific security training and tools</p>
      </div>
      <Page title="Quick Links">
        <div className="row g-3">

        <div className="col-12 col-md-6 col-lg-4">
          <div className="card h-100 border-0 glass-card hover-lift">
            <div className="card-body">
              <div className="fw-bold mb-1">Incident Simulations</div>
              <div className="text-body-secondary small mb-3">IR scenarios and drills.</div>
              <Link to="/security/incidents" className="btn btn-outline-primary btn-sm">Open</Link>
            </div>
          </div>
        </div>
        \n
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card h-100 border-0 glass-card hover-lift">
            <div className="card-body">
              <div className="fw-bold mb-1">Phishing Game</div>
              <div className="text-body-secondary small mb-3">Identify malicious emails.</div>
              <Link to="/security/phishing" className="btn btn-outline-primary btn-sm">Open</Link>
            </div>
          </div>
        </div>
        \n
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card h-100 border-0 glass-card hover-lift">
            <div className="card-body">
              <div className="fw-bold mb-1">Quizzes</div>
              <div className="text-body-secondary small mb-3">Security knowledge checks.</div>
              <Link to="/security/quizzes" className="btn btn-outline-primary btn-sm">Open</Link>
            </div>
          </div>
        </div>

        </div>
      </Page>
    </div>
  );
}}
