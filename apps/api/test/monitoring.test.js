import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { requestMonitor, platformMetrics } from "../src/monitoring.js";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
test("monitoring expires bounded buckets and separates rejections from failures without retaining request data", () => {
  let now = 0;
  const monitor = requestMonitor(() => now);
  function record(status, duration, path = "/api/private?token=secret") {
    const res = new EventEmitter();
    res.statusCode = status;
    monitor.middleware({ path }, res, () => {});
    now += duration;
    res.emit("finish");
  }
  record(200, 10);
  record(403, 20);
  record(500, 30);
  record(200, 99, "/api/health");
  const metrics = monitor.snapshot();
  assert.equal(metrics.requests, 3);
  assert.equal(metrics.rejectedRequests, 1);
  assert.equal(metrics.serverFailures, 1);
  assert.equal(metrics.averageLatencyMs, 20);
  assert.equal(JSON.stringify(metrics).includes("secret"), false);
  now = 3600000;
  assert.equal(monitor.snapshot().requests, 0);
});
test("platform diagnostics are owner-only, use full audit totals and report safe disabled services", async () => {
  const store = await createStore("demo");
  await seed(store);
  for (let i = 0; i < 25; i++)
    await store.put("audit", {
      id: `metric-${i}`,
      actorId: "synthetic",
      action: "test",
      createdAt: new Date().toISOString(),
    });
  await store.put("files", {
    id: "metric-file",
    schoolId: "school-north",
    size: 2048,
  });
  const metrics = await platformMetrics(store, requestMonitor(), {
    mailer: null,
    env: {},
  });
  assert.equal(metrics.totals.auditEvents, 25);
  assert.equal(metrics.totals.storedBytes, 2048);
  assert.equal(metrics.services.emailConfigured, false);
  assert.equal(metrics.services.scannerConfigured, false);
  assert.equal(metrics.services.persistentStorage, false);
  const server = createApp(store, { mailer: null }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    assert.equal((await fetch(base + "/platform/monitoring")).status, 401);
    for (const role of ["teacher", "owner"]) {
      const login = await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        }),
      });
      const { token } = await login.json();
      const result = await fetch(base + "/platform/monitoring", {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(result.status, role === "owner" ? 200 : 403);
      if (role === "owner") {
        const body = await result.json();
        assert.ok(body.totals.auditEvents >= 25);
        assert.equal(JSON.stringify(body).includes("passwordHash"), false);
      }
    }
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
