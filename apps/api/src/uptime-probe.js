// An operator-run probe, not an endpoint accepting arbitrary network targets.
export function probeOrigin(value, allowRemote = false) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Use an HTTP(S) origin without credentials, path or query");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local && (!allowRemote || url.protocol !== "https:"))
    throw new Error(
      "Remote probes require HTTPS and --allow-remote for a host you operate",
    );
  return url.origin;
}
export async function probeService(
  origin,
  { fetcher = fetch, timeoutMs = 5000 } = {},
) {
  const checks = [];
  for (const [path, expected] of [
    ["/api/health", "ok"],
    ["/api/ready", "ready"],
  ]) {
    const start = performance.now();
    try {
      const res = await fetcher(origin + path, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "error",
      });
      const body = await res.json();
      checks.push({
        path,
        healthy: res.status === 200 && body.status === expected,
        status: res.status,
        durationMs: Math.round(performance.now() - start),
      });
    } catch {
      checks.push({
        path,
        healthy: false,
        status: null,
        durationMs: Math.round(performance.now() - start),
      });
    }
  }
  return {
    checkedAt: new Date().toISOString(),
    healthy: checks.every((c) => c.healthy),
    checks,
  };
}
