import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";

export default function ProtectedRoute({ children }) {
  const loc = useLocation();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    return auth.onAuthStateChanged(u => { setUser(u); setReady(true); });
  }, []);

  if (!ready) {
    return <div className="container py-5 text-center text-body-secondary">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return children;
}
