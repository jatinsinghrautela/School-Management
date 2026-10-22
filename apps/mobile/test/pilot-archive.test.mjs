import test from "node:test";
import assert from "node:assert/strict";
import { archiveProblems } from "../scripts/pilot-archive-check.mjs";
test("pilot archive scanner detects local records, metadata and signing material without rejecting example configuration", () => {
  const blocked = [
    ".git/config",
    ".GIT/HEAD",
    "apps\\api\\data\\student.json",
    "apps/mobile/.pilot/report.json",
    "apps/api/data/schools.json",
    "apps/mobile/.env",
    "apps/mobile/.env.local",
    "apps/mobile/credentials.json",
    "apps/mobile/key.jks",
    "apps/mobile/uploads/file.pdf",
    "node_modules/package.json",
  ];
  assert.deepEqual(archiveProblems(blocked), blocked);
  assert.deepEqual(
    archiveProblems([
      "apps/mobile/.env.example",
      "apps/mobile/app.json",
      "apps/mobile/package-lock.json",
      "docs/MOBILE-BUILD-GUIDE.md",
    ]),
    [],
  );
});
