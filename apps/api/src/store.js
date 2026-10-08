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
  return {
    mode,
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
