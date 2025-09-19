/* functions/index.js */
/* eslint-disable no-console */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: [
    "http://localhost:5173",
    "https://mind-76cce.web.app",
    "https://mind-76cce.firebaseapp.com",
  ],
  credentials: true,
});

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/** ---------- Helpers ---------- **/
const ALLOWED_ROLES = ["admin", "trainer", "security", "accounting", "marketing", "developer", "design", "user"];

function normalizeRole(role, fallback = "user") {
  const r = String(role || "").toLowerCase();
  return ALLOWED_ROLES.includes(r) ? r : fallback;
}

function assertRole(context, role) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required");
  }
  const tokenRole = context.auth.token?.role;
  if (tokenRole !== role) {
    throw new functions.https.HttpsError("permission-denied", "Insufficient role");
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function batchWrite(docs) {
  const CHUNK = 500;
  for (const group of chunk(docs, CHUNK)) {
    const batch = db.batch();
    for (const { ref, data } of group) batch.set(ref, data);
    await batch.commit();
  }
}

async function getUserIdsByRoles(roles) {
  const roleList = (roles || []).map((r) => String(r).toLowerCase()).filter(Boolean);
  if (roleList.length === 0) return [];
  const groups = chunk(roleList, 10); // Firestore "in" max
  const results = await Promise.all(
    groups.map((g) => db.collection("users").where("role", "in", g).get())
  );
  const ids = new Set();
  results.forEach((snap) => snap.forEach((d) => ids.add(d.id)));
  return Array.from(ids);
}

/** ---------- Auth trigger: set default role + user doc ---------- **/
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const pre = await db.collection("preapprovals").doc(user.uid).get();
  const role = normalizeRole(pre.exists ? pre.data()?.role : null, "user");

  await admin.auth().setCustomUserClaims(user.uid, { role });

  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email || null,
      firstName: null,
      lastName: null,
      role,
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
});

/** ---------- Admin: users ---------- **/
// Original onCall version (for Firebase SDK calls)
exports.adminCreateUser = functions.https.onCall(async (data, context) => {
  assertRole(context, "admin");
  const email = String(data?.email || "").trim().toLowerCase();
  if (!email) throw new functions.https.HttpsError("invalid-argument", "email required");
  const desiredRole = normalizeRole(data?.role, "user");
  const tempPassword = String(data?.tempPassword || "");
  const password = tempPassword || (Math.random().toString(36).slice(-12) + "A1!");
  const user = await admin.auth().createUser({ email, password, disabled: false });
  await admin.auth().setCustomUserClaims(user.uid, { role: desiredRole });

  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email,
      role: desiredRole,
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return { uid: user.uid, role: desiredRole };
});

// NEW: HTTP version with CORS (for fetch() calls)
exports.adminCreateUserHttp = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    
    try {
      // Verify authentication
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: "Missing authorization token" });

      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get request data
      const { email, password, firstName, lastName, employeeId, role } = req.body || {};

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !employeeId || !role) {
        return res.status(400).json({ error: "Missing required fields: email, password, firstName, lastName, employeeId, role" });
      }

      // Validate role
      const normalizedRole = normalizeRole(role, "user");
      if (!ALLOWED_ROLES.includes(normalizedRole)) {
        return res.status(400).json({ error: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(", ")}` });
      }

      // Check if employee ID exists
      const employeeDoc = await db.collection("employees").doc(employeeId).get();
      if (!employeeDoc.exists()) {
        return res.status(400).json({ error: "Employee ID not found" });
      }

      // Verify the role matches the employee record
      const employeeRole = normalizeRole(employeeDoc.data()?.role);
      if (employeeRole !== normalizedRole) {
        return res.status(400).json({ 
          error: `Role mismatch. Employee record shows role: ${employeeRole}, but requested: ${normalizedRole}` 
        });
      }

      // Create the user account
      const userRecord = await admin.auth().createUser({
        email: email.trim().toLowerCase(),
        password: password,
        displayName: `${firstName} ${lastName}`.trim(),
        emailVerified: false,
        disabled: false
      });

      // Set custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, { 
        role: normalizedRole,
        [normalizedRole]: true // e.g., admin: true, trainer: true, etc.
      });

      // Create user document in Firestore
      await db.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        employeeId: employeeId,
        role: normalizedRole,
        disabled: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: decoded.uid
      });

      // Link employee record to user
      await employeeDoc.ref.update({
        uid: userRecord.uid,
        linkedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({ 
        success: true, 
        uid: userRecord.uid,
        role: normalizedRole,
        message: "User created successfully" 
      });

    } catch (error) {
      console.error("Error creating user:", error);
      
      // Handle specific Firebase Auth errors
      if (error.code === "auth/email-already-exists") {
        return res.status(400).json({ error: "Email already exists" });
      }
      if (error.code === "auth/invalid-email") {
        return res.status(400).json({ error: "Invalid email format" });
      }
      if (error.code === "auth/weak-password") {
        return res.status(400).json({ error: "Password is too weak" });
      }
      
      res.status(500).json({ 
        error: "Internal server error",
        details: error.message 
      });
    }
  });
});

// Original onCall version (keep for Firebase SDK compatibility)
exports.adminUpdateUser = functions.https.onCall(async (data, context) => {
  assertRole(context, "admin");
  const uid = String(data?.uid || "");
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid required");

  const updates = {};
  if (typeof data?.disabled === "boolean") {
    await admin.auth().updateUser(uid, { disabled: data.disabled });
    updates.disabled = data.disabled;
  }
  if (data?.role) {
    const newRole = normalizeRole(data.role);
    await admin.auth().setCustomUserClaims(uid, { role: newRole });
    updates.role = newRole;
  }
  if (Object.keys(updates).length) {
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("users").doc(uid).set(updates, { merge: true });
  }
  return { ok: true };
});

// NEW: HTTP version with CORS (for fetch() calls)
exports.adminUpdateUserHttp = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "PUT" && req.method !== "PATCH") {
      return res.status(405).json({ error: "Method not allowed. Use PUT or PATCH." });
    }
    
    try {
      // Verify authentication
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: "Missing authorization token" });

      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get request data
      const { uid, disabled, role, firstName, lastName, email } = req.body || {};

      // Validate required fields
      if (!uid) {
        return res.status(400).json({ error: "uid is required" });
      }

      // Prepare updates
      const authUpdates = {};
      const firestoreUpdates = {};
      
      // Handle disabled status
      if (typeof disabled === "boolean") {
        authUpdates.disabled = disabled;
        firestoreUpdates.disabled = disabled;
      }

      // Handle role update
      if (role) {
        const normalizedRole = normalizeRole(role);
        if (!ALLOWED_ROLES.includes(normalizedRole)) {
          return res.status(400).json({ 
            error: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(", ")}` 
          });
        }
        
        // Update custom claims
        await admin.auth().setCustomUserClaims(uid, { 
          role: normalizedRole,
          [normalizedRole]: true 
        });
        firestoreUpdates.role = normalizedRole;
      }

      // Handle profile updates
      if (firstName) firestoreUpdates.firstName = firstName.trim();
      if (lastName) firestoreUpdates.lastName = lastName.trim();
      if (email) {
        authUpdates.email = email.trim().toLowerCase();
        firestoreUpdates.email = email.trim().toLowerCase();
      }

      // Update display name if we have first/last name
      if (firstName || lastName) {
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data() || {};
        const newFirstName = firstName || userData.firstName || "";
        const newLastName = lastName || userData.lastName || "";
        if (newFirstName || newLastName) {
          authUpdates.displayName = `${newFirstName} ${newLastName}`.trim();
        }
      }

      // Apply Firebase Auth updates
      if (Object.keys(authUpdates).length > 0) {
        await admin.auth().updateUser(uid, authUpdates);
      }

      // Apply Firestore updates
      if (Object.keys(firestoreUpdates).length > 0) {
        firestoreUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        firestoreUpdates.updatedBy = decoded.uid;
        await db.collection("users").doc(uid).set(firestoreUpdates, { merge: true });
      }

      res.status(200).json({ 
        success: true,
        message: "User updated successfully",
        updatedFields: Object.keys({ ...authUpdates, ...firestoreUpdates })
      });

    } catch (error) {
      console.error("Error updating user:", error);
      
      // Handle specific Firebase Auth errors
      if (error.code === "auth/user-not-found") {
        return res.status(404).json({ error: "User not found" });
      }
      if (error.code === "auth/invalid-email") {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      res.status(500).json({ 
        error: "Internal server error",
        details: error.message 
      });
    }
  });
});

exports.adminDeleteUser = functions.https.onCall(async (data, context) => {
  assertRole(context, "admin");
  const uid = String(data?.uid || "");
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid required");
  await admin.auth().deleteUser(uid).catch(() => {});
  await db.collection("users").doc(uid).delete().catch(() => {});
  return { ok: true };
});

// NEW: HTTP version for delete user
exports.adminDeleteUserHttp = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed. Use DELETE." });
    }
    
    try {
      // Verify authentication
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ error: "Missing authorization token" });

      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get uid from request body or URL params
      const uid = req.body?.uid || req.params?.uid || req.query?.uid;
      if (!uid) {
        return res.status(400).json({ error: "uid is required" });
      }

      // Delete from Firebase Auth (ignore errors if user doesn't exist)
      await admin.auth().deleteUser(uid).catch((error) => {
        console.log(`Failed to delete user from Auth: ${error.message}`);
      });

      // Delete from Firestore (ignore errors if document doesn't exist)
      await db.collection("users").doc(uid).delete().catch((error) => {
        console.log(`Failed to delete user document: ${error.message}`);
      });

      res.status(200).json({ 
        success: true,
        message: "User deleted successfully",
        uid: uid
      });

    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ 
        error: "Internal server error",
        details: error.message 
      });
    }
  });
});

/** Also expose explicit role setter (alias) */
exports.setUserRole = functions.https.onCall(async (data, context) => {
  assertRole(context, "admin");
  const { uid, role } = data || {};
  const r = normalizeRole(role, "user");
  await admin.auth().setCustomUserClaims(uid, { role: r });
  await admin.auth().revokeRefreshTokens(uid);
  await db.collection("users").doc(uid).set(
    { role: r, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { ok: true, role: r };
});

/** ---------- Notifications / Facts ---------- **/
exports.broadcastFactNotification = functions.https.onCall(async (data, context) => {
  assertRole(context, "admin");
  const factId = String(data?.factId || "");
  const title = String(data?.title || "");
  const message = String(data?.message || "");
  const targetType = String(data?.targetType || "all");
  const roles = (data?.roles || []).map((r) => normalizeRole(r));
  const userIdsInput = (data?.userIds || []).map((s) => String(s));

  if (!title || !message) {
    throw new functions.https.HttpsError("invalid-argument", "title and message are required");
  }

  let targets = [];
  if (targetType === "all") {
    const snap = await db.collection("users").get();
    targets = snap.docs.map((d) => d.id);
  } else if (targetType === "roles") {
    targets = await getUserIdsByRoles(roles);
  } else if (targetType === "users") {
    targets = userIdsInput;
  } else {
    throw new functions.https.HttpsError("invalid-argument", "invalid targetType");
  }
  if (!targets.length) return { count: 0 };

  const docs = targets.map((uid) => ({
    ref: db.collection("notifications").doc(),
    data: {
      userId: uid,
      type: "fact",
      factId: factId || null,
      title,
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    },
  }));
  await batchWrite(docs);
  return { count: targets.length };
});

/** HTTP fallback with CORS for people calling via fetch() */
exports.broadcastFactNotificationHttp = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ message: "Missing token" });

      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { factId = "", title = "", message = "", targetType = "all", roles = [], userIds = [] } =
        req.body || {};
      if (!title || !message) return res.status(400).json({ message: "title and message required" });

      let targets = [];
      if (targetType === "all") {
        const snap = await db.collection("users").get();
        targets = snap.docs.map((d) => d.id);
      } else if (targetType === "roles") {
        targets = await getUserIdsByRoles(roles.map((r) => normalizeRole(r)));
      } else if (targetType === "users") {
        targets = (userIds || []).map(String);
      } else {
        return res.status(400).json({ message: "invalid targetType" });
      }
      if (!targets.length) return res.status(200).json({ count: 0 });

      const docs = targets.map((uid) => ({
        ref: db.collection("notifications").doc(),
        data: {
          userId: uid,
          type: "fact",
          factId: factId || null,
          title,
          message,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        },
      }));
      await batchWrite(docs);
      res.status(200).json({ count: targets.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });
});

/** Policy notifications (onCall + HTTP w/ CORS) */
exports.broadcastPolicyNotification = functions.https.onCall(async (data, context) => {
  assertRole(context, "admin");
  const policyId = String(data?.policyId || "");
  const title = String(data?.title || "");
  const roles = (data?.roles || []).map((r) => normalizeRole(r));
  if (!policyId || !title || roles.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "policyId, title, and roles are required");
  }
  const userIds = await getUserIdsByRoles(roles);
  if (!userIds.length) return { count: 0 };

  const docs = userIds.map((uid) => ({
    ref: db.collection("notifications").doc(),
    data: {
      userId: uid,
      type: "policy",
      policyId,
      title,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    },
  }));
  await batchWrite(docs);
  return { count: userIds.length };
});

exports.broadcastPolicyNotificationHttp = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");
    try {
      const auth = req.headers.authorization || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ message: "Missing token" });

      const decoded = await admin.auth().verifyIdToken(token);
      if (decoded.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { policyId = "", title = "", roles = [] } = req.body || {};
      if (!policyId || !title || !roles.length) {
        return res.status(400).json({ message: "policyId, title, roles required" });
      }
      const userIds = await getUserIdsByRoles(roles.map((r) => normalizeRole(r)));
      if (!userIds.length) return res.status(200).json({ count: 0 });

      const docs = userIds.map((uid) => ({
        ref: db.collection("notifications").doc(),
        data: {
          userId: uid,
          type: "policy",
          policyId,
          title,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        },
      }));
      await batchWrite(docs);
      res.status(200).json({ count: userIds.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });
});

/** Publish a fact via HTTP (admin or security) */
exports.publishFact = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");
    try {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ message: "Missing token" });
      const decoded = await admin.auth().verifyIdToken(token);
      const role = decoded.role;
      if (!["admin", "security"].includes(role)) return res.status(403).json({ message: "Forbidden" });

      const body = req.body || {};
      const message = String(body.message || "");
      const roles = (body.roles || ["security"]).map((r) => normalizeRole(r, "security"));
      const priority = String(body.priority || "normal");
      const type = String(body.type || "security");
      if (!message) return res.status(400).json({ message: "message required" });

      const doc = await db.collection("facts").add({
        message,
        roles,
        priority,
        type,
        createdBy: decoded.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        viewCount: 0,
      });
      res.status(201).json({ id: doc.id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });
});

/** Complete registration using employees/{id} record */
exports.completeRegistration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required after signup");
  }
  const employeeId = String(data?.employeeId || "");
  const firstName = String(data?.firstName || "");
  const lastName = String(data?.lastName || "");
  if (!employeeId || !firstName || !lastName) {
    throw new functions.https.HttpsError("invalid-argument", "employeeId, firstName, lastName are required");
  }
  const snap = await db.collection("employees").doc(employeeId).get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Employee ID not found");

  const emp = snap.data() || {};
  const role = normalizeRole(emp.role, "user");
  await admin.auth().setCustomUserClaims(context.auth.uid, { role });

  await db.collection("users").doc(context.auth.uid).set(
    {
      uid: context.auth.uid,
      email: context.auth.token?.email || null,
      firstName,
      lastName,
      role,
      employeeId,
      linkedEmployeeDoc: snap.ref.path,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await snap.ref.set({ uid: context.auth.uid }, { merge: true });
  return { ok: true, role };
});