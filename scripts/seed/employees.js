// scripts/seed/employees.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// service account must exist at project root
const cred = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../serviceAccount.json"), "utf8"));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(cred) });
}
const db = admin.firestore();

const ALLOWED = new Set(["admin", "security", "accounting", "marketing", "developer", "design"]);

async function run() {
  const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./employees.json"), "utf8"));
  let ok = 0, skipped = 0;
  for (const e of data) {
    const id = String(e.employeeId || "").trim();
    const role = String(e.role || "").toLowerCase();
    if (!id || !ALLOWED.has(role)) {
      console.log("❌ Skipping invalid:", e);
      skipped++;
      continue;
    }
    await db.collection("employees").doc(id).set({
      fullName: e.fullName || null,
      email: e.email || null,
      role,
      department: e.department || null,
      team: e.team || null,
      isActive: e.isActive === undefined ? true : !!e.isActive,
    }, { merge: true });
    console.log("✅ Upserted:", id, "→", role);
    ok++;
  }
  console.log(`\nDone. Upserted ${ok}, skipped ${skipped}\n`);
}

run().catch(err => {
  console.error("Error seeding employees:", err);
  process.exit(1);
});
