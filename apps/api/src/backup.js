import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  scrypt,
} from "node:crypto";
import { promisify } from "node:util";
import { gzipSync, gunzipSync } from "node:zlib";
import { readFile, writeFile, lstat, mkdir } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";
import { collections } from "./store.js";
import { tableFor, migrateRelational } from "./relational-store.js";
const derive = promisify(scrypt);
const MAGIC = Buffer.from("SGDBAK01");
export const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
export const backupTables = [
  ...new Set([
    "records",
    "sg_migrations",
    ...collections.map(tableFor),
    "sg_user_schools",
    "sg_user_classes",
    "sg_subject_teachers",
  ]),
].sort();
const ident = (name) => {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error("Invalid identifier");
  return "`" + name + "`";
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  return value;
}
export const rowDigest = (rows) =>
  digest(JSON.stringify(rows.map((r) => JSON.stringify(canonical(r))).sort()));
function passphrase(value) {
  if (typeof value !== "string" || value.length < 20 || value.length > 1024)
    throw new Error("BACKUP_PASSPHRASE must contain 20–1024 characters");
}
export async function encryptBackup(snapshot, password) {
  passphrase(password);
  const plain = Buffer.from(JSON.stringify(snapshot));
  if (plain.length > MAX_BACKUP_BYTES)
    throw new Error("Backup exceeds the 128 MB pilot limit");
  const salt = randomBytes(32),
    iv = randomBytes(12);
  const key = await derive(password, salt, 32, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  try {
    const cipher = createCipheriv("aes-256-gcm", key, iv, {
      authTagLength: 16,
    });
    const header = Buffer.concat([MAGIC, salt, iv]);
    cipher.setAAD(header);
    const ciphertext = Buffer.concat([
      cipher.update(gzipSync(plain)),
      cipher.final(),
    ]);
    const result = Buffer.concat([header, cipher.getAuthTag(), ciphertext]);
    if (result.length > MAX_BACKUP_BYTES)
      throw new Error("Encrypted backup exceeds the 128 MB pilot limit");
    return result;
  } finally {
    key.fill(0);
  }
}
export async function decryptBackup(bytes, password) {
  passphrase(password);
  if (
    bytes.length > MAX_BACKUP_BYTES ||
    bytes.length < 69 ||
    !bytes.subarray(0, 8).equals(MAGIC)
  )
    throw new Error("Invalid backup format or size");
  const key = await derive(password, bytes.subarray(8, 40), 32, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      bytes.subarray(40, 52),
      { authTagLength: 16 },
    );
    decipher.setAAD(bytes.subarray(0, 52));
    decipher.setAuthTag(bytes.subarray(52, 68));
    const compressed = Buffer.concat([
      decipher.update(bytes.subarray(68)),
      decipher.final(),
    ]);
    const snapshot = JSON.parse(
      gunzipSync(compressed, { maxOutputLength: MAX_BACKUP_BYTES }).toString(
        "utf8",
      ),
    );
    validateSnapshot(snapshot);
    return snapshot;
  } catch {
    throw new Error("Backup authentication or integrity check failed");
  } finally {
    key.fill(0);
  }
}
export function validateSnapshot(snapshot) {
  if (
    snapshot?.format !== 1 ||
    !Array.isArray(snapshot.tables) ||
    !Array.isArray(snapshot.files)
  )
    throw new Error("Unsupported snapshot");
  const names = snapshot.tables.map((t) => t.name).sort();
  if (JSON.stringify(names) !== JSON.stringify(backupTables))
    throw new Error("Snapshot table set does not match this release");
  for (const table of snapshot.tables) {
    if (
      !Array.isArray(table.columns) ||
      !table.columns.length ||
      new Set(table.columns).size !== table.columns.length ||
      !Array.isArray(table.rows)
    )
      throw new Error("Invalid table layout");
    table.columns.forEach(ident);
    for (const row of table.rows)
      if (
        !row ||
        Array.isArray(row) ||
        JSON.stringify(Object.keys(row).sort()) !==
          JSON.stringify([...table.columns].sort())
      )
        throw new Error("Invalid row layout");
    if (rowDigest(table.rows) !== table.sha256)
      throw new Error("Row integrity mismatch");
  }
  const rows = snapshot.tables.find((t) => t.name === tableFor("files")).rows;
  const ids = new Set();
  for (const file of snapshot.files) {
    if (
      !/^[a-f0-9-]{36}$/i.test(file.id) ||
      ids.has(file.id) ||
      typeof file.data !== "string"
    )
      throw new Error("Invalid upload identity");
    const bytes = Buffer.from(file.data, "base64");
    if (
      bytes.toString("base64") !== file.data ||
      bytes.length !== file.size ||
      digest(bytes) !== file.sha256
    )
      throw new Error("Upload integrity mismatch");
    ids.add(file.id);
  }
  if (rows.length !== ids.size || rows.some((r) => !ids.has(r.id)))
    throw new Error("Upload manifest does not match file records");
}
export function connectionOptions(env = process.env, restore = false) {
  return {
    host: (restore && env.RESTORE_MYSQL_HOST) || env.MYSQL_HOST || "127.0.0.1",
    port: Number((restore && env.RESTORE_MYSQL_PORT) || env.MYSQL_PORT || 3306),
    user: restore ? env.RESTORE_MYSQL_USER : env.MYSQL_USER || "orbit",
    password: restore ? env.RESTORE_MYSQL_PASSWORD : env.MYSQL_PASSWORD,
    dateStrings: true,
    timezone: "Z",
    multipleStatements: false,
  };
}
export async function captureBackup(db, uploadsRoot) {
  const [engines] = await db.query(
    "SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'",
  );
  const relevant = engines.filter(
    (t) => t.TABLE_NAME === "records" || t.TABLE_NAME.startsWith("sg_"),
  );
  if (
    JSON.stringify(relevant.map((t) => t.TABLE_NAME).sort()) !==
      JSON.stringify(backupTables) ||
    relevant.some((t) => t.ENGINE !== "InnoDB")
  )
    throw new Error(
      "Backup requires the exact current release table set and InnoDB storage",
    );
  await db.query("SET time_zone='+00:00'");
  await db.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await db.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
  try {
    const snapshot = {
      format: 1,
      createdAt: new Date().toISOString(),
      tables: [],
      files: [],
    };
    for (const name of backupTables) {
      const [columns] = await db.query(`SHOW COLUMNS FROM ${ident(name)}`);
      const [rows] = await db.query(`SELECT * FROM ${ident(name)}`);
      snapshot.tables.push({
        name,
        columns: columns.map((c) => c.Field),
        rows,
        sha256: rowDigest(rows),
      });
      if (Buffer.byteLength(JSON.stringify(snapshot)) > MAX_BACKUP_BYTES)
        throw new Error("Backup exceeds the 128 MB pilot limit");
    }
    const fileRows = snapshot.tables.find(
      (t) => t.name === tableFor("files"),
    ).rows;
    let total = Buffer.byteLength(JSON.stringify(snapshot));
    for (const file of fileRows) {
      if (!/^[a-f0-9-]{36}$/i.test(file.id))
        throw new Error("Invalid stored upload identity");
      const path = join(uploadsRoot, file.id),
        info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink())
        throw new Error("Upload must be a regular file");
      total += Math.ceil(info.size / 3) * 4 + 256;
      if (total > MAX_BACKUP_BYTES)
        throw new Error("Backup exceeds the 128 MB pilot limit");
      const bytes = await readFile(path);
      const metadata =
        typeof file.extensions === "string"
          ? JSON.parse(file.extensions)
          : file.extensions;
      if (bytes.length !== metadata.size)
        throw new Error("Stored upload size mismatch");
      snapshot.files.push({
        id: file.id,
        size: bytes.length,
        sha256: digest(bytes),
        data: bytes.toString("base64"),
      });
    }
    validateSnapshot(snapshot);
    await db.commit();
    return snapshot;
  } catch (error) {
    await db.rollback();
    throw error;
  }
}
export function validateRestoreName(name, source) {
  if (!/^sg_restore_[a-z0-9_]{8,40}$/.test(name) || name === source)
    throw new Error(
      "Restore database must be a new sg_restore_ name with an 8–40 character suffix",
    );
}
export async function checkForeignKeys(db, database) {
  const [rows] = await db.execute(
    "SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME,ORDINAL_POSITION FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION",
    [database],
  );
  const constraints = new Map();
  for (const row of rows) {
    const key = row.TABLE_NAME + ":" + row.CONSTRAINT_NAME;
    if (!constraints.has(key)) constraints.set(key, []);
    constraints.get(key).push(row);
  }
  for (const parts of constraints.values()) {
    const first = parts[0];
    const on = parts
      .map(
        (p) => `c.${ident(p.COLUMN_NAME)}=p.${ident(p.REFERENCED_COLUMN_NAME)}`,
      )
      .join(" AND ");
    const nonNull = parts
      .map((p) => `c.${ident(p.COLUMN_NAME)} IS NOT NULL`)
      .join(" AND ");
    const [[result]] = await db.query(
      `SELECT COUNT(*) AS invalid FROM ${ident(first.TABLE_NAME)} c LEFT JOIN ${ident(first.REFERENCED_TABLE_NAME)} p ON ${on} WHERE ${nonNull} AND p.${ident(first.REFERENCED_COLUMN_NAME)} IS NULL`,
    );
    if (Number(result.invalid))
      throw new Error("Restored foreign-key integrity check failed");
  }
  return constraints.size;
}
export async function restoreBackup(
  snapshot,
  { options, database, sourceDatabase, uploadsRoot },
) {
  validateSnapshot(snapshot);
  validateRestoreName(database, sourceDatabase);
  const admin = await mysql.createConnection(options);
  let pool,
    db,
    created = false;
  try {
    // CREATE without IF NOT EXISTS refuses all pre-existing targets.
    await admin.query(
      `CREATE DATABASE ${ident(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    created = true;
    await mkdir(uploadsRoot, { recursive: false, mode: 0o700 });
    pool = mysql.createPool({ ...options, database, connectionLimit: 2 });
    await pool.query(
      "CREATE TABLE records (id VARCHAR(36) PRIMARY KEY,kind VARCHAR(24) NOT NULL,school_id VARCHAR(36),payload JSON NOT NULL,INDEX scope_index(kind,school_id))",
    );
    await migrateRelational(pool, collections);
    db = await pool.getConnection();
    await db.query("SET time_zone='+00:00'");
    for (const table of snapshot.tables) {
      const [current] = await db.query(
        `SHOW COLUMNS FROM ${ident(table.name)}`,
      );
      if (
        JSON.stringify(current.map((c) => c.Field).sort()) !==
        JSON.stringify([...table.columns].sort())
      )
        throw new Error(
          "Restore schema mismatch; use the matching application release",
        );
    }
    const sourceVersions = snapshot.tables
      .find((t) => t.name === "sg_migrations")
      .rows.map((r) => r.version)
      .sort();
    const [currentVersions] = await db.query(
      "SELECT version FROM sg_migrations",
    );
    if (
      JSON.stringify(sourceVersions) !==
      JSON.stringify(currentVersions.map((r) => r.version).sort())
    )
      throw new Error("Restore migration version mismatch");
    await db.query("SET SESSION foreign_key_checks=0");
    await db.beginTransaction();
    for (const table of snapshot.tables) {
      await db.query(`DELETE FROM ${ident(table.name)}`);
      if (table.rows.length) {
        const sql = `INSERT INTO ${ident(table.name)} (${table.columns.map(ident).join(",")}) VALUES (${table.columns.map(() => "?").join(",")})`;
        for (const row of table.rows)
          await db.execute(
            sql,
            table.columns.map((c) =>
              row[c] && typeof row[c] === "object"
                ? JSON.stringify(row[c])
                : row[c],
            ),
          );
      }
    }
    for (const table of snapshot.tables) {
      const [rows] = await db.query(`SELECT * FROM ${ident(table.name)}`);
      if (rowDigest(rows) !== table.sha256)
        throw new Error("Restored row checksum mismatch");
    }
    const foreignKeysChecked = await checkForeignKeys(db, database);
    // Recovery never reactivates old session or reset credentials.
    await db.query("UPDATE sg_security_tokens SET revoked=TRUE");
    for (const file of snapshot.files) {
      const path = join(uploadsRoot, file.id);
      await writeFile(path, Buffer.from(file.data, "base64"), {
        flag: "wx",
        mode: 0o600,
      });
      if (digest(await readFile(path)) !== file.sha256)
        throw new Error("Restored upload checksum mismatch");
    }
    await db.commit();
    return {
      database,
      tables: snapshot.tables.length,
      rows: snapshot.tables.reduce((n, t) => n + t.rows.length, 0),
      files: snapshot.files.length,
      foreignKeysChecked,
      sessionsRevoked: true,
    };
  } catch (error) {
    if (db) await db.rollback().catch(() => {});
    const failure = new Error(
      created
        ? "Restore failed; the new isolated target is incomplete and must not be served. " +
            error.message
        : "Restore refused: " + error.message,
    );
    failure.targetCreated = created;
    throw failure;
  } finally {
    if (db) {
      await db.query("SET SESSION foreign_key_checks=1").catch(() => {});
      db.release();
    }
    if (pool) await pool.end();
    await admin.end();
  }
}
