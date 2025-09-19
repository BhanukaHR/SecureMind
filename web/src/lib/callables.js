// web/src/lib/callables.js
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const app = getApp();
const functions = getFunctions(app, "us-central1");

// Example: Broadcast a fact (ADMIN only)
export async function broadcastFact({ factId, title, message, targetType, roles, userIds }) {
  const fn = httpsCallable(functions, "broadcastFactNotification");
  const res = await fn({ factId, title, message, targetType, roles, userIds });
  return res.data; // { count }
}
