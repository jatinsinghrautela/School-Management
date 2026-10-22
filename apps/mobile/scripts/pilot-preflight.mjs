import { readFile, access, readdir, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { validatePilotConfig } from "./pilot-config.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFile(join(root, path), "utf8").then(JSON.parse);
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );
const list = (path) => readdir(path).catch(() => []);
const app = await read("app.json"),
  eas = await read("eas.json");
const config = validatePilotConfig(app, eas, process.env);
for (const asset of [
  app.expo?.icon,
  app.expo?.android?.adaptiveIcon?.foregroundImage,
]) {
  if (!asset || !(await exists(resolve(root, asset))))
    config.errors.push("A configured original icon file is missing.");
}
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (process.platform === "win32" && process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "Android", "Sdk")
    : "");
const java = spawnSync("java", ["-version"], {
  encoding: "utf8",
  timeout: 10000,
  windowsHide: true,
});
const javaVersion =
  (java.stderr || java.stdout || "").match(/version "([^"\n]+)"/)?.[1] || null;
const tools = {
  javaVersion,
  androidPlatforms: sdk
    ? (await list(join(sdk, "platforms"))).filter((n) =>
        /^android-\d+$/.test(n),
      )
    : [],
  androidBuildTools: sdk ? await list(join(sdk, "build-tools")) : [],
  adbInstalled:
    !!sdk &&
    (await exists(
      join(
        sdk,
        "platform-tools",
        process.platform === "win32" ? "adb.exe" : "adb",
      ),
    )),
  licenseFilePresent:
    !!sdk && (await exists(join(sdk, "licenses", "android-sdk-license"))),
};
let audit = { status: "not-run", counts: null };
if (process.argv.includes("--audit")) {
  const result =
    process.platform === "win32"
      ? spawnSync(
          process.env.ComSpec || "cmd.exe",
          ["/d", "/s", "/c", "npm audit --json"],
          { cwd: root, encoding: "utf8", timeout: 90000, windowsHide: true },
        )
      : spawnSync("npm", ["audit", "--json"], {
          cwd: root,
          encoding: "utf8",
          timeout: 90000,
        });
  try {
    const counts = JSON.parse(result.stdout).metadata?.vulnerabilities;
    if (!counts) throw Error();
    audit = { status: "review-required", counts };
    if (!counts.total) audit.status = "no-findings";
  } catch {
    audit = { status: "unavailable", counts: null };
  }
}
const gates = [...config.errors];
if (!config.projectIdConfigured)
  gates.push(
    "Link the Expo project before using EAS cloud builds; no placeholder project ID is committed.",
  );
if (
  !tools.javaVersion ||
  !tools.androidPlatforms.length ||
  !tools.androidBuildTools.length ||
  !tools.adbInstalled
)
  gates.push(
    "Local Android tooling is incomplete; EAS cloud builds do not use this PC's SDK.",
  );
if (audit.status !== "no-findings")
  gates.push(
    "Dependency audit requires review; this report does not waive findings or approve distribution.",
  );
gates.push(
  "Signing, an actual APK install and physical-device acceptance remain manual gates.",
);
const report = {
  checkedAt: new Date().toISOString(),
  configValid: !config.errors.length,
  projectIdConfigured: config.projectIdConfigured,
  tools,
  audit,
  gates,
  signedBuildProduced: false,
};
if (process.argv.includes("--save")) {
  await mkdir(join(root, ".pilot"), { recursive: true });
  await writeFile(
    join(root, ".pilot", "preflight.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
if (config.errors.length || (process.argv.includes("--strict") && gates.length))
  process.exitCode = 1;
