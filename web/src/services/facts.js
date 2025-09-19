// web/src/services/facts.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase"; // your initialized app

export async function sendFactBroadcast({ factId, title, message, targetType, roles, userIds }) {
  const fn = httpsCallable(getFunctions(app), "broadcastFactNotification");
  const res = await fn({ factId, title, message, targetType, roles, userIds });
  return res.data; // { count }
}
