import { test } from "node:test";
import assert from "node:assert/strict";
import { featuresFor, sidebarFeatures, allFeatures, featureId } from "../src/core/features.ts";
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


test("Services mirrors website sidebar categories and assigns distinct paths to each category and action", () => {
  assert.deepEqual(sidebarFeatures("owner").map((f) => f.label), ["Overview", "Schools", "People", "Security"]);
  assert.deepEqual(sidebarFeatures("parent").map((f) => f.label), ["Family", "Library", "Transport", "Operations", "Inbox", "Gallery", "Security"]);
  assert.deepEqual(sidebarFeatures("principal").map((f) => f.label), ["Overview", "People", "Fees", "Staff", "Academics", "Attendance", "Timetable", "Calendar", "Results", "Learning", "Notices", "Library", "Transport", "Operations", "Inbox", "Gallery", "Family", "Settings", "Security"]);
  for (const role of ["owner", "principal", "director", "admin", "teacher", "staff", "student", "parent"]) {
    const paths = allFeatures(role).map(featureId);
    assert.equal(paths.length, new Set(paths).size);
    assert.ok(!allFeatures(role).some((f) => f.screen === "work" && role === "student"));
  }
});
