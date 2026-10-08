import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { createStore } from "./store.js";

// Disposable UUID-named records only; existing school data is never changed.
const schoolId = randomUUID(),
  markerId = randomUUID(),
  rollbackId = randomUUID();
const store = await createStore("mysql");
try {
  await store.put("schools", {
    id: schoolId,
    name: "Disposable transaction verification",
    orgId: null,
  });
  await store.put("audit", {
    id: markerId,
    schoolId,
    action: "verification.transaction",
    count: 0,
  });
  await assert.rejects(
    store.transaction(schoolId, async (tx) => {
      await tx.put("audit", {
        id: rollbackId,
        schoolId,
        action: "verification.rollback",
      });
      throw new Error("Expected rollback");
    }),
  );
  assert.ok(!(await store.all("audit")).some((r) => r.id === rollbackId));
  await Promise.all(
    [1, 2, 3].map(() =>
      store.transaction(schoolId, async (tx) => {
        const marker = (await tx.all("audit")).find((r) => r.id === markerId);
        await tx.put("audit", { ...marker, count: marker.count + 1 });
      }),
    ),
  );
  assert.equal(
    (await store.all("audit")).find((r) => r.id === markerId).count,
    3,
  );
  console.log(
    "MySQL verification passed: rollback is atomic and concurrent school transactions serialize.",
  );
} finally {
  await store.close();
  const cleanup = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "orbit",
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "orbit_school",
  });
  try {
    await cleanup.execute("DELETE FROM records WHERE id IN (?,?,?)", [
      schoolId,
      markerId,
      rollbackId,
    ]);
  } finally {
    await cleanup.end();
  }
}
