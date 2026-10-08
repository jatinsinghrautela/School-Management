import mysql from "mysql2/promise";
export const collections = [
  "organizations",
  "schools",
  "users",
  "classes",
  "attendance",
  "marks",
  "resources",
  "notices",
  "audit",
  "files",
  "academicYears",
  "subjects",
  "exams",
  "reports",
  "timetable",
];
export async function createStore(mode = process.env.DATA_MODE || "mysql") {
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
        })
      : null;
  if (pool)
    await pool.query(
      `CREATE TABLE IF NOT EXISTS records (id VARCHAR(36) PRIMARY KEY, kind VARCHAR(24) NOT NULL, school_id VARCHAR(36), payload JSON NOT NULL, INDEX scope_index(kind, school_id))`,
    );
  let demoQueue = Promise.resolve();
  function adapter(db, data, pending = null) {
    return {
      async all(kind) {
        if (!collections.includes(kind)) throw new Error("Unknown collection");
        if (!db) return structuredClone(data[kind]);
        const [rows] = await db.execute(
          "SELECT payload FROM records WHERE kind=?",
          [kind],
        );
        return rows.map((r) =>
          typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
        );
      },
      async put(kind, row) {
        if (!collections.includes(kind)) throw new Error("Unknown collection");
        if (pending) pending.push({ kind, row: structuredClone(row) });
        if (db)
          await db.execute(
            "INSERT INTO records (id,kind,school_id,payload) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload), school_id=VALUES(school_id)",
            [row.id, kind, row.schoolId || null, JSON.stringify(row)],
          );
        else {
          const at = data[kind].findIndex((r) => r.id === row.id);
          if (at < 0) data[kind].push(structuredClone(row));
          else data[kind][at] = structuredClone(row);
        }
        return row;
      },
    };
  }
  return {
    mode,
    async transaction(schoolId, work) {
      if (!pool) {
        const run = demoQueue.then(async () => {
          const draft = structuredClone(memory);
          const pending = [];
          const result = await work(adapter(null, draft, pending));
          for (const { kind, row } of pending) {
            const at = memory[kind].findIndex((r) => r.id === row.id);
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
        await connection.beginTransaction();
        const [rows] = await connection.execute(
          "SELECT id FROM records WHERE id=? AND kind='schools' FOR UPDATE",
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
    async all(kind) {
      if (!collections.includes(kind)) throw new Error("Unknown collection");
      return pool
        ? (
            await pool.execute("SELECT payload FROM records WHERE kind=?", [
              kind,
            ])
          )[0].map((r) =>
            typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
          )
        : structuredClone(memory[kind]);
    },
    async put(kind, row) {
      if (!collections.includes(kind)) throw new Error("Unknown collection");
      if (pool)
        await pool.execute(
          "INSERT INTO records (id,kind,school_id,payload) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload), school_id=VALUES(school_id)",
          [row.id, kind, row.schoolId || null, JSON.stringify(row)],
        );
      else {
        const at = memory[kind].findIndex((r) => r.id === row.id);
        if (at < 0) memory[kind].push(structuredClone(row));
        else memory[kind][at] = structuredClone(row);
      }
      return row;
    },
    async close() {
      if (pool) await pool.end();
    },
  };
}
