import "dotenv/config";
import mysql from "mysql2/promise";
import { mysqlConfig } from "./mysql-config.js";
import { budgetSchema } from "./cloud-budget.js";
// Run separately with migration credentials. Never resets an existing budget.
const db = await mysql.createConnection(mysqlConfig());
try {
  await db.query(budgetSchema);
  await db.query("INSERT IGNORE INTO sg_cloud_budget (id) VALUES (1)");
  console.log("Cloud budget initialized without resetting existing counters.");
} finally {
  await db.end();
}
