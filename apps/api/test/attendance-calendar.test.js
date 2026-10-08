import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";

test("attendance respects active school holidays on both write paths, retains history and restores eligibility after cancellation", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, token, body) => {
    const response = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  };
  try {
    const tokens = {};
    for (const role of ["principal", "teacher", "student", "director"])
      tokens[role] = (
        await call("/auth/login", null, {
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).data.token;
    const school = "/schools/school-north";
    const record = {
      classId: "school-north-10",
      date: "2026-10-08",
      studentId: "user-student",
      status: "present",
    };
    const batch = (date) => ({
      classId: record.classId,
      date,
      entries: [{ studentId: record.studentId, status: "absent" }],
    });
    assert.equal(
      (await call(school + "/attendance", tokens.teacher, record)).status,
      200,
    );
    const holiday = await call(school + "/calendar", tokens.principal, {
      title: "School closure",
      kind: "holiday",
      startDate: "2026-10-08",
      endDate: "2026-10-10",
    });
    assert.equal(holiday.status, 201);
    const auditCount = (await store.all("audit")).length;
    for (const role of ["teacher", "principal"])
      for (const date of ["2026-10-08", "2026-10-09", "2026-10-10"]) {
        const one = await call(school + "/attendance", tokens[role], {
          ...record,
          date,
          status: "absent",
        });
        assert.equal(one.status, 409);
        assert.match(one.data.error, /School closure/);
        assert.equal(
          (await call(school + "/attendance/batch", tokens[role], batch(date)))
            .status,
          409,
        );
      }
    assert.equal((await store.all("attendance")).length, 1);
    assert.equal((await store.all("attendance"))[0].status, "present");
    assert.equal((await store.all("audit")).length, auditCount);
    for (const role of ["student", "teacher", "principal"]) {
      const workspace = await call(school + "/workspace", tokens[role]);
      assert.equal(workspace.data.attendance[0].excludedFromAttendance, true);
      assert.deepEqual(workspace.data.attendance[0].holidayTitles, [
        "School closure",
      ]);
    }
    // Dates outside the inclusive range, events and another school's holidays stay open.
    await call(school + "/calendar", tokens.principal, {
      title: "Class event",
      startDate: "2026-10-11",
      endDate: "2026-10-11",
    });
    await call("/schools/school-west/calendar", tokens.director, {
      title: "Other school closure",
      kind: "holiday",
      startDate: "2026-10-11",
      endDate: "2026-10-11",
    });
    for (const date of ["2026-10-07", "2026-10-11"])
      assert.equal(
        (await call(school + "/attendance/batch", tokens.teacher, batch(date)))
          .status,
        200,
      );
    assert.equal(
      (
        await call(
          school + "/attendance/batch",
          tokens.student,
          batch("2026-10-11"),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          school + "/calendar/" + holiday.data.id + "/cancel",
          tokens.principal,
          { reason: "School reopened after review" },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(school + "/attendance/batch", tokens.teacher, {
          ...batch("2026-10-08"),
          entries: [{ studentId: record.studentId, status: "present" }],
        })
      ).status,
      200,
    );
    const restored = (
      await call(school + "/workspace", tokens.student)
    ).data.attendance.find((r) => r.date === record.date);
    assert.equal(restored.excludedFromAttendance, false);
    assert.deepEqual(restored.holidayTitles, []);
    // Imported closures have the same guard; no hidden weekend defaults are inferred.
    await store.put("calendar", {
      id: "imported-holiday",
      schoolId: "school-north",
      source: "year-calendar-excel",
      kind: "holiday",
      audience: "all",
      startDate: "2026-10-18",
      endDate: "2026-10-18",
      title: "Sunday",
    });
    assert.equal(
      (
        await call(
          school + "/attendance/batch",
          tokens.teacher,
          batch("2026-10-18"),
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(school + "/attendance", tokens.teacher, {
          ...record,
          date: "2026-02-30",
        })
      ).status,
      400,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  }
});
