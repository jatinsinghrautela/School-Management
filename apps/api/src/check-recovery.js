import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile, unlink, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { createStore } from "./store.js";
import {
  captureBackup,
  encryptBackup,
  decryptBackup,
  restoreBackup,
  connectionOptions,
} from "./backup.js";
const suffix = randomUUID().replaceAll("-", "");
const source = "sg_restore_source_" + suffix,
  target = "sg_restore_drill_" + suffix;
const root = fileURLToPath(
  new URL("../data/recovery-drills/", import.meta.url),
);
const sourceFiles = join(root, source),
  targetFiles = join(root, target);
const options = connectionOptions(process.env, true);
if (!options.user || !options.password)
  throw new Error(
    "Set RESTORE_MYSQL_USER and RESTORE_MYSQL_PASSWORD for a local synthetic database drill",
  );
const admin = await mysql.createConnection(options);
let store, sourceDb, restored;
let sourceCreated = false,
  targetCreated = false;
const fileId = randomUUID();
try {
  await mkdir(root, { recursive: true });
  await mkdir(sourceFiles);
  await admin.query(
    "CREATE DATABASE `" +
      source +
      "` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci",
  );
  sourceCreated = true;
  // This script runs in its own process. No application environment is changed.
  process.env.MYSQL_DATABASE = source;
  process.env.MYSQL_USER = options.user;
  process.env.MYSQL_PASSWORD = options.password;
  store = await createStore("mysql");
  const schoolId = randomUUID(),
    otherId = randomUUID(),
    userId = randomUUID(),
    classId = randomUUID();
  await store.put("schools", {
    id: schoolId,
    name: "Synthetic recovery school",
    code: schoolId,
    orgId: null,
  });
  await store.put("schools", {
    id: otherId,
    name: "Other synthetic recovery school",
    code: otherId,
    orgId: null,
  });
  await store.put("classes", {
    id: classId,
    schoolId,
    name: "Recovery class",
    section: "A",
  });
  await store.put("users", {
    id: userId,
    name: "Synthetic recovery student",
    email: "recovery-" + suffix + "@example.invalid",
    role: "student",
    orgId: null,
    schoolIds: [schoolId],
    classIds: [classId],
    active: true,
    passwordHash: "synthetic-not-a-login-hash",
  });
  const bytes = Buffer.from(
    "Original synthetic recovery upload; no real pupil data.",
  );
  await writeFile(join(sourceFiles, fileId), bytes, { flag: "wx" });
  await store.put("files", {
    id: fileId,
    schoolId,
    userId,
    size: bytes.length,
    scanStatus: "clean",
    staged: false,
    createdAt: new Date().toISOString(),
  });
  await store.put("audit", {
    id: randomUUID(),
    schoolId,
    actorId: userId,
    action: "synthetic.recovery.fixture",
    createdAt: new Date().toISOString(),
  });
  await store.put("securityTokens", {
    id: randomUUID(),
    type: "session",
    tokenHash: createHash("sha256")
      .update("synthetic-recovery-token")
      .digest("hex"),
    userId,
    expires: Date.now() + 3600000,
    revoked: false,
  });
  sourceDb = await mysql.createConnection({ ...options, database: source });
  const snapshot = await captureBackup(sourceDb, sourceFiles);
  const encrypted = await encryptBackup(
    snapshot,
    "Synthetic drill only recovery passphrase 123!",
  );
  const recovered = await decryptBackup(
    encrypted,
    "Synthetic drill only recovery passphrase 123!",
  );
  const report = await restoreBackup(recovered, {
    options,
    database: target,
    sourceDatabase: source,
    uploadsRoot: targetFiles,
  });
  targetCreated = true;
  assert(report.foreignKeysChecked > 0);
  assert.equal(report.files, 1);
  assert.equal(report.sessionsRevoked, true);
  assert.deepEqual(await readFile(join(targetFiles, fileId)), bytes);
  await assert.rejects(
    restoreBackup(recovered, {
      options,
      database: target,
      sourceDatabase: source,
      uploadsRoot: targetFiles,
    }),
    /Restore refused/,
  );
  process.env.MYSQL_DATABASE = target;
  restored = await createStore("mysql");
  const user = await restored.findUser("id", userId);
  assert.deepEqual(user.schoolIds, [schoolId]);
  assert.deepEqual(user.classIds, [classId]);
  assert.equal((await restored.all("files", otherId)).length, 0);
  assert.equal((await restored.all("files", schoolId)).length, 1);
  assert.equal((await restored.all("audit", schoolId)).length, 1);
  assert.equal(
    (await restored.all("securityTokens")).every((t) => t.revoked),
    true,
  );
  // Exercise the explicit foreign-key validation with an authenticated but internally inconsistent snapshot.
  const { rowDigest } = await import("./backup.js");
  const inconsistent = structuredClone(recovered);
  const members = inconsistent.tables.find((t) => t.name === "sg_user_schools");
  members.rows[0].school_id = randomUUID();
  members.sha256 = rowDigest(members.rows);
  const bad = "sg_restore_bad_" + suffix;
  let badCreated = false;
  try {
    await assert.rejects(
      restoreBackup(inconsistent, {
        options,
        database: bad,
        sourceDatabase: source,
        uploadsRoot: join(root, bad),
      }),
      (error) => {
        badCreated = error.targetCreated;
        return /foreign-key integrity/.test(error.message);
      },
    );
  } finally {
    if (badCreated) await admin.query("DROP DATABASE IF EXISTS `" + bad + "`");
    await rmdir(join(root, bad)).catch(() => {});
  }
  console.log(
    JSON.stringify({
      status: "synthetic-mysql-restore-drill-passed",
      tables: report.tables,
      rows: report.rows,
      files: report.files,
      foreignKeysChecked: report.foreignKeysChecked,
      checks: [
        "row-checksums",
        "upload-checksums",
        "memberships",
        "school-isolation",
        "session-revocation",
        "existing-target-refusal",
        "invalid-foreign-key-refusal",
      ],
    }),
  );
} catch (error) {
  if (error.targetCreated) targetCreated = true;
  throw error;
} finally {
  if (store) await store.close();
  if (sourceDb) await sourceDb.end();
  if (restored) await restored.close();
  // Only exact random names created by this invocation are eligible for cleanup.
  for (const name of [
    sourceCreated ? source : null,
    targetCreated ? target : null,
  ].filter(Boolean)) {
    assert(/^sg_restore_(source|drill)_[a-f0-9]{32}$/.test(name));
    await admin.query("DROP DATABASE IF EXISTS `" + name + "`");
  }
  await admin.end();
  for (const dir of [sourceFiles, targetFiles]) {
    await unlink(join(dir, fileId)).catch(() => {});
    await rmdir(dir).catch(() => {});
  }
}
