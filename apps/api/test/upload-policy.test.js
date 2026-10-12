import { test } from "node:test";
import assert from "node:assert/strict";
import { uploadPolicy, scanBuffer } from "../src/upload-security.js";
import { deploymentCheck } from "../src/deployment-config.js";
test("uploads require scanning by default and unscanned mode is local only", async () => {
  assert.equal(uploadPolicy({}).enabled, false);
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
