import { collections } from "./store.js";
import { tableFor } from "./relational-store.js";
const safe = (value) => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_]{1,64}$/.test(value))
    throw new Error("Use a plain database/account identifier");
  return value;
};
export function runtimeGrants(database, user, host) {
  safe(database);
  safe(user);
  if (user.length > 32)
    throw new Error("MySQL account names are limited to 32 characters");
  if (typeof host !== "string" || !/^[a-zA-Z0-9.:-]{1,253}$/.test(host))
    throw new Error(
      "Choose an exact account host; wildcard hosts are not generated",
    );
  const tables = [
    ...new Set([
      ...collections.map(tableFor),
      "sg_user_schools",
      "sg_user_classes",
      "sg_subject_teachers",
      "sg_migrations",
      "records",
    ]),
  ].sort();
  return tables.map((table) => {
    const privileges =
      table === "sg_audit"
        ? "SELECT, INSERT"
        : ["sg_migrations", "records"].includes(table)
          ? "SELECT"
          : "SELECT, INSERT, UPDATE, DELETE";
    return `GRANT ${privileges} ON \`${database}\`.\`${table}\` TO '${user}'@'${host}';`;
  });
}
