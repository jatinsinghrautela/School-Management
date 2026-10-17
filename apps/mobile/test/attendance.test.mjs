import { test } from "node:test";
import assert from "node:assert/strict";
import { attendanceRoster } from "../src/core/attendance.ts";
import { localDate, parseDate } from "../src/core/dates.ts";
test("calendar dates use local components and validate leap days without UTC conversion", () => {
  assert.equal(localDate(new Date(2026, 9, 17, 23)), "2026-10-17");
  assert.ok(parseDate("2028-02-29"));
  assert.equal(parseDate("2026-02-29"), null);
  assert.equal(parseDate("2026-04-31"), null);
  assert.equal(parseDate("2026-13-01"), null);
  assert.equal(parseDate(""), null);
});
test("class attendance keeps other classes, dates and sessions out; existing entries are locked", () => {
  const users = [
    { id: "a", name: "Arjun", role: "student", classIds: ["c"] },
    { id: "b", name: "Diya", role: "student", classIds: ["c"] },
    { id: "x", role: "student", classIds: ["other"] },
    { id: "t", role: "teacher", classIds: ["c"] },
  ];
  const records = [
    {
      id: "r",
      classId: "c",
      studentId: "a",
      date: "2026-10-19",
      sessionId: null,
      status: "late",
    },
    {
      id: "s",
      classId: "c",
      studentId: "b",
      date: "2026-10-19",
      sessionId: "morning",
      status: "absent",
    },
  ];
  const daily = attendanceRoster(users, records, "c", "2026-10-19", "");
  assert.deepEqual(
    daily.map((r) => [r.id, r.locked, r.status]),
    [
      ["a", true, "late"],
      ["b", false, ""],
    ],
  );
  assert.deepEqual(
    attendanceRoster(users, records, "c", "2026-10-20", "").map(
      (r) => r.status,
    ),
    ["", ""],
  );
  assert.equal(
    attendanceRoster(users, records, "c", "2026-10-19", "morning")[1].status,
    "absent",
  );
});
