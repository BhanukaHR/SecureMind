import fs from "fs";
import path from "path";
import admin from "firebase-admin";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccount.json";
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(credPath, "utf8"))) });
}
const db = admin.firestore();

const dir = process.env.OLD_JSON_DIR || "./legacy-json";
function read(name) {
  const p = path.join(dir, name + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8") || "[]") : [];
}

async function main() {
  const users = read("users");
  const facts = read("facts");
  console.log(`Migrating ${users.length} users, ${facts.length} facts`);

  for (const u of users) {
    const uid = u.id || u._id || u.uid || admin.firestore().collection("_").doc().id;
    await db.collection("users").doc(uid).set({
      email: u.email,
      firstName: u.firstName || u.name?.split(" ")[0] || null,
      lastName: u.lastName || u.name?.split(" ").slice(1).join(" ") || null,
      employeeId: u.employeeId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (u.role) {
      await admin.auth().setCustomUserClaims(uid, { role: String(u.role).toLowerCase() });
    }
  }

  for (const f of facts) {
    await db.collection("facts").add({
      message: f.message || f.body || f.title,
      roles: Array.isArray(f.roles) ? f.roles.map(r=>String(r).toLowerCase()) : ["security"],
      priority: (f.priority || "normal").toLowerCase(),
      type: (f.type || "security").toLowerCase(),
      createdAt: new Date(f.createdAt || Date.now()),
      createdBy: f.createdBy || null,
      viewCount: f.viewCount || 0,
    });
  }

  console.log("Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
