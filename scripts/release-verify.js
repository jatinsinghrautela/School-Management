import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const commands = ["test", "test:browsers", "test:capacity"];
const checks = [];
if (!process.env.npm_execpath)
  throw new Error("Start this check with npm run release:verify");
let revision = "unknown";
let workingTreeDirty = null;
try {
  revision = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  workingTreeDirty = Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  );
} catch {}
for (const command of commands) {
  const started = Date.now();
  const code = await new Promise((resolve) => {
    // Run npm's JS entry point directly, without a shell or command interpolation.
    const child = spawn(
      process.execPath,
      [process.env.npm_execpath, "run", command],
      { stdio: "inherit" },
    );
    child.once("error", () => resolve(1));
    child.once("exit", (code) => resolve(code ?? 1));
  });
  checks.push({
    command,
    passed: code === 0,
    durationMs: Date.now() - started,
  });
  if (code) break;
}
const report = {
  generatedAt: new Date().toISOString(),
  revision,
  workingTreeDirty,
  passed: checks.length === commands.length && checks.every((c) => c.passed),
  scope: "Local synthetic release checks only",
  checks,
  externalGates: [
    "School-approved jurisdiction/privacy/consent and retention",
    "Independent penetration and manual screen-reader review",
    "Actual HTTPS host, runtime grants, network/secrets and CSP acceptance",
    "Configured SMTP/ClamAV acceptance when enabled",
    "Actual-host restore, off-device encrypted backup and key custody",
    "Controlled school pilot",
  ],
};
await mkdir("apps/api/data/release", { recursive: true });
await writeFile(
  "apps/api/data/release/local-verification.json",
  JSON.stringify(report, null, 2),
);
console.log("Release evidence: apps/api/data/release/local-verification.json");
if (!report.passed) process.exitCode = 1;
