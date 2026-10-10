import { probeOrigin, probeService } from "./uptime-probe.js";
try {
  const args = process.argv.slice(2);
  const origin = probeOrigin(
    args.find((x) => !x.startsWith("--")) || "http://127.0.0.1:4000",
    args.includes("--allow-remote"),
  );
  const result = await probeService(origin);
  console.log(JSON.stringify(result, null, 2));
  if (!result.healthy) process.exitCode = 1;
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
