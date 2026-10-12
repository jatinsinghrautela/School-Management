import { readFileSync } from "node:fs";
export function mysqlConfig(env = process.env) {
  const tls = env.MYSQL_TLS === "required";
  return {
    host: env.MYSQL_HOST || "127.0.0.1",
    port: Number(env.MYSQL_PORT || 3306),
    user: env.MYSQL_USER || "orbit",
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE || "orbit_school",
    connectionLimit: 5,
    connectTimeout: 5000,
    queueLimit: 20,
    dateStrings: true,
    ...(tls
      ? {
          ssl: {
            ca: readFileSync(env.MYSQL_CA_FILE, "utf8"),
            rejectUnauthorized: true,
            verifyIdentity: true,
          },
        }
      : {}),
  };
}
