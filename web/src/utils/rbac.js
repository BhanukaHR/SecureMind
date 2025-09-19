import { auth } from "../firebase";

export async function requireRole(role) {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdTokenResult(true);
  return token.claims?.role === role;
}

export async function getRoleClaim() {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdTokenResult();
  return token.claims?.role || null;
}
