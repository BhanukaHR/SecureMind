// web/src/data/quizzes.js
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../firebase";
import { auth } from "../firebase";

export async function loadQuizzesForMyRole() {
  const db = getFirestore(app);
  const token = await auth.currentUser.getIdTokenResult(true);
  const role = token.claims.role || "user";

  const q = query(
    collection(db, "quizzes"),
    where("roles", "array-contains", role)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
