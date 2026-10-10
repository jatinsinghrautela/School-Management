import { cpSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
mkdirSync("/work", { recursive: true });
cpSync("/source", "/work", { recursive: true });
let result = spawnSync("npm", ["ci"], { cwd: "/work", stdio: "inherit" });
if (result.status === 0)
  result = spawnSync("npm", ["run", "release:verify"], {
    cwd: "/work",
    stdio: "inherit",
  });
const report = "/work/apps/api/data/release/local-verification.json";
if (existsSync(report)) cpSync(report, "/evidence/linux-verification.json");
const preview = "/work/apps/api/data/privacy-review.png";
if (existsSync(preview)) cpSync(preview, "/evidence/privacy-review.png");
process.exitCode = result.status ?? 1;
