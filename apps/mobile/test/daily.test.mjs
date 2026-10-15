import { createApi } from "../src/core/api.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  artifactName,
  attendanceSummary,
  money,
  webUrl,
} from "../src/core/daily.ts";
test("attendance counts recorded sessions and excludes holidays without inventing absences", () => {
  assert.deepEqual(
    attendanceSummary([
      { id: "a", status: "present" },
      { id: "b", status: "late" },
      { id: "c", status: "absent" },
      { id: "d", status: "present", excludedFromAttendance: true },
    ]),
    { total: 3, present: 2, excluded: 1 },
  );
});
test("money uses minor units; links and filenames cannot inject a different URL scheme or path", () => {
  assert.match(money(12345, "INR"), /123\.45/);
  assert.throws(() => webUrl("javascript:alert(1)"));
  assert.throws(() => webUrl("https://user:secret@example.test"));
  assert.equal(
    webUrl("https://example.test/lesson"),
    "https://example.test/lesson",
  );
  assert.equal(artifactName("../../private.pdf"), "private.pdf");
});

test("school reads tolerate a cold start without extending write deadlines or retrying", async () => {
  let calls = 0;
  const api = createApi(
    "https://example.test/api",
    async (_, options) => {
      calls++;
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 25);
        options.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(Error("aborted"));
        });
      });
      return new Response(JSON.stringify({ items: [] }));
    },
    5,
    100,
  );
  await api.school("token", "school", "/inbox");
  await assert.rejects(
    api.school("token", "school", "/inbox/read", { id: "notice:demo" }),
    /too long/,
  );
  assert.equal(calls, 2);
});
