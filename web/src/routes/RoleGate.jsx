// routes/RoleGate.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
const db = getFirestore();

export default function RoleGate({ role, children }) {
  const [ready, setReady] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const u = auth.currentUser;
      if (!u) { setReady(true); return; }
      let r = null;
      try {
        const s = await getDoc(doc(db, "users", u.uid));
        r = s.exists() ? String(s.data().role || "").toLowerCase() : null;
      } catch {}
      if (!alive) return;
      setUserRole(r);
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  if (!ready) return <div className="container py-5 text-center text-body-secondary">Checking access…</div>;
  if (!userRole) return <Navigate to="/dashboard/user" replace />;


  if (role !== "__any__" && userRole !== String(role).toLowerCase()) {
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }
  return children;
}
