import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { createStore } from "./store.js";
import { connectionOptions } from "./backup.js";
import { runtimeGrants } from "./database-grants.js";
const suffix = randomUUID().replaceAll("-", ""),
  database = "sg_permissions_" + suffix,
  user = "sgp_" + suffix.slice(0, 20),
  password = randomBytes(32).toString("base64url");
const options = connectionOptions(process.env, true);
if (!options.user || !options.password)
  throw new Error(
    "Set separate RESTORE_MYSQL_USER and RESTORE_MYSQL_PASSWORD for the isolated permission drill",
  );
const admin = await mysql.createConnection(options);
let adminStore,
  runtimeStore,
  runtime,
  databaseCreated = false,
  accountCreated = false,
  host;
try {
  const [[client]] = await admin.query(
    "SELECT SUBSTRING_INDEX(USER(),'@',-1) AS host",
  );
  host = client.host;
  assert(/^[a-zA-Z0-9.:-]+$/.test(host));
  await admin.query(
    "CREATE DATABASE `" +
      database +
      "` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci",
  );
  databaseCreated = true;
  process.env.MYSQL_HOST = options.host;
  process.env.MYSQL_PORT = String(options.port);
  process.env.MYSQL_DATABASE = database;
  process.env.MYSQL_USER = options.user;
  process.env.MYSQL_PASSWORD = options.password;
  adminStore = await createStore("mysql", { migrate: true });
  const schoolId = randomUUID(),
    auditId = randomUUID();
  await adminStore.put("schools", {
    id: schoolId,
    name: "Synthetic least privilege school",
    code: schoolId,
    orgId: null,
  });
  await admin.query("CREATE USER ?@? IDENTIFIED BY ?", [user, host, password]);
  accountCreated = true;
  for (const grant of runtimeGrants(database, user, host))
    await admin.query(grant);
  process.env.MYSQL_USER = user;
  process.env.MYSQL_PASSWORD = password;
  runtimeStore = await createStore("mysql", { migrate: false });
  assert.equal((await runtimeStore.all("schools")).length, 1);
  await runtimeStore.put("audit", {
    id: auditId,
    schoolId,
    action: "synthetic.runtime.append",
    createdAt: new Date().toISOString(),
  });
  await assert.rejects(
    runtimeStore.put("audit", { id: auditId, schoolId, action: "tampered" }),
    /append-only/,
  );
  await assert.rejects(runtimeStore.remove("audit", auditId), /append-only/);
  const original = await runtimeStore.all("audit");
  runtime = await mysql.createConnection({
    ...options,
    user,
    password,
    database,
  });
  for (const sql of [
    "CREATE TABLE forbidden_probe (id INT)",
    "ALTER TABLE sg_schools ADD COLUMN forbidden_probe INT",
    "DROP TABLE sg_schools",
    "UPDATE sg_audit SET extensions='{}'",
    "DELETE FROM sg_audit",
    "DELETE FROM records",
    "DELETE FROM sg_migrations",
    "SELECT * FROM mysql.user",
  ])
    await assert.rejects(runtime.query(sql), (e) =>
      ["ER_TABLEACCESS_DENIED_ERROR", "ER_DBACCESS_DENIED_ERROR"].includes(
        e.code,
      ),
    );
  await runtimeStore.transaction(schoolId, async (tx) => {
    const school = (await tx.all("schools")).find((s) => s.id === schoolId);
    await tx.put("schools", { ...school, name: "Updated synthetic school" });
    await tx.put("audit", {
      id: randomUUID(),
      schoolId,
      action: "synthetic.runtime.transaction",
      createdAt: new Date().toISOString(),
    });
  });
  assert.equal(
    (await runtimeStore.all("schools"))[0].name,
    "Updated synthetic school",
  );
  await runtimeStore.put("files", {
    id: randomUUID(),
    schoolId,
    size: 0,
    staged: false,
  });
  const file = (await runtimeStore.all("files"))[0];
  await runtimeStore.remove("files", file.id);
  assert.deepEqual(
    (await runtimeStore.all("audit")).find((a) => a.id === auditId),
    original[0],
  );
  console.log(
    JSON.stringify({
      status: "synthetic-runtime-permission-drill-passed",
      checks: [
        "runtime-without-migrations",
        "read-write-transactions",
        "audit-append-only",
        "ddl-denied",
        "audit-update-delete-denied",
        "legacy-migration-write-denied",
        "system-tables-denied",
      ],
    }),
  );
} finally {
  if (runtime) await runtime.end();
  if (runtimeStore) await runtimeStore.close();
  if (adminStore) await adminStore.close();
  if (accountCreated) {
    assert(/^sgp_[a-f0-9]{20}$/.test(user));
    await admin.query("DROP USER ?@?", [user, host]);
  }
  if (databaseCreated) {
    assert(/^sg_permissions_[a-f0-9]{32}$/.test(database));
    await admin.query("DROP DATABASE `" + database + "`");
  }
  await admin.end();
}
