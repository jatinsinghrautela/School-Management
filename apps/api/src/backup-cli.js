import "dotenv/config";
import mysql from "mysql2/promise";
import { readFile, writeFile, mkdir, lstat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  captureBackup,
  encryptBackup,
  decryptBackup,
  restoreBackup,
  connectionOptions,
  MAX_BACKUP_BYTES,
} from "./backup.js";
const dataRoot = fileURLToPath(new URL("../data/", import.meta.url));
async function main() {
  const [action, input, database, ...extra] = process.argv.slice(2);
  if (
    extra.length ||
    !["create", "verify", "restore"].includes(action) ||
    (action === "create" && input) ||
    (action === "verify" && (!input || database)) ||
    (action === "restore" && (!input || !database))
  )
    throw new Error(
      "Usage: backup:create | backup:verify -- <file> | backup:restore -- <file> <new sg_restore_ database>",
    );
  if (!process.env.BACKUP_PASSPHRASE)
    throw new Error(
      "Set BACKUP_PASSPHRASE through a secret manager or session environment; never place it in command arguments",
    );
  if (action === "create") {
    if (process.env.BACKUP_MAINTENANCE_CONFIRMED !== "yes")
      throw new Error(
        "Stop all API workers, upload writers, cleanup and migrations, then set BACKUP_MAINTENANCE_CONFIRMED=yes",
      );
    const db = await mysql.createConnection({
      ...connectionOptions(),
      database: process.env.MYSQL_DATABASE || "orbit_school",
    });
    try {
      const snapshot = await captureBackup(db, join(dataRoot, "uploads"));
      const bytes = await encryptBackup(
        snapshot,
        process.env.BACKUP_PASSPHRASE,
      );
      const root = join(dataRoot, "backups");
      await mkdir(root, { recursive: true, mode: 0o700 });
      const path = join(
        root,
        `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.sgbackup`,
      );
      await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
      console.log(
        JSON.stringify({
          status: "encrypted-backup-created",
          path,
          tables: snapshot.tables.length,
          files: snapshot.files.length,
          bytes: bytes.length,
        }),
      );
    } finally {
      await db.end();
    }
    return;
  }
  const path = resolve(input),
    info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_BACKUP_BYTES)
    throw new Error(
      "Backup must be a regular file below the 128 MB pilot limit",
    );
  const snapshot = await decryptBackup(
    await readFile(path),
    process.env.BACKUP_PASSPHRASE,
  );
  if (action === "verify") {
    console.log(
      JSON.stringify({
        status: "authenticated-and-verified",
        createdAt: snapshot.createdAt,
        tables: snapshot.tables.length,
        files: snapshot.files.length,
      }),
    );
    return;
  }
  if (!process.env.RESTORE_MYSQL_USER || !process.env.RESTORE_MYSQL_PASSWORD)
    throw new Error(
      "Configure separate RESTORE_MYSQL_USER and RESTORE_MYSQL_PASSWORD with create-database permissions on the recovery host",
    );
  const root = join(dataRoot, "restores");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const report = await restoreBackup(snapshot, {
    options: connectionOptions(process.env, true),
    database,
    sourceDatabase: process.env.MYSQL_DATABASE || "orbit_school",
    uploadsRoot: join(root, database),
  });
  console.log(
    JSON.stringify({
      status: "isolated-restore-verified",
      ...report,
      uploadsRoot: join(root, database),
      note: "Not served automatically. Complete operational acceptance before any manual cutover.",
    }),
  );
}
main().catch(() => {
  console.error(
    "Backup operation failed. Check passphrase, format/integrity, permissions, free space, maintenance confirmation, matching release and isolated target settings. No existing database is overwritten.",
  );
  process.exitCode = 1;
});
