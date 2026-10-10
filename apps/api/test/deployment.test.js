import { test } from "node:test";
import assert from "node:assert/strict";
import { deploymentCheck } from "../src/deployment-config.js";
import { readinessProbe } from "../src/readiness.js";
import { createStore } from "../src/store.js";
import { createApp } from "../src/app.js";
test("production preflight fails unsafe/incomplete settings without exposing secret values", () => {
  const env = {
    NODE_ENV: "production",
    DATA_MODE: "mysql",
    HOST: "127.0.0.1",
    PORT: "4000",
    TRUST_PROXY: "loopback",
    PUBLIC_APP_URL: "https://school.example.invalid",
    MYSQL_USER: "schoolglass_app",
    MYSQL_PASSWORD: "synthetic-long-runtime-password-123!",
    MYSQL_AUTO_MIGRATE: "no",
  };
  assert.equal(deploymentCheck(env).valid, true);
  for (const changes of [
    { DATA_MODE: "demo" },
    { PORT: "0" },
    { HOST: "0.0.0.0" },
    { TRUST_PROXY: "true" },
    { PUBLIC_APP_URL: "http://school.example.invalid" },
    { PUBLIC_APP_URL: "https://user:secret@school.example.invalid/path" },
    { MYSQL_USER: "root" },
    { MYSQL_PASSWORD: "local-development-only" },
    { BOOTSTRAP_PASSWORD: "private-bootstrap-marker" },
    { BACKUP_PASSPHRASE: "private-backup-marker" },
    { SMTP_HOST: "smtp.example.invalid" },
  ]) {
    const report = deploymentCheck({ ...env, ...changes });
    assert.equal(report.valid, false, JSON.stringify(changes));
    assert.equal(
      JSON.stringify(report).includes("private-bootstrap-marker"),
      false,
    );
    assert.equal(
      JSON.stringify(report).includes("private-backup-marker"),
      false,
    );
  }
  assert.equal(
    deploymentCheck({ DATA_MODE: "demo" }, { production: false }).valid,
    true,
  );
});
test("readiness shares probes, expires cached results, recovers after failure and marks shutdown unavailable", async () => {
  let now = 0,
    calls = 0,
    ready = true;
  const probe = readinessProbe(
    async () => {
      calls++;
      return ready;
    },
    { clock: () => now },
  );
  assert.deepEqual(await Promise.all([probe.read(), probe.read()]), [
    { status: "ready" },
    { status: "ready" },
  ]);
  assert.equal(calls, 1);
  ready = false;
  assert.equal((await probe.read()).status, "ready");
  now = 5001;
  assert.equal((await probe.read()).status, "unavailable");
  ready = true;
  now = 10002;
  assert.equal((await probe.read()).status, "ready");
  probe.stop();
  assert.equal((await probe.read()).status, "unavailable");
});
test("timed-out readiness stays bounded while the underlying dependency remains stuck", async () => {
  let calls = 0,
    now = 0,
    finish;
  const probe = readinessProbe(
    () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    { timeout: 10, clock: () => now },
  );
  assert.equal((await probe.read()).status, "unavailable");
  now = 6000;
  assert.equal((await probe.read()).status, "unavailable");
  assert.equal(calls, 1);
  finish(true);
});
test("HTTP readiness reports dependency failure without details; production rejects HTTP and preserves CSP", async () => {
  const store = await createStore("demo");
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let app;
  try {
    app = createApp(store, { mailer: null });
  } finally {
    if (old === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = old;
  }
  store.healthCheck = async () => {
    throw new Error("private database detail");
  };
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const live = await fetch(base + "/api/health");
    assert.equal(live.status, 200);
    const readiness = await fetch(base + "/api/ready");
    assert.equal(readiness.status, 503);
    assert.deepEqual(await readiness.json(), { status: "unavailable" });
    assert.equal(readiness.headers.get("cache-control"), "private, no-store");
    assert.equal((await fetch(base + "/api/me")).status, 403);
    const forwarded = await fetch(base + "/api/me", {
      headers: { "X-Forwarded-Proto": "https" },
    });
    assert.equal(forwarded.status, 401);
    const csp = forwarded.headers.get("content-security-policy");
    assert.ok(csp.includes("script-src 'self'"));
    assert.ok(csp.includes("script-src-attr 'none'"));
    assert.ok(csp.includes("upgrade-insecure-requests"));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  }
});
