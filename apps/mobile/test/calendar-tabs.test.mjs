import { test } from "node:test";
import assert from "node:assert/strict";
import { monthDays, eventsOn, monthEvents } from "../src/core/calendar.ts";
import { tabForPath } from "../src/core/tabs.ts";
test("month calendar handles leap days, cross-month ranges and excludes cancelled or invalid events", () => {
  const cells = monthDays(2028, 1).filter(Boolean);
  assert.equal(cells.length, 29);
  assert.equal(cells.at(-1), "2028-02-29");
  const events = [
    {
      id: "a",
      kind: "holiday",
      startDate: "2026-10-30",
      endDate: "2026-11-02",
    },
    {
      id: "b",
      kind: "holiday",
      startDate: "2026-10-20",
      endDate: "2026-10-20",
      cancelled: true,
    },
    { id: "c", startDate: "invalid", endDate: "invalid" },
  ];
  assert.deepEqual(
    eventsOn(events, "2026-11-01").map((e) => e.id),
    ["a"],
  );
  assert.deepEqual(
    monthEvents(events, 2026, 10).map((e) => e.id),
    ["a"],
  );
  assert.deepEqual(eventsOn(events, "2026-10-20"), []);
});
test("service ownership follows its origin instead of moving every service into School day", () => {
  assert.equal(tabForPath("/service/section-library", "services"), "services");
  assert.equal(tabForPath("/service/record-attendance", "day"), "day");
  assert.equal(tabForPath("/service/active-sessions", "profile"), "profile");
  assert.equal(tabForPath("/service/calendar", "malformed"), "services");
  assert.equal(tabForPath("/school-day"), "day");
  assert.equal(tabForPath("/services", "day"), "services");
});
