import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase"; // Corrected path for dashboards folder
import { onAuthStateChanged } from "firebase/auth";
import useIdleLogout from "../../hooks/useIdleLogout"; // Import the idle logout hook

const Page = ({ title, children }) => (
  <section className="glass-card shadow-lg border-0 mb-4">
    <div className="card-header glass-header d-flex justify-content-between align-items-center py-3">
      <h5 className="mb-0 fw-bold text-gradient">{title}</h5>
    </div>
    <div className="card-body p-4">{children}</div>
  </section>
);

export default function AccountingDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Apply 30-minute idle logout
  useIdleLogout(30);

  // Auth state monitoring
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (!currentUser) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear any stored session data
      localStorage.removeItem('authUser');
      sessionStorage.clear();
      // Redirect to home page
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Show error notification (you could use a toast library here)
      alert('Error signing out. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container my-4 d-flex justify-content-center align-items-center" style={{minHeight: '50vh'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="container my-4" style={{maxWidth:1200}}>
      {/* Header with User Info and Logout Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="text-center flex-grow-1">
          <h1 className="display-4 fw-bold text-gradient mb-3">Welcome, Accounting Team</h1>
          <p className="lead text-body-secondary mb-4">Your role-specific security training and tools</p>
        </div>
        <div className="ms-3 d-flex flex-column align-items-end">
          {/* User info */}
          <div className="small text-muted mb-2">
            Signed in as: <span className="fw-semibold">{user.displayName || user.email?.split('@')[0] || 'User'}</span>
          </div>
          {/* Logout button */}
          <button 
            onClick={handleLogout}
            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-2"
            title="Sign out of your account"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Session timeout warning */}
      <div className="alert alert-info border-0 shadow-sm mb-4 d-flex align-items-center" role="alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="me-2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <div>
          <small className="fw-semibold">Session Info:</small>
          <small className="text-muted ms-2">Auto-logout after 30 minutes of inactivity</small>
        </div>
      </div>

      <Page title="Quick Links">
        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100 border-0 glass-card hover-lift">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <div className="icon-wrapper me-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                    </svg>
                  </div>
                  <div className="fw-bold">Invoice Fraud Detective</div>
                </div>
                <div className="text-body-secondary small mb-3">Spot doctored invoices and financial fraud attempts.</div>
                <Link to="/accounting/invoice-fraud" className="btn btn-outline-primary btn-sm">
                  Open Tool
                </Link>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100 border-0 glass-card hover-lift">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <div className="icon-wrapper me-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="fw-bold">Compliance Quizzes</div>
                </div>
                <div className="text-body-secondary small mb-3">Financial protocols and regulatory compliance training.</div>
                <Link to="/accounting/quizzes" className="btn btn-outline-primary btn-sm">
                  Start Quiz
                </Link>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100 border-0 glass-card hover-lift">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <div className="icon-wrapper me-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="fw-bold">Security Policies</div>
                </div>
                <div className="text-body-secondary small mb-3">Access latest financial security policies and updates.</div>
                <Link to="/policies" className="btn btn-outline-primary btn-sm">
                  View Policies
                </Link>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100 border-0 glass-card hover-lift">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <div className="icon-wrapper me-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                    </svg>
                  </div>
                  <div className="fw-bold">Training Progress</div>
                </div>
                <div className="text-body-secondary small mb-3">View your completed training modules and scores.</div>
                <Link to="/dashboard/progress" className="btn btn-outline-primary btn-sm">
                  View Progress
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Page>

      <style>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
        }
        
        .glass-header {
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .text-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .btn-outline-danger:hover {
          background-color: #dc3545;
          border-color: #dc3545;
          color: white;
        }
        
        .icon-wrapper {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .alert-info {
          background: rgba(13, 110, 253, 0.1);
          border: 1px solid rgba(13, 110, 253, 0.2);
          color: #0a58ca;
        }
        
        .card-body {
          transition: all 0.2s ease;
        }
        
        .hover-lift:hover .card-body {
          transform: scale(1.02);
        }
        
        @media (max-width: 768px) {
          .d-flex.justify-content-between {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          
          .ms-3 {
            margin-left: 0 !important;
            margin-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
}