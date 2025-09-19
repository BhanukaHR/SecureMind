// web/src/pages/admin/Reports.jsx
import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getFirestore, collection, getCountFromServer, query, where
} from "firebase/firestore";
import Topbar from "../../components/Topbar";

export default function Reports() {
  const db = useMemo(()=>getFirestore(),[]);
  const [counts, setCounts] = useState({ users: 0, policies: 0, facts: 0, trainings: 0, quizzes: 0 });
  const [err, setErr] = useState("");

  useEffect(()=>{
    (async()=>{
      try {
        const [u,p,f,t,q] = await Promise.all([
          getCountFromServer(collection(db,"users")),
          getCountFromServer(collection(db,"policies")),
          getCountFromServer(collection(db,"facts")),
          getCountFromServer(collection(db,"trainings")).catch(()=>null),
          getCountFromServer(collection(db,"quizzes")),
        ]);
        setCounts({
          users: u.data().count, policies: p.data().count, facts: f.data().count,
          trainings: t?.data().count || 0, quizzes: q.data().count
        });
      } catch (e) { setErr(e.message); }
    })();
  }, [db]);

  const exportCSV = () => {
    const rows = [
      ["Metric","Value"],
      ["Total Users", counts.users],
      ["Total Policies", counts.policies],
      ["Total Facts", counts.facts],
      ["Total Trainings", counts.trainings],
      ["Total Quizzes", counts.quizzes],
    ];
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href:url, download:"compliance_report.csv" });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <Topbar />
      <div className="container py-4" style={{maxWidth: 900}}>
        <div className="reports-header mb-4">
          <h3 className="fw-bold mb-0 reports-title">
            <i className="bi bi-graph-up-arrow me-2"></i>
            Compliance & Reporting
          </h3>
          <p className="text-muted mb-0 mt-1">Monitor system metrics and generate reports</p>
        </div>

        {err && (
          <div className="alert alert-danger alert-enhanced" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {err}
          </div>
        )}

        <div className="row g-4 mb-4">
          {[
            ["Total Users", counts.users, "people-fill", "primary"],
            ["Policies", counts.policies, "shield-check", "success"],
            ["Facts", counts.facts, "lightbulb-fill", "warning"],
            ["Trainings", counts.trainings, "mortarboard-fill", "info"],
            ["Quizzes", counts.quizzes, "puzzle-fill", "danger"],
          ].map(([label,val,icon,color])=>(
            <div className="col-6 col-lg-4" key={label}>
              <div className="card reports-card border-0">
                <div className="card-body reports-card-body">
                  <div className={`reports-icon reports-icon-${color}`}>
                    <i className={`bi bi-${icon}`}></i>
                  </div>
                  <div className="reports-content">
                    <div className="reports-label">{label}</div>
                    <div className="reports-value">{val.toLocaleString()}</div>
                  </div>
                  <div className={`reports-accent reports-accent-${color}`}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="reports-actions">
          <div className="card border-0 reports-card">
            <div className="card-header reports-actions-header">
              <h5 className="mb-0 fw-semibold">
                <i className="bi bi-download me-2"></i>
                Export Options
              </h5>
            </div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-3">
                <button className="btn btn-outline-secondary btn-enhanced btn-export" onClick={exportCSV}>
                  <i className="bi bi-filetype-csv me-2"></i>
                  Export CSV
                </button>
                <button className="btn btn-outline-dark btn-enhanced btn-print" onClick={()=>window.print()}>
                  <i className="bi bi-printer me-2"></i>
                  Print / Save PDF
                </button>
              </div>
              <div className="reports-export-info mt-3">
                <i className="bi bi-info-circle me-2"></i>
                <span>Data reflects real-time counts from your Firebase collections</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bootstrap Icons CDN */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css" 
      />

      <style>{`
        /* Reports Page Enhanced Styles */
        .reports-header {
          padding: 1.5rem 0;
          border-bottom: 2px solid rgba(var(--bs-primary-rgb), 0.1);
          margin-bottom: 2rem !important;
        }

        .reports-title {
          color: var(--bs-primary);
          font-size: 2rem;
          font-weight: 700;
          text-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .reports-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }

        .reports-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
        }

        .reports-card-body {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }

        .reports-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          position: relative;
          z-index: 2;
        }

        .reports-icon-primary {
          background: linear-gradient(135deg, var(--bs-primary), #0056b3);
        }

        .reports-icon-success {
          background: linear-gradient(135deg, var(--bs-success), #198754);
        }

        .reports-icon-warning {
          background: linear-gradient(135deg, var(--bs-warning), #fd7e14);
        }

        .reports-icon-info {
          background: linear-gradient(135deg, var(--bs-info), #0dcaf0);
        }

        .reports-icon-danger {
          background: linear-gradient(135deg, var(--bs-danger), #dc3545);
        }

        .reports-content {
          flex: 1;
          z-index: 2;
          position: relative;
        }

        .reports-label {
          font-size: 0.875rem;
          color: var(--bs-secondary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.25rem;
        }

        .reports-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--bs-dark);
          line-height: 1;
        }

        .reports-accent {
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          border-radius: 0 16px 16px 0;
        }

        .reports-accent-primary {
          background: linear-gradient(180deg, var(--bs-primary), transparent);
        }

        .reports-accent-success {
          background: linear-gradient(180deg, var(--bs-success), transparent);
        }

        .reports-accent-warning {
          background: linear-gradient(180deg, var(--bs-warning), transparent);
        }

        .reports-accent-info {
          background: linear-gradient(180deg, var(--bs-info), transparent);
        }

        .reports-accent-danger {
          background: linear-gradient(180deg, var(--bs-danger), transparent);
        }

        .reports-actions {
          margin-top: 2rem;
        }

        .reports-actions-header {
          background: linear-gradient(135deg, var(--bs-dark), #495057);
          color: white;
          border: none !important;
          padding: 1.25rem 1.5rem;
          font-weight: 600;
        }

        .reports-actions-header h5 {
          margin: 0;
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

        .btn-export:hover {
          background-color: var(--bs-secondary);
          color: white !important;
          border-color: var(--bs-secondary) !important;
        }

        .btn-print:hover {
          background-color: var(--bs-dark);
          color: white !important;
          border-color: var(--bs-dark) !important;
        }

        .reports-export-info {
          background: rgba(var(--bs-info-rgb), 0.1);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          border-left: 4px solid var(--bs-info);
          font-size: 0.875rem;
          color: var(--bs-secondary);
          display: flex;
          align-items: center;
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
        [data-bs-theme="dark"] .reports-title {
          color: white;
        }

        [data-bs-theme="dark"] .reports-card {
          background: rgba(33, 37, 41, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        [data-bs-theme="dark"] .reports-label {
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .reports-value {
          color: var(--bs-light);
        }

        [data-bs-theme="dark"] .reports-export-info {
          background: rgba(var(--bs-info-rgb), 0.15);
        }

        /* Print styles */
        @media print {
          .reports-header,
          .reports-card,
          .alert-enhanced {
            break-inside: avoid;
          }
          
          .reports-actions {
            display: none;
          }
          
          .reports-card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .reports-title {
            font-size: 1.5rem;
          }
          
          .reports-card-body {
            padding: 1rem;
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }
          
          .reports-icon {
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
          }
          
          .reports-value {
            font-size: 1.75rem;
          }
          
          .reports-accent {
            width: 100%;
            height: 4px;
            top: auto;
            bottom: 0;
            border-radius: 0 0 16px 16px;
          }

          .btn-enhanced {
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
          }
        }

        /* Remove hover animations */

        /* Loading state animation */
        @keyframes pulse-value {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .reports-value:empty::after {
          content: "—";
          animation: pulse-value 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}