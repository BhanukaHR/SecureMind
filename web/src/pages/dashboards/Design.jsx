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

export default function DesignDashboard() {{
  return (
    <div className="container my-4" style={{maxWidth:1200}}>
      <div className="text-center mb-5">
        <h1 className="display-4 fw-bold text-gradient mb-3">Welcome, Design Team</h1>
        <p className="lead text-body-secondary mb-4">Your role-specific security training and tools</p>
      </div>
      <Page title="Quick Links">
        <div className="row g-3">

        <div className="col-12 col-md-6 col-lg-4">
          <div className="card h-100 border-0 glass-card hover-lift">
            <div className="card-body">
              <div className="fw-bold mb-1">IP Protection</div>
              <div className="text-body-secondary small mb-3">Licensing & safe publishing.</div>
              <Link to="/design/ip-protection" className="btn btn-outline-primary btn-sm">Open</Link>
            </div>
          </div>
        </div>
        \n
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card h-100 border-0 glass-card hover-lift">
            <div className="card-body">
              <div className="fw-bold mb-1">Creative Security Quiz</div>
              <div className="text-body-secondary small mb-3">Test your knowledge.</div>
              <Link to="/design/quizzes" className="btn btn-outline-primary btn-sm">Open</Link>
            </div>
          </div>
        </div>

        </div>
      </Page>
    </div>
  );
}}
