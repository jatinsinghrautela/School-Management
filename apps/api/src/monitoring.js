// Fixed-size minute buckets deliberately store no URLs, identities or payloads.
export function requestMonitor(clock = Date.now) {
  const buckets = new Map();
  const started = clock();
  function prune(now) {
    for (const minute of buckets.keys())
      if (minute <= Math.floor(now / 60000) - 60) buckets.delete(minute);
  }
  return {
    middleware(req, res, next) {
      if (!req.path.startsWith("/api/") || req.path === "/api/health")
        return next();
      const begin = clock();
      res.once("finish", () => {
        const now = clock();
        prune(now);
        const minute = Math.floor(now / 60000);
        const bucket = buckets.get(minute) || {
          requests: 0,
          rejected: 0,
          failures: 0,
          duration: 0,
          max: 0,
        };
        const duration = Math.max(0, now - begin);
        bucket.requests++;
        bucket.rejected += Number(
          res.statusCode >= 400 && res.statusCode < 500,
        );
        bucket.failures += Number(res.statusCode >= 500);
        bucket.duration += duration;
        bucket.max = Math.max(bucket.max, duration);
        buckets.set(minute, bucket);
      });
      next();
    },
    snapshot() {
      const now = clock();
      prune(now);
      const totals = [...buckets.values()].reduce(
        (sum, b) => ({
          requests: sum.requests + b.requests,
          rejected: sum.rejected + b.rejected,
          failures: sum.failures + b.failures,
          duration: sum.duration + b.duration,
          max: Math.max(sum.max, b.max),
        }),
        { requests: 0, rejected: 0, failures: 0, duration: 0, max: 0 },
      );
      return {
        windowMinutes: 60,
        uptimeSeconds: Math.floor((now - started) / 1000),
        requests: totals.requests,
        rejectedRequests: totals.rejected,
        serverFailures: totals.failures,
        averageLatencyMs: totals.requests
          ? Math.round(totals.duration / totals.requests)
          : 0,
        maxLatencyMs: totals.max,
      };
    },
  };
}

export async function platformMetrics(
  store,
  monitor,
  { mailer, env = process.env } = {},
) {
  const [schools, users, files, audit] = await Promise.all(
    ["schools", "users", "files", "audit"].map((name) => store.all(name)),
  );
  const dayAgo = Date.now() - 86400000;
  const recent = audit.filter((a) => Date.parse(a.createdAt) >= dayAgo);
  return {
    generatedAt: new Date().toISOString(),
    dataMode: store.mode,
    totals: {
      schools: schools.length,
      independentSchools: schools.filter((s) => !s.orgId).length,
      enabledAccounts: users.filter((u) => u.active !== false).length,
      auditEvents: audit.length,
      actionsLast24Hours: recent.length,
      actorsLast24Hours: new Set(recent.map((a) => a.actorId).filter(Boolean))
        .size,
      storedBytes: files.reduce(
        (sum, f) => sum + Math.max(0, Number(f.size) || 0),
        0,
      ),
    },
    requests: monitor.snapshot(),
    services: {
      emailConfigured: Boolean(mailer),
      scannerConfigured: Boolean(env.CLAMAV_COMMAND),
      persistentStorage: store.mode === "mysql",
    },
  };
}
