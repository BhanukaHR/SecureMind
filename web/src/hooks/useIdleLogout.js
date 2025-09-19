// web/src/hooks/useIdleLogout.js
import { useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function useIdleLogout(minutes = 15) {
  const timer = useRef(null);
  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      signOut(auth).catch(() => {});
      // optional: show toast/alert here
    }, minutes * 60 * 1000);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []);
}
