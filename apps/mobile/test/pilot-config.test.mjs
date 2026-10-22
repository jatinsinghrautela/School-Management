import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePilotConfig } from "../scripts/pilot-config.mjs";
const app = JSON.parse(await readFile(new URL("../app.json", import.meta.url)));
const eas = JSON.parse(await readFile(new URL("../eas.json", import.meta.url)));
test("pilot config allows a standalone HTTPS APK without pretending the Expo project is linked", () => {
  const unlinked = structuredClone(app);
  if (unlinked.expo.extra?.eas) delete unlinked.expo.extra.eas.projectId;
  const result = validatePilotConfig(unlinked, eas);
  assert.deepEqual(result.errors, []);
  assert.equal(result.projectIdConfigured, false);
});
test("pilot validation rejects credential-bearing/HTTP endpoints, public secrets and Metro-dependent builds", () => {
  for (const url of [
    "http://localhost:4100",
    "https://user:secret@example.com",
    "https://example.com/?token=secret",
    "https://example.com/files",
  ]) {
    const changed = structuredClone(eas);
    changed.build.preview.env.EXPO_PUBLIC_API_URL = url;
    assert.ok(validatePilotConfig(app, changed).errors.length);
  }
  assert.ok(
    validatePilotConfig(app, eas, {
      EXPO_PUBLIC_MYSQL_PASSWORD: "never-print-this",
    }).errors.length,
  );
  const changed = structuredClone(eas);
  changed.build.preview.developmentClient = true;
  assert.ok(validatePilotConfig(app, changed).errors.length);
});
