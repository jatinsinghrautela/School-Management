import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
test("calendar validates dates and holidays, isolates school/class/audience and retains audited cancellations", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const call = async (path, token, body, status = 200) => {
    const r = await fetch(
      `http://127.0.0.1:${server.address().port}/api${path}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    const json = await r.json();
    assert.equal(r.status, status, JSON.stringify(json));
    return json;
  };
  try {
    const login = async (email) =>
      (
        await call("/auth/login", null, {
          email: `${email}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).token;
    const principal = await login("principal"),
      student = await login("student"),
      teacher = await login("teacher");
    const path = "/schools/school-north/calendar";
    const base = {
      title: "Campus festival",
      startDate: "2026-10-15",
      endDate: "2026-10-16",
      kind: "event",
      audience: "all",
      classId: null,
    };
    await call(path, student, base, 403);
    await call("/schools/school-west/calendar", principal, base, 403);
    await call(path, principal, { ...base, startDate: "2026-02-30" }, 400);
    await call(path, principal, { ...base, endDate: "2026-10-14" }, 400);
    await call(
      path,
      principal,
      { ...base, kind: "holiday", audience: "teacher" },
      400,
    );
    await call(path, principal, { ...base, classId: "school-west-10" }, 400);
    const all = await call(
      path,
      principal,
      { ...base, schoolId: "school-west" },
      201,
    );
    assert.equal(all.schoolId, "school-north");
    const teacherOnly = await call(
      path,
      principal,
      { ...base, title: "Teacher planning", audience: "teacher" },
      201,
    );
    const otherClass = await call(
      path,
      principal,
      { ...base, title: "Grade 9 outing", classId: "school-north-9" },
      201,
    );
    const assigned = await call(
      path,
      principal,
      { ...base, title: "Grade 10 event", classId: "school-north-10" },
      201,
    );
    const holiday = await call(
      path,
      principal,
      { ...base, title: "School holiday", kind: "holiday" },
      201,
    );
    const studentEntries = (
      await call("/schools/school-north/workspace", student)
    ).calendar;
    assert.deepEqual(
      new Set(studentEntries.map((e) => e.id)),
      new Set([all.id, assigned.id, holiday.id]),
    );
    const teacherEntries = (
      await call("/schools/school-north/workspace", teacher)
    ).calendar;
    assert.ok(teacherEntries.some((e) => e.id === teacherOnly.id));
    assert.ok(!teacherEntries.some((e) => e.id === otherClass.id));
    await call(path, principal, {
      ...base,
      entryId: all.id,
      title: "Updated festival",
    });
    await call(`${path}/${all.id}/cancel`, principal, { reason: "x" }, 400);
    await call(`${path}/${all.id}/cancel`, principal, {
      reason: "Venue unavailable",
    });
    assert.ok(
      !(await call("/schools/school-north/workspace", student)).calendar.some(
        (e) => e.id === all.id,
      ),
    );
    const retained = (
      await call("/schools/school-north/workspace", principal)
    ).calendar.find((e) => e.id === all.id);
    assert.equal(retained.cancelled, true);
    assert.equal(retained.cancellationReason, "Venue unavailable");
    await call(path, principal, { ...base, entryId: all.id }, 404);
    await call(
      `${path}/${all.id}/cancel`,
      principal,
      { reason: "Another cancellation" },
      404,
    );
    assert.ok(
      (await store.all("audit")).some(
        (a) => a.action === "calendar.cancelled" && a.entryId === all.id,
      ),
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
