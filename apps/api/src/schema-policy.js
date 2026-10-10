export const CURRENT_SCHEMA_VERSION = 9;

export async function requireCurrentSchema(db) {
  const [rows] = await db.query(
    "SELECT version FROM sg_migrations ORDER BY version",
  );
  if (
    rows.length !== CURRENT_SCHEMA_VERSION ||
    rows.some((row, index) => row.version !== index + 1)
  )
    throw new Error(
      "Database schema does not match this release. Run db:init with separate migration credentials before starting the API.",
    );
}

export function runtimeMigrations(env = process.env) {
  return env.NODE_ENV !== "production" && env.MYSQL_AUTO_MIGRATE !== "no";
}

export function auditImmutable() {
  return Object.assign(new Error("Audit entries are append-only"), {
    status: 409,
  });
}
