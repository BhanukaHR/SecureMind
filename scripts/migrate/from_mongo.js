import admin from "firebase-admin";
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./serviceAccount.json";
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(credPath, "utf8"))) });
}
const db = admin.firestore();
const uri = process.env.MONGO_URI;

async function main() {
  if (!uri) throw new Error("Set MONGO_URI in .env");
  const client = new MongoClient(uri);
  await client.connect();
  const mongo = client.db();

  const users = await mongo.collection("users").find({}).toArray();
  const employees = await mongo.collection("employees").find({}).toArray();
  const facts = await mongo.collection("facts").find({}).toArray();
  const pre = await mongo.collection("preapprovals").find({}).toArray();

  console.log(`Migrating ${users.length} users, ${employees.length} employees, ${facts.length} facts, ${pre.length} preapprovals`);

  for (const u of users) {
    const uid = String(u._id);
    await db.collection("users").doc(uid).set({
      email: u.email, firstName: u.firstName || null, lastName: u.lastName || null,
      employeeId: u.employeeId || null, createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (u.role) await admin.auth().setCustomUserClaims(uid, { role: String(u.role).toLowerCase() });
  }

  for (const e of employees) {
    await db.collection("employees").doc(String(e._id)).set({
      employeeId: e.employeeId, email: e.email, fullName: e.fullName,
      role: String(e.role).toLowerCase(), isActive: !!e.isActive, uid: e.linkedUserId ? String(e.linkedUserId) : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  for (const f of facts) {
    await db.collection("facts").add({
      message: f.message, roles: f.roles || ["security"], priority: (f.priority||"normal").toLowerCase(),
      type: (f.type||"security").toLowerCase(), createdAt: f.createdAt ? new Date(f.createdAt) : admin.firestore.FieldValue.serverTimestamp(),
      createdBy: f.createdBy ? String(f.createdBy) : null, viewCount: f.viewCount || 0
    });
  }

  for (const p of pre) {
    await db.collection("preapprovals").doc(String(p.userId || p._id)).set({
      role: String(p.role).toLowerCase(), email: p.email || null, used: !!p.used,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  console.log("Done.");
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
