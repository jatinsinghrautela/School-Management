import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  backupTables,
  rowDigest,
  encryptBackup,
  decryptBackup,
  validateSnapshot,
  validateRestoreName,
} from "../src/backup.js";
function fixture() {
  return {
    format: 1,
    createdAt: new Date().toISOString(),
    tables: backupTables.map((name) => ({
      name,
      columns: ["id"],
      rows: [],
      sha256: rowDigest([]),
    })),
    files: [],
  };
}
const password = "Synthetic-only recovery passphrase 123!";
test("encrypted backups authenticate payload and header; reject wrong credentials, corruption and weak passphrases", async () => {
  const snapshot = fixture();
  snapshot.tables[0].rows.push({ id: "private-student-marker" });
  snapshot.tables[0].sha256 = rowDigest(snapshot.tables[0].rows);
  const bytes = await encryptBackup(snapshot, password),
    second = await encryptBackup(snapshot, password);
  assert.notDeepEqual(bytes, second);
  assert.equal(bytes.includes(Buffer.from("private-student-marker")), false);
  assert.deepEqual(await decryptBackup(bytes, password), snapshot);
  await assert.rejects(
    decryptBackup(bytes, "Different synthetic passphrase 123!"),
  );
  for (const index of [8, 40, 52, bytes.length - 1]) {
    const changed = Buffer.from(bytes);
    changed[index] ^= 1;
    await assert.rejects(decryptBackup(changed, password));
  }
  await assert.rejects(encryptBackup(snapshot, "short"));
  await assert.rejects(decryptBackup(Buffer.from("not a backup"), password));
});
test("restore validation rejects live names, table/row tampering, unsafe upload paths and mismatched file manifests", () => {
  assert.throws(() => validateRestoreName("orbit_school", "orbit_school"));
  assert.throws(() =>
    validateRestoreName("sg_restore_../../live", "orbit_school"),
  );
  validateRestoreName("sg_restore_synthetic_123", "orbit_school");
  let snapshot = fixture();
  snapshot.tables.pop();
  assert.throws(() => validateSnapshot(snapshot));
  snapshot = fixture();
  snapshot.tables[0].rows = [{ id: "tampered" }];
  assert.throws(() => validateSnapshot(snapshot));
  snapshot = fixture();
  snapshot.files.push({ id: "../../private", data: "", size: 0, sha256: "" });
  assert.throws(() => validateSnapshot(snapshot));
  snapshot = fixture();
  const bytes = Buffer.from("Synthetic original upload"),
    id = randomUUID();
  snapshot.files.push({
    id,
    size: bytes.length,
    data: bytes.toString("base64"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  assert.throws(() => validateSnapshot(snapshot));
  const files = snapshot.tables.find((t) => t.name === "sg_files");
  files.rows = [{ id }];
  files.sha256 = rowDigest(files.rows);
  validateSnapshot(snapshot);
  snapshot.files[0].data = Buffer.from("tampered").toString("base64");
  assert.throws(() => validateSnapshot(snapshot));
});
