import { test } from "node:test";
import assert from "node:assert/strict";
import { featuresFor } from "../src/core/features.ts";
test("feature discovery keeps website-only leadership tools visible without advertising them to students", () => {
  const principal = featuresFor("principal"), student = featuresFor("student"), teacher = featuresFor("teacher");
  assert.ok(principal.find((f) => f.label === "Yearly fee planning" && !f.screen && f.reason));
  assert.ok(principal.find((f) => f.label === "People imports & access" && !f.screen));
  assert.ok(!student.some((f) => f.label === "Yearly fee planning" || f.label === "Publish notices"));
  assert.ok(teacher.find((f) => f.label === "Publish notices" && f.screen === "work"));
  assert.ok(teacher.find((f) => f.label === "Spreadsheet exports" && !f.screen));
  assert.ok(student.find((f) => f.label === "Homework & resources" && f.section === "learning"));
  for (const role of ["owner", "director", "principal", "admin", "teacher", "staff", "student", "parent"]) {
    const list = featuresFor(role);
    assert.equal(new Set(list.map((f) => f.label)).size, list.length);
    assert.ok(list.every((f) => f.screen || f.reason));
    if (role === "owner") assert.ok(list.every((f) => !f.screen || f.screen === "settings"));
  }
});
