import mysql from "mysql2/promise";
import { mysqlConfig } from "./mysql-config.js";
const limitError = () =>
  Object.assign(
    new Error(
      "Cloud storage budget reached or unavailable; contact the platform owner",
    ),
    { status: 503 },
  );
export const budgetSchema = `CREATE TABLE IF NOT EXISTS sg_cloud_budget (id INT PRIMARY KEY, bytes_reserved BIGINT UNSIGNED NOT NULL DEFAULT 0, class_a BIGINT UNSIGNED NOT NULL DEFAULT 0, class_b BIGINT UNSIGNED NOT NULL DEFAULT 0)`;
// Lifetime counters deliberately never reset automatically. This is stricter than monthly allowances.
export function createCloudBudget(
  env = process.env,
  { table = "sg_cloud_budget" } = {},
) {
  if (!/^sg_cloud_budget(?:_fixture_[a-f0-9]+)?$/.test(table))
    throw new Error("Invalid budget table");
  const pool = mysql.createPool({ ...mysqlConfig(env), connectionLimit: 2 });
  return {
    async reserve({ bytes = 0, a = 0, b = 0 }) {
      const caps = [
        env.R2_MAX_BYTES || 8000000000,
        env.R2_MAX_CLASS_A || 500000,
        env.R2_MAX_CLASS_B || 5000000,
      ].map(Number);
      if (
        ![bytes, a, b, ...caps].every((n) => Number.isSafeInteger(n) && n >= 0)
      )
        throw limitError();
      const db = await pool.getConnection();
      try {
        await db.beginTransaction();
        const [rows] = await db.query(
          `SELECT * FROM ${table} WHERE id=1 FOR UPDATE`,
        );
        const row = rows[0];
        if (
          !row ||
          [
            Number(row.bytes_reserved) + bytes,
            Number(row.class_a) + a,
            Number(row.class_b) + b,
          ].some((n, i) => n > caps[i])
        )
          throw limitError();
        await db.execute(
          `UPDATE ${table} SET bytes_reserved=bytes_reserved+?,class_a=class_a+?,class_b=class_b+? WHERE id=1`,
          [bytes, a, b],
        );
        await db.commit();
      } catch (e) {
        await db.rollback();
        throw limitError();
      } finally {
        db.release();
      }
    },
    close: () => pool.end(),
  };
}
