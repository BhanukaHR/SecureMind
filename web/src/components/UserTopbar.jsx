// web/src/components/UserTopbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function UserTopbar() {
  return (
    <nav className="navbar navbar-expand-lg sticky-top border-bottom">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/training">🎓 Training</Link>
        <div className="d-flex gap-2 ms-auto">
          <ThemeToggle />
          <button className="btn btn-sm btn-outline-primary" onClick={()=>signOut(auth)}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
