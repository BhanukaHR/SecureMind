import React from "react";

export default function UserDashboard() {
  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-2">Welcome</h2>
      <p className="text-body-secondary mb-4">
        Your account is active but no role was found yet. If you just registered, your role will appear after the server finishes setup.
      </p>
      <ul className="list-group">
        <li className="list-group-item">Training modules</li>
        <li className="list-group-item">Announcements</li>
      </ul>
    </div>
  );
}
