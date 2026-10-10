import { test } from "node:test";
import assert from "node:assert/strict";
import { probeOrigin, probeService } from "../src/uptime-probe.js";
test("uptime probe refuses unapproved remote origins and reports failures without response contents", async () => {
  assert.equal(probeOrigin("http://127.0.0.1:4000"), "http://127.0.0.1:4000");
  for (const origin of [
    "https://example.test",
    "http://example.test",
    "http://user:secret@127.0.0.1",
    "http://127.0.0.1/api",
    "http://127.0.0.1?secret=1",
  ])
    assert.throws(() => probeOrigin(origin));
  assert.equal(
    probeOrigin("https://example.test", true),
    "https://example.test",
  );
  const healthy = await probeService("http://127.0.0.1", {
    fetcher: async (url) => ({
      status: 200,
      json: async () => ({
        status: url.endsWith("ready") ? "ready" : "ok",
        sensitive: "secret",
      }),
    }),
  });
  assert.equal(healthy.healthy, true);
  assert.equal(JSON.stringify(healthy).includes("secret"), false);
  const outage = await probeService("http://127.0.0.1", {
    fetcher: async () => {
      throw new Error("password=secret");
    },
  });
  assert.equal(outage.healthy, false);
  assert.equal(outage.checks.length, 2);
  assert.equal(JSON.stringify(outage).includes("secret"), false);
  assert.equal(
    (
      await probeService("http://127.0.0.1", {
        fetcher: async () => ({
          status: 503,
          json: async () => ({ status: "unavailable" }),
        }),
      })
    ).healthy,
    false,
  );
});
