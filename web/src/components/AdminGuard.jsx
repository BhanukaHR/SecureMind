// web/src/components/AdminGuard.jsx
import React from "react";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { Navigate } from "react-router-dom";

export default function AdminGuard({ children }) {
  const [state, setState] = useState({ loading: true, ok: false });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return setState({ loading: false, ok: false });
      try {
        // prefer custom claims if you set them; fallback to users doc
        await u.getIdToken(true);
        const token = await u.getIdTokenResult();
        const claimRole = token.claims.role;
        if (claimRole === "admin") return setState({ loading: false, ok: true });

        const snap = await getDoc(doc(db, "users", u.uid));
        const role = snap.exists() ? snap.data().role : null;
        setState({ loading: false, ok: role === "Admin" || role === "admin" });
      } catch {
        setState({ loading: false, ok: false });
      }
    });
    return () => unsub();
  }, []);

  if (state.loading) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <div className="spinner-border" role="status" />
      </div>
    );
  }
  if (!state.ok) return <Navigate to="/" replace />;
  return children;
}
