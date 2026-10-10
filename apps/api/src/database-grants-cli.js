import "dotenv/config";
import { runtimeGrants } from "./database-grants.js";
try {
  const [database, user, host, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error("Too many arguments");
  console.log(
    "-- Review and apply as the database administrator to a NEW account with no existing grants.",
  );
  console.log(
    "-- This generator does not create accounts or execute SQL. Set MYSQL_AUTO_MIGRATE=no for the API.",
  );
  console.log(runtimeGrants(database, user, host).join("\n"));
} catch {
  console.error(
    "Usage: db:grants -- <database> <new runtime account> <exact account host>",
  );
  process.exitCode = 1;
}
