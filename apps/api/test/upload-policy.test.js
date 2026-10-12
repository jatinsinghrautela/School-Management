import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadPolicy, scanBuffer } from "../src/upload-security.js";
import { deploymentCheck } from "../src/deployment-config.js";
test("uploads require scanning by default; explicit hosted unscanned mode and local-only mode stay distinct", async () => {
  assert.equal(uploadPolicy({}).enabled, false);
  assert.deepEqual(
    uploadPolicy({ UPLOAD_SCAN_MODE: "unscanned", NODE_ENV: "production" }),
    { mode: "unscanned", enabled: true, unscanned: true },
  );
  assert.equal(uploadPolicy({ CLAMAV_COMMAND: "clamscan" }).enabled, true);
  assert.equal(
    uploadPolicy({ UPLOAD_SCAN_MODE: "disabled", CLAMAV_COMMAND: "clamscan" })
      .enabled,
    false,
  );
  assert.equal(
    uploadPolicy({ UPLOAD_SCAN_MODE: "unscanned-local" }).enabled,
    true,
  );
  assert.equal(
    uploadPolicy({
      UPLOAD_SCAN_MODE: "unscanned-local",
      NODE_ENV: "production",
    }).enabled,
    false,
  );
  assert.ok(
    deploymentCheck(
      { UPLOAD_SCAN_MODE: "unscanned-local" },
      { production: true },
    ).errors.includes("Unscanned uploads are restricted to local development"),
  );
  const original = {
    mode: process.env.UPLOAD_SCAN_MODE,
    node: process.env.NODE_ENV,
  };
  try {
    process.env.UPLOAD_SCAN_MODE = "unscanned-local";
    process.env.NODE_ENV = "development";
    await scanBuffer(Buffer.from("test"));
    process.env.UPLOAD_SCAN_MODE = "disabled";
    await assert.rejects(scanBuffer(Buffer.from("test")), /disabled/);
    process.env.UPLOAD_SCAN_MODE = "unscanned-local";
    process.env.NODE_ENV = "production";
    await assert.rejects(scanBuffer(Buffer.from("test")), /disabled/);
    process.env.UPLOAD_SCAN_MODE = "unscanned";
    await scanBuffer(Buffer.from("test"));
  } finally {
    for (const [key, value] of [
      ["UPLOAD_SCAN_MODE", original.mode],
      ["NODE_ENV", original.node],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
