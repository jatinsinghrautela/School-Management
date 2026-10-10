import { cpSync, mkdirSync, mkdtempSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
// Stage only source/config/tests. Never mount .env, uploads, Git credentials,
// existing databases or node_modules into the verification container.
const root = resolve("apps/api/data/release");
mkdirSync(root, { recursive: true });
const source = mkdtempSync(join(root, "source-"));
for (const path of [
  "package.json",
  "package-lock.json",
  "playwright.config.js",
  "scripts",
  "tests/browser",
  "apps/api/src",
  "apps/api/test",
  "apps/api/package.json",
  "apps/web/src",
  "apps/web/public",
  "apps/web/package.json",
  "apps/web/index.html",
  "apps/web/vite.config.js",
]) {
  if (!existsSync(path)) continue;
  const target = join(source, path);
  mkdirSync(resolve(target, ".."), { recursive: true });
  cpSync(path, target, { recursive: true });
}
const child = spawn(
  "docker",
  [
    "run",
    "--rm",
    "--init",
    "--shm-size=1g",
    "--mount",
    `type=bind,source=${source},target=/source,readonly`,
    "--mount",
    `type=bind,source=${root},target=/evidence`,
    "mcr.microsoft.com/playwright:v1.64.0-noble",
    "node",
    "/source/scripts/container-entry.js",
  ],
  { stdio: "inherit" },
);
child.once("error", () => {
  console.error("Docker is unavailable; use native verification or CI");
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
