import "dotenv/config";
import { existsSync } from "node:fs";
import { deploymentCheck } from "./deployment-config.js";
import { createStore } from "./store.js";
const args = process.argv.slice(2);
if (
  args.some((a) => !["--development", "--database"].includes(a)) ||
  new Set(args).size !== args.length
) {
  console.error("Usage: deploy:check [--development] [--database]");
  process.exitCode = 1;
} else {
  const report = deploymentCheck(process.env, {
    production: !args.includes("--development"),
  });
  report.webBuildPresent = existsSync(
    new URL("../../web/dist/index.html", import.meta.url),
  );
  if (report.profile === "production" && !report.webBuildPresent) {
    report.valid = false;
    report.errors.push("Run npm run build before deployment");
  }
  if (args.includes("--database") && report.valid) {
    let store;
    try {
      store = await createStore(process.env.DATA_MODE || "mysql", {
        migrate: false,
      });
      report.databaseReachable = await store.healthCheck();
      if (!report.databaseReachable) {
        report.valid = false;
        report.errors.push("Database readiness failed");
      }
    } catch {
      report.databaseReachable = false;
      report.valid = false;
      report.errors.push(
        "Database connection/schema validation failed; check credentials and initialize the matching release separately",
      );
    } finally {
      if (store) await store.close();
    }
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) process.exitCode = 1;
}
