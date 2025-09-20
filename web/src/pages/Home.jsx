// web/src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";


export default function Home() {
  const nav = useNavigate();
  const db = getFirestore();

  // Auth state management
  const [user, setUser] = useState(() => auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Policy state management
  const [policies, setPolicies] = useState([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");

  // Quiz attempts state management
  const [attempts, setAttempts] = useState([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState("");

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animations on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to policies for authenticated users
  useEffect(() => {
    setPolicies([]);
    setPolicyError("");
    
    if (!user) return;
    
    setPolicyLoading(true);
    const policiesQuery = query(
      collection(db, "policies"),
      orderBy("updatedAt", "desc"),
      limit(3)
    );

    const unsubscribe = onSnapshot(
      policiesQuery,
      (snapshot) => {
        setPolicies(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setPolicyLoading(false);
      },
      (error) => {
        console.error("Policy loading error:", error);
        setPolicyError("Failed to load recent policies. Please refresh to try again.");
        setPolicyLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, user]);

  // Subscribe to quiz attempts for authenticated users
  useEffect(() => {
    setAttempts([]);
    setAttemptsError("");
    
    if (!user) return;
    
    setAttemptsLoading(true);
    const attemptsQuery = query(
      collection(db, "quiz_attempts"),
      where("userId", "==", user.uid),
      orderBy("submittedAt", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      attemptsQuery,
      (snapshot) => {
        setAttempts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setAttemptsLoading(false);
      },
      (error) => {
        console.error("Attempts loading error:", error);
        setAttemptsError("Failed to load quiz progress. Please refresh to try again.");
        setAttemptsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, user]);

  // Calculate quiz statistics
  const quizStats = useMemo(() => {
    if (!attempts.length) return { totalAttempts: 0, averageScore: 0, lastAttempt: null };
    
    const validScores = attempts
      .map(attempt => typeof attempt.score === "number" ? attempt.score : null)
      .filter(score => score !== null);
    
    const averageScore = validScores.length > 0
      ? Math.round((validScores.reduce((sum, score) => sum + score, 0) / validScores.length) * 10) / 10
      : 0;
    
    return {
      totalAttempts: attempts.length,
      averageScore,
      lastAttempt: attempts[0] || null
    };
  }, [attempts]);

  // Format timestamp utility
  const formatTimestamp = (timestamp) => {
    if (!timestamp?.toDate) return "—";
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp.toDate());
  };

  return (
    <>
      <style>{`
        :root {
          --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --accent-color: #6366f1;
          --accent-light: #a5b4fc;
          --text-primary: #1f2937;
          --text-secondary: #6b7280;
          --surface-primary: #ffffff;
          --surface-secondary: #f8fafc;
          --border-light: #e5e7eb;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .hero-section {
          background: var(--primary-gradient);
          color: white;
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 2;
        }

        .brand-logo {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: var(--shadow-md);
        }

        .navbar-custom {
          backdrop-filter: blur(20px);
          background: rgba(15, 23, 42, 0.95) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-primary-custom {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          color: white;
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md);
        }

        .btn-primary-custom:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-xl);
          background: linear-gradient(135deg, #5856eb, #7c3aed);
          color: white;
        }

        .btn-outline-custom {
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          font-weight: 600;
          padding: 0.75rem 2rem;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-outline-custom:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          color: white;
          transform: translateY(-1px);
        }

        .widget-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: var(--shadow-xl);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .widget-container:hover {
          transform: translateY(-5px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .feature-card {
          background: var(--surface-primary);
          border-radius: 16px;
          border: 1px solid var(--border-light);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 100%;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
          border-color: var(--accent-light);
        }

        .icon-wrapper {
          background: linear-gradient(135deg, var(--accent-color), var(--accent-light));
          color: white;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin: 0 auto 1.5rem;
          box-shadow: var(--shadow-md);
        }

        .stats-card {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          transition: all 0.3s ease;
          height: 100%;
        }

        .stats-card:hover {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .policy-item {
          background: var(--surface-secondary);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          transition: all 0.3s ease;
          margin-bottom: 0.75rem;
        }

        .policy-item:hover {
          background: #f0f4ff;
          border-color: var(--accent-light);
          transform: translateX(4px);
        }

        .fade-in-up {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .fade-in-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .loading-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading-shimmer 1.5s infinite;
          border-radius: 8px;
        }

        @keyframes loading-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .hero-wave {
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 100%;
          height: 100px;
          z-index: 1;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 50px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .clickable {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clickable:hover {
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .hero-section {
            min-height: auto;
            padding: 6rem 0 4rem;
          }
          
          .display-4 {
            font-size: 2.5rem;
          }
          
          .widget-container {
            margin-top: 3rem;
          }
        }

        @media (max-width: 576px) {
          .btn-primary-custom,
          .btn-outline-custom {
            width: 100%;
            margin-bottom: 0.75rem;
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom fixed-top">
        <div className="container">
          <div 
            className="navbar-brand fw-bold clickable d-flex align-items-center" 
            onClick={() => nav("/")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && nav("/")}
            aria-label="SecureMind Home"
          >
            <div className="brand-logo me-3">S</div>
            <span style={{ fontSize: '1.5rem' }}>
              Secure<span style={{ color: '#a5b4fc' }}>Mind</span>
            </span>
          </div>
          
          <div className="ms-auto d-flex align-items-center gap-3">
            {authLoading ? (
              <div className="loading-skeleton" style={{ width: '100px', height: '40px' }}></div>
            ) : user ? (
              <>
                <span className="text-light small d-none d-md-inline">
                  Welcome, <span className="fw-semibold text-white">
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </span>
                </span>
                <button 
                  className="btn btn-outline-custom" 
                  onClick={() => nav("/dashboard")}
                  aria-label="Go to Dashboard"
                >
                  Dashboard
                </button>
              </>
            ) : (
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-custom" 
                  onClick={() => nav("/login")}
                  aria-label="Sign In"
                >
                  Sign In
                </button>
                <button 
                  className="btn btn-primary-custom" 
                  onClick={() => nav("/register")}
                  aria-label="Get Started"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section" style={{ paddingTop: '80px' }}>
        <div className="container hero-content">
          <div className="row align-items-center">
            <div className={`col-lg-6 text-center text-lg-start fade-in-up ${isVisible ? 'visible' : ''}`}>
              <div className="mb-4">
                <div className="badge text-dark mb-3 px-4 py-2 fs-6" 
                     style={{ 
                       background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                       borderRadius: '50px',
                       fontWeight: '600'
                     }}>
                  🚀 Advanced Security Training Platform
                </div>
              </div>
              
              <h1 className="display-4 fw-bold mb-4 lh-1">
                Transform Your Team's<br />
                <span style={{ color: '#a5b4fc' }}>Security Awareness</span>
              </h1>
              
              <p className="lead mb-5" style={{ fontSize: '1.25rem', lineHeight: '1.7', opacity: '0.9' }}>
                Empower your organization with comprehensive security training through interactive learning experiences, 
                personalized dashboards, and real-time progress tracking.
              </p>

              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
                <button
                  className="btn btn-primary-custom btn-lg"
                  onClick={() => nav(user ? "/dashboard" : "/register")}
                  style={{ minWidth: '200px' }}
                  aria-label={user ? "Access Dashboard" : "Get Started"}
                >
                  {user ? "Access Dashboard" : "Get Started"}
                </button>
                
                {!user && (
                  <button
                    className="btn btn-outline-custom btn-lg"
                    onClick={() => nav("/login")}
                    style={{ minWidth: '160px' }}
                    aria-label="Sign In"
                  >
                    Sign In
                  </button>
                )}
              </div>
              
              <div className="mt-4 d-flex align-items-center justify-content-center justify-content-lg-start gap-4 text-white-50">
                <div className="d-flex align-items-center">
                  <span className="me-2 text-success">✓</span>
                  <small>Role-based training</small>
                </div>
                <div className="d-flex align-items-center">
                  <span className="me-2 text-success">✓</span>
                  <small>Interactive learning</small>
                </div>
                <div className="d-flex align-items-center">
                  <span className="me-2 text-success">✓</span>
                  <small>Real-time analytics</small>
                </div>
              </div>
            </div>

            {/* Dashboard Preview Widget */}
            <div className={`col-lg-6 mt-5 mt-lg-0 fade-in-up ${isVisible ? 'visible' : ''}`} 
                 style={{ transitionDelay: '0.2s' }}>
              <div className="widget-container p-4">
                {/* Policy Updates Section */}
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-3">
                    <div className="icon-wrapper me-3" style={{ width: '48px', height: '48px' }}>
                      📋
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="mb-1 text-dark fw-bold">Policy Updates</h5>
                      <small className="text-muted">Latest organizational policies</small>
                    </div>
                    {user && !policyLoading && policies.length > 0 && (
                      <span className="badge bg-success rounded-pill" aria-label={`${policies.length} recent updates`}>
                        {policies.length}
                      </span>
                    )}
                  </div>

                  {!user && !authLoading && (
                    <div className="stats-card p-4 text-center">
                      <div className="mb-3">
                        <h6 className="fw-bold text-dark mb-2">Stay Informed</h6>
                        <p className="small text-muted mb-0">
                          Access your organization's latest policy updates and compliance requirements.
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary-custom btn-sm" 
                        onClick={() => nav("/login")}
                        aria-label="Sign in to view policies"
                      >
                        View Policies
                      </button>
                    </div>
                  )}

                  {user && policyLoading && (
                    <div className="p-3">
                      <div className="loading-skeleton mb-2" style={{ height: '20px' }}></div>
                      <div className="loading-skeleton mb-2" style={{ height: '16px', width: '80%' }}></div>
                      <div className="loading-skeleton" style={{ height: '16px', width: '60%' }}></div>
                    </div>
                  )}

                  {user && !policyLoading && policyError && (
                    <div className="alert alert-warning border-0 py-3 d-flex align-items-center" role="alert">
                      <span className="me-2">⚠️</span>
                      <div>
                        <strong>Loading Error</strong>
                        <div className="small mt-1">{policyError}</div>
                      </div>
                    </div>
                  )}

                  {user && !policyLoading && !policyError && (
                    <div>
                      {policies.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                          <div className="mb-2">📄</div>
                          <div className="fw-semibold">No policies available</div>
                          <small>New policy updates will appear here</small>
                        </div>
                      ) : (
                        <div className="d-grid gap-2">
                          {policies.map((policy) => (
                            <div key={policy.id} className="policy-item p-3">
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <div className="fw-semibold text-dark mb-1">
                                    {policy.title || "Untitled Policy"}
                                  </div>
                                  <small className="text-muted">
                                    Updated {formatTimestamp(policy.updatedAt)}
                                  </small>
                                </div>
                                <span
                                  className={`status-badge ${
                                    (policy.status || "active") === "active" 
                                      ? "bg-success text-white" 
                                      : "bg-secondary text-white"
                                  }`}
                                  aria-label={`Status: ${policy.status || "active"}`}
                                >
                                  {policy.status || "active"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <hr className="my-4" />

                {/* Quiz Progress Section */}
                <div>
                  <div className="d-flex align-items-center mb-3">
                    <div className="icon-wrapper me-3" style={{ width: '48px', height: '48px' }}>
                      🎯
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="mb-1 text-dark fw-bold">Learning Progress</h5>
                      <small className="text-muted">Your training achievements</small>
                    </div>
                  </div>

                  {!user && !authLoading && (
                    <div className="stats-card p-4 text-center">
                      <div className="mb-3">
                        <h6 className="fw-bold text-dark mb-2">Track Progress</h6>
                        <p className="small text-muted mb-0">
                          Monitor your learning journey with detailed analytics and performance insights.
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary-custom btn-sm" 
                        onClick={() => nav("/login")}
                        aria-label="Sign in to view progress"
                      >
                        View Progress
                      </button>
                    </div>
                  )}

                  {user && attemptsLoading && (
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="loading-skeleton" style={{ height: '80px' }}></div>
                      </div>
                      <div className="col-6">
                        <div className="loading-skeleton" style={{ height: '80px' }}></div>
                      </div>
                    </div>
                  )}

                  {user && !attemptsLoading && attemptsError && (
                    <div className="alert alert-warning border-0 py-3 d-flex align-items-center" role="alert">
                      <span className="me-2">⚠️</span>
                      <div>
                        <strong>Loading Error</strong>
                        <div className="small mt-1">{attemptsError}</div>
                      </div>
                    </div>
                  )}

                  {user && !attemptsLoading && !attemptsError && (
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="stats-card p-3 text-center">
                          <div className="text-primary mb-2" style={{ fontSize: '1.5rem' }}>🎮</div>
                          <div className="h4 mb-1 text-dark fw-bold">{quizStats.totalAttempts}</div>
                          <small className="text-muted fw-medium">Completed</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="stats-card p-3 text-center">
                          <div className="text-warning mb-2" style={{ fontSize: '1.5rem' }}>⭐</div>
                          <div className="h4 mb-1 text-dark fw-bold">{quizStats.averageScore}%</div>
                          <small className="text-muted fw-medium">Avg Score</small>
                        </div>
                      </div>
                      
                      {quizStats.lastAttempt && (
                        <div className="col-12">
                          <div className="stats-card p-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="flex-grow-1">
                                <div className="fw-semibold text-dark mb-1">
                                  Recent: {quizStats.lastAttempt.quizId || "Training Module"}
                                </div>
                                <small className="text-muted">
                                  {formatTimestamp(quizStats.lastAttempt.submittedAt)}
                                </small>
                              </div>
                              <div className="text-end">
                                <div className="badge bg-primary fs-6 mb-1">
                                  {typeof quizStats.lastAttempt.score === "number"
                                    ? `${quizStats.lastAttempt.score}%`
                                    : "—"}
                                </div>
                                <div className="small text-muted">Score</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {quizStats.totalAttempts === 0 && (
                        <div className="col-12">
                          <div className="text-center py-4 text-muted">
                            <div className="mb-2" style={{ fontSize: '2rem' }}>🚀</div>
                            <div className="fw-semibold">Ready to start learning?</div>
                            <small>Complete your first training module to see progress here</small>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <svg 
          className="hero-wave" 
          viewBox="0 0 1440 100" 
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            fill="#ffffff"
            d="M0,32L80,37.3C160,43,320,53,480,64C640,75,800,85,960,80C1120,75,1280,53,1360,42.7L1440,32L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"
          />
        </svg>
      </section>

      {/* Features Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className={`text-center mb-5 fade-in-up ${isVisible ? 'visible' : ''}`}>
            <h2 className="display-5 fw-bold mb-3 text-dark">Comprehensive Security Training</h2>
            <p className="lead text-muted mb-0 mx-auto" style={{ maxWidth: '600px' }}>
              Designed for modern organizations with role-specific content and measurable outcomes
            </p>
          </div>

          <div className={`row g-4 fade-in-up ${isVisible ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
            {[
              {
                icon: "👥",
                title: "Role-Based Learning",
                description: "Tailored training paths for different teams - Admin, Security, Marketing, Development, and Design roles with relevant content."
              },
              {
                icon: "🎮",
                title: "Interactive Training",
                description: "Engaging mini-games, interactive scenarios, and knowledge assessments that make security concepts memorable and actionable."
              },
              {
                icon: "📚",
                title: "Policy Management",
                description: "Centralized policy distribution with automated notifications, acknowledgment tracking, and compliance monitoring."
              },
              {
                icon: "📊",
                title: "Advanced Analytics",
                description: "Comprehensive reporting with completion rates, performance metrics, and detailed insights to measure training effectiveness."
              }
            ].map((feature, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <div className="feature-card card border-0 shadow-sm h-100">
                  <div className="card-body text-center p-4">
                    <div className="icon-wrapper">
                      {feature.icon}
                    </div>
                    <h5 className="card-title mb-3 text-dark fw-bold">{feature.title}</h5>
                    <p className="card-text text-muted">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compact Footer */}
      <footer className="bg-dark text-light py-4">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 mb-3 mb-md-0">
              <div className="d-flex align-items-center">
                <div className="brand-logo me-3" style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}>S</div>
                <span className="h6 mb-0">
                  Secure<span style={{ color: '#a5b4fc' }}>Mind</span>
                </span>
                <span className="text-muted small ms-3">
                  © {new Date().getFullYear()} All rights reserved.
                </span>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="d-flex justify-content-md-end align-items-center gap-4 flex-wrap">
                <div className="d-flex gap-4">
                  <span role="button" className="text-white clickable small">Privacy</span>
                  <span role="button" className="text-white clickable small">Terms</span>
                  <span role="button" className="text-white clickable small">Support</span>
                  <span role="button" className="text-white clickable small">Contact</span>
                </div>
                
                <div className="d-flex gap-3 ms-3">
                  <span role="button" className="text-muted clickable" aria-label="Twitter" title="Follow us">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </span>
                  <span role="button" className="text-muted clickable" aria-label="LinkedIn" title="Connect with us">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </span>
                  <span role="button" className="text-muted clickable" aria-label="GitHub" title="View source">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}