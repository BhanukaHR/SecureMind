// web/src/components/ThemeToggle.jsx
import React from "react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mode, setMode] = useState(
    localStorage.getItem("theme") || (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light")
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", mode);
    localStorage.setItem("theme", mode);
  }, [mode]);

  return (
    <button
      className="btn btn-outline-secondary theme-toggle-btn"
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
    >
      <div className="theme-toggle-content">
        <span className="theme-icon">
          {mode === "dark" ? (
            <i className="bi bi-sun-fill"></i>
          ) : (
            <i className="bi bi-moon-fill"></i>
          )}
        </span>
        <span className="theme-text d-none d-sm-inline ms-2">
          {mode === "dark" ? "Light" : "Dark"}
        </span>
      </div>
      
      <style>{`
        .theme-toggle-btn {
          border-radius: 20px;
          padding: 8px 16px;
          transition: all 0.3s ease;
          border-width: 1.5px;
          position: relative;
          overflow: hidden;
        }
        
        .theme-toggle-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .theme-toggle-content {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .theme-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }
        
        .theme-toggle-btn:hover .theme-icon {
          transform: rotate(20deg);
        }
        
        .theme-text {
          font-weight: 500;
          font-size: 0.875rem;
        }
        
        [data-bs-theme="dark"] .theme-toggle-btn {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        [data-bs-theme="dark"] .theme-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }
                
        /* Global logout button styling */
        .btn-logout,
        .logout-btn,
        button[title*="Logout"],
        button[title*="logout"],
        a[href*="logout"],
        .btn:has(span:contains("Logout")) {
          background-color: #dc3545 !important;
          border-color: #dc3545 !important;
          color: white !important;
        }
        
        .btn-logout:hover,
        .logout-btn:hover,
        button[title*="Logout"]:hover,
        button[title*="logout"]:hover,
        a[href*="logout"]:hover {
          background-color: #c82333 !important;
          border-color: #bd2130 !important;
          color: white !important;
          transform: translateY(-1px);
        }
      `}</style>
    </button>
  );
}