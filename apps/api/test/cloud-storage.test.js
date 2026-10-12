import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createR2Storage } from "../src/file-storage.js";
import { deploymentCheck } from "../src/deployment-config.js";
import { mysqlConfig } from "../src/mysql-config.js";
const path = "/uploads/11111111-1111-1111-1111-111111111111";
test("private R2 reserves before calls, uses conditional writes and bounds reads", async () => {
  const calls = [],
    reservations = [];
  const storage = createR2Storage({
    env: { R2_BUCKET: "private" },
    budget: { reserve: async (n) => reservations.push(n) },
    client: {
      send: async (c) => {
        calls.push(c);
        return { ContentLength: 3, Body: Readable.from([Buffer.from("abc")]) };
      },
    },
  });
  await storage.writeFile(path, Buffer.from("abc"));
  assert.deepEqual(reservations[0], { bytes: 3, a: 1 });
  assert.equal(calls[0].input.IfNoneMatch, "*");
  assert.equal(
    calls[0].input.Key,
    "files/11111111-1111-1111-1111-111111111111",
  );
  assert.equal((await storage.readFile(path)).toString(), "abc");
  assert.deepEqual(reservations[1], { b: 1 });
  await assert.rejects(() => storage.readFile("/etc/passwd"));
  assert.equal(calls.length, 2);
});
test("paused/exhausted R2 budgets make no cloud call, failures do not refund uncertain writes", async () => {
  let calls = 0,
    reserved = 0;
  const client = {
    send: async () => {
      calls++;
      throw new Error("secret provider error");
    },
  };
  const env = { R2_BUCKET: "private", R2_PAUSED: "yes" };
  const budget = {
    reserve: async () => {
      reserved++;
      throw Object.assign(new Error("limit"), { status: 503 });
    },
  };
  const storage = createR2Storage({ env, client, budget });
  await assert.rejects(() => storage.writeFile(path, Buffer.from("a")));
  assert.equal(reserved, 0);
  env.R2_PAUSED = "no";
  await assert.rejects(() => storage.writeFile(path, Buffer.from("a")));
  assert.equal(calls, 0);
  budget.reserve = async () => {
    reserved++;
  };
  await assert.rejects(
    () => storage.writeFile(path, Buffer.from("a")),
    /Cloud file operation unavailable/,
  );
  assert.equal(calls, 1);
});
test("Render preflight requires TLS, R2 and bounded proxy while local profile stays strict", () => {
  const env = {
    NODE_ENV: "production",
    DATA_MODE: "mysql",
    DEPLOYMENT_PROFILE: "render",
    RENDER: "true",
    HOST: "0.0.0.0",
    TRUST_PROXY: "1",
    MYSQL_TLS: "required",
    MYSQL_CA_FILE: "/etc/secrets/ca.pem",
    MYSQL_USER: "runtime",
    MYSQL_PASSWORD: "synthetic-long-password-12345",
    MYSQL_AUTO_MIGRATE: "no",
    PUBLIC_APP_URL: "https://school.example.com",
    FILE_STORAGE: "r2",
    R2_ENDPOINT: `https://${"a".repeat(32)}.r2.cloudflarestorage.com`,
    R2_BUCKET: "private",
    R2_ACCESS_KEY_ID: "test",
    R2_SECRET_ACCESS_KEY: "test",
  };
  assert.equal(deploymentCheck(env).valid, true);
  for (const change of [
    { MYSQL_TLS: "" },
    { RENDER: "" },
    { TRUST_PROXY: "true" },
    { FILE_STORAGE: "local" },
    { R2_MAX_BYTES: "8000000001" },
    { R2_ENDPOINT: "https://evil.example" },
  ])
    assert.equal(deploymentCheck({ ...env, ...change }).valid, false);
  assert.equal(
    deploymentCheck({ ...env, DEPLOYMENT_PROFILE: "" }).valid,
    false,
  );
  assert.throws(() =>
    mysqlConfig({
      MYSQL_TLS: "required",
      MYSQL_CA_FILE: "missing-certificate-file",
    }),
  );
});
