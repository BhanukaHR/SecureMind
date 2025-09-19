// web/src/components/Topbar.jsx
import React from "react";
import ThemeToggle from "./ThemeToggle";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Link, NavLink } from "react-router-dom";

export default function Topbar() {
  return (
    <nav className="navbar navbar-expand-lg sticky-top border-bottom" style={{ backdropFilter: "blur(6px)" }}>
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/admin">🔐 SecureMind Admin</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navAdmin">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navAdmin">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item"><NavLink className="nav-link" to="/admin/users">Manage Users</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/admin/policies">Policies</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/admin/training">Training & Quizzes</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/admin/facts">Facts/Notifications</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/admin/reports">Reports</NavLink></li>
          </ul>
          <div className="d-flex gap-2 align-items-center">
            <ThemeToggle />
            <button 
              className="btn btn-danger d-flex align-items-center gap-1"
              onClick={() => signOut(auth)}
              style={{
                padding: '8px 16px',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z"/>
                <path d="M10.646 7.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L12.793 11H1.5a.5.5 0 0 1 0-1h11.293l-2.647-2.646a.5.5 0 0 1 0-.708z"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}