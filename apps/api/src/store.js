import {
  runtimeMigrations,
  requireCurrentSchema,
  auditImmutable,
} from "./schema-policy.js";
import mysql from "mysql2/promise";
import {
  migrateRelational,
  relationalAll,
  relationalPut,
  tableFor,
} from "./relational-store.js";
export const collections = [
  "galleryPhotos",
  "libraryBooks",
  "libraryLoans",
  "transportRoutes",
  "transportAssignments",
  "assets",
  "tickets",
  "visitors",
  "documentRequests",
  "notifications",
  "noticeReads",
  "messages",
  "parentLinks",
  "schoolSettings",

  "staffProfiles",
  "leaveRequests",
  "feeSchedules",
  "feeCharges",
  "feePayments",
  "feeConcessions",
  "admissions",
  "studentProfiles",
  "guardians",
  "studentGuardians",
  "organizations",
  "schools",
  "users",
  "classes",
  "attendance",
  "attendanceCorrections",
  "attendanceSessions",
  "terms",
  "enrollments",
  "promotionPreviews",
  "peopleImports",
  "substitutions",
  "marks",
  "resources",
  "notices",
  "audit",
  "files",
  "academicYears",
  "subjects",
  "exams",
  "reports",
  "reportSettings",
  "timetable",
  "submissions",
  "securityTokens",
  "calendar",
  "calendarImports",
  "calendarPolicies",
];
export async function createStore(
  mode = process.env.DATA_MODE || "mysql",
  { migrate = runtimeMigrations() } = {},
) {
  if (!["mysql", "demo"].includes(mode))
    throw new Error("DATA_MODE must be mysql or demo");
  if (mode === "demo" && process.env.NODE_ENV === "production")
    throw new Error("Demo mode cannot run in production");
  const memory = Object.fromEntries(collections.map((k) => [k, []]));
  const pool =
    mode === "mysql"
      ? mysql.createPool({
          host: process.env.MYSQL_HOST || "127.0.0.1",
          port: Number(process.env.MYSQL_PORT || 3306),
          user: process.env.MYSQL_USER || "orbit",
          password: process.env.MYSQL_PASSWORD,
          database: process.env.MYSQL_DATABASE || "orbit_school",
          connectionLimit: 5,
          connectTimeout: 5000,
          queueLimit: 20,
          dateStrings: true,
        })
      : null;
  if (pool) {
    try {
      if (migrate) {
        await pool.query(
          `CREATE TABLE IF NOT EXISTS records (id VARCHAR(36) PRIMARY KEY, kind VARCHAR(24) NOT NULL, school_id VARCHAR(36), payload JSON NOT NULL, INDEX scope_index(kind, school_id))`,
        );
        await migrateRelational(pool, collections);
      }
      await requireCurrentSchema(pool);
    } catch (error) {
      await pool.end();
      throw error;
    }
  }
  let demoQueue = Promise.resolve();
  function adapter(db, data, pending = null) {
    return {
      async lockUsers(userIds) {
        if (!db) return;
        for (const userId of [...new Set(userIds)].sort())
          await db.execute("SELECT id FROM sg_users WHERE id=? FOR UPDATE", [
            userId,
          ]);
      },
      async all(kind, schoolId) {
        if (!collections.includes(kind)) throw new Error("Unknown collection");
        if (!db)
          return structuredClone(
            schoolId
              ? data[kind].filter((r) => r.schoolId === schoolId)
              : data[kind],
          );
        return relationalAll(
          db,
          kind,
          schoolId ? "WHERE school_id=?" : "",
          schoolId ? [schoolId] : [],
        );
      },
      async put(kind, row) {
        if (!collections.includes(kind)) throw new Error("Unknown collection");
        if (db) await relationalPut(db, kind, row);
        else {
          const at = data[kind].findIndex((r) => r.id === row.id);
          if (kind === "audit" && at >= 0) throw auditImmutable();
          if (at < 0) data[kind].push(structuredClone(row));
          else data[kind][at] = structuredClone(row);
        }
        if (pending) pending.push({ kind, row: structuredClone(row) });
        return row;
      },
      async remove(kind, rowId) {
        if (kind === "audit") throw auditImmutable();
        if (!collections.includes(kind)) throw new Error("Unknown collection");
        if (pending) pending.push({ kind, row: { id: rowId }, deleted: true });
        if (db)
          await db.execute(`DELETE FROM ${tableFor(kind)} WHERE id=?`, [rowId]);
        else data[kind] = data[kind].filter((r) => r.id !== rowId);
      },
      async findToken(type, tokenHash) {
        return db
          ? (
              await relationalAll(
                db,
                "securityTokens",
                "WHERE type=? AND token_hash=? AND revoked=FALSE",
                [type, tokenHash],
              )
            )[0]
          : data.securityTokens.find(
              (r) => r.type === type && r.tokenHash === tokenHash && !r.revoked,
            );
      },
    };
  }
  return {
    mode,
    async healthCheck() {
      if (!pool) return true;
      const connection = await pool.getConnection();
      let healthy = false;
      try {
        await connection.query({ sql: "SELECT 1", timeout: 1500 });
        healthy = true;
        return true;
      } catch {
        return false;
      } finally {
        if (healthy) connection.release();
        else connection.destroy();
      }
    },
    async findUser(field, value) {
      if (!["id", "email"].includes(field))
        throw new Error("Invalid user lookup");
      if (typeof value !== "string") return undefined;
      return pool
        ? (await relationalAll(pool, "users", `WHERE ${field}=?`, [value]))[0]
        : structuredClone(
            memory.users.find((u) =>
              field === "email"
                ? u.email.toLowerCase() === value.toLowerCase()
                : u.id === value,
            ),
          );
    },
    async userTransaction(userId, work) {
      return this.transaction(userId, work, "users");
    },
    async transaction(schoolId, work, targetKind = "schools") {
      if (!pool) {
        const run = demoQueue.then(async () => {
          const draft = structuredClone(memory);
          const pending = [];
          const result = await work(adapter(null, draft, pending));
          if (
            pending.some(
              ({ kind, row }) =>
                kind === "audit" && memory.audit.some((a) => a.id === row.id),
            )
          )
            throw auditImmutable();
          for (const { kind, row, deleted } of pending) {
            const at = memory[kind].findIndex((r) => r.id === row.id);
            if (deleted) {
              if (at >= 0) memory[kind].splice(at, 1);
              continue;
            }
            if (at < 0) memory[kind].push(row);
            else memory[kind][at] = row;
          }
          return result;
        });
        demoQueue = run.catch(() => {});
        return run;
      }
      const connection = await pool.getConnection();
      try {
        await connection.query(
          "SET TRANSACTION ISOLATION LEVEL READ COMMITTED",
        );
        await connection.beginTransaction();
        const [rows] = await connection.execute(
          `SELECT id FROM ${tableFor(targetKind)} WHERE id=? FOR UPDATE`,
          [schoolId],
        );
        if (!rows.length)
          throw new Error("School transaction target is missing");
        const result = await work(adapter(connection, null));
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async all(kind, schoolId) {
      if (!collections.includes(kind)) throw new Error("Unknown collection");
      return pool
        ? relationalAll(
            pool,
            kind,
            schoolId ? "WHERE school_id=?" : "",
            schoolId ? [schoolId] : [],
          )
        : structuredClone(
            schoolId
              ? memory[kind].filter((r) => r.schoolId === schoolId)
              : memory[kind],
          );
    },
    async put(kind, row) {
      if (!collections.includes(kind)) throw new Error("Unknown collection");
      if (pool) {
        const db = await pool.getConnection();
        try {
          await db.beginTransaction();
          await relationalPut(db, kind, row);
          await db.commit();
        } catch (e) {
          await db.rollback();
          throw e;
        } finally {
          db.release();
        }
      } else {
        const at = memory[kind].findIndex((r) => r.id === row.id);
        if (kind === "audit" && at >= 0) throw auditImmutable();
        if (at < 0) memory[kind].push(structuredClone(row));
        else memory[kind][at] = structuredClone(row);
      }
      return row;
    },
    async remove(kind, rowId) {
      return adapter(pool, memory).remove(kind, rowId);
    },
    async findToken(type, tokenHash) {
      return adapter(pool, memory).findToken(type, tokenHash);
    },
    async close() {
      if (pool) await pool.end();
    },
  };
}
