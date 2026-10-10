import { spawn } from "node:child_process";
const executable = "node_modules/@playwright/test/cli.js";
const args = process.argv.slice(2);
const selected = args.some(
  (a) => a === "--project" || a.startsWith("--project="),
);
// Fresh processes give each engine fresh fixtures and the real authentication
// limiter. Do not weaken production limits to accommodate repeated test logins.
for (const browser of selected ? [null] : ["chromium", "firefox", "webkit"]) {
  const code = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        executable,
        "test",
        ...(browser
          ? [`--project=${browser}`, `--output=test-results/${browser}`]
          : []),
        ...args,
      ],
      { stdio: "inherit", env: { ...process.env, BROWSER_MATRIX: "all" } },
    );
    child.once("error", () => {
      console.error("Could not start browser tests");
      resolve(1);
    });
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (code) process.exitCode = 1;
}
