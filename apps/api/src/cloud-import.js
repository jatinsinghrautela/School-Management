import "dotenv/config";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { mysqlConfig } from "./mysql-config.js";
import { createStore } from "./store.js";
import { decryptBackup, rowDigest } from "./backup.js";
import { budgetSchema } from "./cloud-budget.js";
import {
  sameMigrationVersions,
  writableColumns,
} from "./cloud-import-layout.js";
// Operator-only import into an EMPTY target. Does not read or delete the source DB.
if (
  process.env.CLOUD_MIGRATION_CONFIRMED !== "yes" ||
  process.env.MYSQL_TLS !== "required"
)
  throw new Error("Verified TLS and CLOUD_MIGRATION_CONFIRMED=yes required");
const snapshot = await decryptBackup(
  await readFile(process.argv[2]),
  process.env.BACKUP_PASSPHRASE,
);
const store = await createStore("mysql", { migrate: true });
await store.close();
const db = await mysql.createConnection(mysqlConfig());
const ident = (name) => {
  if (!/^[a-z][a-z0-9_]*$/.test(name))
    throw new Error("Invalid backup identifier");
  return `\`${name}\``;
};
try {
  for (const table of snapshot.tables) {
    const [rows] = await db.query(`SELECT * FROM ${ident(table.name)}`);
    if (table.name === "sg_migrations") {
      if (!sameMigrationVersions(table.rows, rows))
        throw new Error("Migration release mismatch");
    } else if (rows.length)
      throw new Error(
        "Target is not empty; refusing to overwrite existing data",
      );
  }
  await db.query("SET SESSION foreign_key_checks=0");
  await db.beginTransaction();
  for (const table of snapshot.tables) {
    if (table.name === "sg_migrations") continue;
    const [layout] = await db.query(`SHOW COLUMNS FROM ${ident(table.name)}`);
    const insertColumns = writableColumns(table.columns, layout);
    for (const row of table.rows)
      await db.execute(
        `INSERT INTO ${ident(table.name)} (${insertColumns.map(ident).join(",")}) VALUES (${insertColumns.map(() => "?").join(",")})`,
        insertColumns.map((c) =>
          row[c] && typeof row[c] === "object"
            ? JSON.stringify(row[c])
            : row[c],
        ),
      );
    const [rows] = await db.query(`SELECT * FROM ${ident(table.name)}`);
    if (rowDigest(rows) !== table.sha256)
      throw new Error("Imported row checksum mismatch");
  }
  await db.query("UPDATE sg_security_tokens SET revoked=TRUE");
  await db.commit();
  await db.query(budgetSchema);
  await db.query("INSERT IGNORE INTO sg_cloud_budget(id) VALUES(1)");
  console.log(
    JSON.stringify({
      databaseRowsVerified: snapshot.tables.reduce(
        (n, t) => n + t.rows.length,
        0,
      ),
      sessionsRevoked: true,
      sourceRecordsDeleted: 0,
      next: "Migrate and verify cloud files before starting Render",
    }),
  );
} catch (e) {
  await db.rollback();
  throw e;
} finally {
  await db.query("SET SESSION foreign_key_checks=1");
  await db.end();
}
