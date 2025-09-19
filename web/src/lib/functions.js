// web/src/lib/functions.js
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { app } from "../firebase"; // your initialized firebase app

const functions = getFunctions(app, "us-central1");

// Optional: when running local emulator
// if (import.meta.env.VITE_USE_EMU === "1") {
//   connectFunctionsEmulator(functions, "localhost", 5001);
// }

export const fn = {
  adminCreateUser: httpsCallable(functions, "adminCreateUser"),
  adminUpdateUser: httpsCallable(functions, "adminUpdateUser"),
  adminDeleteUser: httpsCallable(functions, "adminDeleteUser"),
  setRole:          httpsCallable(functions, "setRole"),
  broadcastFactNotification:    httpsCallable(functions, "broadcastFactNotification"),
  broadcastPolicyNotification:  httpsCallable(functions, "broadcastPolicyNotification"),
  completeRegistration:         httpsCallable(functions, "completeRegistration"),
  setUserRole:                  httpsCallable(functions, "setUserRole"),
};
