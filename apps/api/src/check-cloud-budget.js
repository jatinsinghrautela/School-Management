import "dotenv/config";
import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { mysqlConfig } from "./mysql-config.js";
import { budgetSchema, createCloudBudget } from "./cloud-budget.js";
const table = `sg_cloud_budget_fixture_${randomBytes(8).toString("hex")}`;
const db = await mysql.createConnection(mysqlConfig());
const env = {
  ...process.env,
  R2_MAX_BYTES: "10",
  R2_MAX_CLASS_A: "3",
  R2_MAX_CLASS_B: "2",
};
let budget;
try {
  await db.query(budgetSchema.replace("sg_cloud_budget", table));
  await db.query(`INSERT INTO ${table}(id) VALUES(1)`);
  budget = createCloudBudget(env, { table });
  const results = await Promise.allSettled(
    [1, 2, 3].map(() => budget.reserve({ bytes: 4, a: 1 })),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
  await budget.close();
  budget = createCloudBudget(env, { table });
  await assert.rejects(() => budget.reserve({ bytes: 4, a: 1 }));
  await budget.reserve({ b: 2 });
  await assert.rejects(() => budget.reserve({ b: 1 }));
  const [rows] = await db.query(`SELECT * FROM ${table}`);
  assert.equal(Number(rows[0].bytes_reserved), 8);
  console.log(
    "Cloud budget concurrency, persisted restart state and read cutoff passed; existing data untouched.",
  );
} finally {
  await budget?.close();
  await db.query(`DROP TABLE IF EXISTS ${table}`);
  await db.end();
}
