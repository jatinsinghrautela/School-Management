import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";

test("attendance corrections require independent leadership review, prevent bypass/duplicates, apply atomically and retain history", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, token, body) => {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json() };
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
    const raw = {
      classId: "school-north-10",
      date: "2026-10-08",
      studentId: "user-student",
      status: "absent",
    };
    const saved = await call(school + "/attendance", tokens.teacher, raw);
    assert.equal(saved.status, 200);
    const attendanceId = saved.data.id;
    const request = {
      attendanceId,
      requestedStatus: "present",
      reason: "Register entry needs correction",
    };
    const send = (body, role = "teacher") =>
      call(school + "/attendance-corrections", tokens[role], body);
    const review = (
      id,
      body = {
        decision: "approved",
        reason: "Verified against the class record",
      },
      role = "principal",
    ) =>
      call(school + `/attendance-corrections/${id}/review`, tokens[role], body);
    assert.equal((await send(request, "student")).status, 403);
    assert.equal((await send({ ...request, reason: "bad" })).status, 400);
    assert.equal(
      (await send({ ...request, requestedStatus: "absent" })).status,
      400,
    );
    assert.equal(
      (await send({ ...request, attendanceId: "missing" })).status,
      404,
    );
    const pending = await send({
      ...request,
      schoolId: "school-west",
      requestedBy: "user-principal",
      status: "approved",
    });
    assert.equal(pending.status, 201);
    assert.equal(pending.data.status, "pending");
    assert.equal(pending.data.schoolId, "school-north");
    assert.equal(pending.data.requestedBy, "user-teacher");
    assert.equal((await send(request)).status, 409);
    assert.equal((await send(request, "principal")).status, 409);
    for (const role of ["teacher", "principal"]) {
      assert.equal(
        (
          await call(school + "/attendance", tokens[role], {
            ...raw,
            status: "present",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await call(school + "/attendance/batch", tokens[role], {
            classId: raw.classId,
            date: raw.date,
            entries: [{ studentId: raw.studentId, status: "present" }],
          })
        ).status,
        409,
      );
    }
    // Saving the same status stays idempotent and does not invalidate a pending review.
    assert.deepEqual(
      (await call(school + "/attendance", tokens.teacher, raw)).data,
      saved.data,
    );
    await store.put("users", {
      ...(await store.all("users")).find((u) => u.id === "user-student"),
      id: "second-student",
      email: "second@demo.local",
    });
    assert.equal(
      (
        await call(school + "/attendance/batch", tokens.teacher, {
          classId: raw.classId,
          date: raw.date,
          entries: [
            { studentId: "second-student", status: "present" },
            { studentId: raw.studentId, status: "present" },
          ],
        })
      ).status,
      409,
    );
    assert.equal((await store.all("attendance")).length, 1);
    assert.equal(
      (await review(pending.data.id, undefined, "teacher")).status,
      403,
    );
    assert.equal(
      (
        await call(
          `/schools/school-west/attendance-corrections/${pending.data.id}/review`,
          tokens.director,
          { decision: "approved", reason: "Wrong school attempt" },
        )
      ).status,
      404,
    );
    assert.equal(
      (await review(pending.data.id, { decision: "approved", reason: "bad" }))
        .status,
      400,
    );
    const outcomes = await Promise.all([
      review(pending.data.id),
      review(pending.data.id, undefined, "director"),
    ]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await store.all("attendance"))[0].status, "present");
    assert.equal(
      (await store.all("attendance"))[0].lastCorrectionId,
      pending.data.id,
    );
    assert.equal(
      (await store.all("audit")).filter(
        (a) => a.action === "attendance.correction-approved",
      ).length,
      1,
    );
    assert.equal(
      (await call(school + "/workspace", tokens.student)).data
        .attendanceCorrections.length,
      0,
    );
    assert.equal(
      (await call(school + "/workspace", tokens.teacher)).data
        .attendanceCorrections[0].status,
      "approved",
    );
    const leader = await send(
      { ...request, requestedStatus: "late" },
      "principal",
    );
    assert.equal(leader.status, 201);
    assert.equal((await review(leader.data.id)).status, 403);
    assert.equal(
      (await call(school + "/workspace", tokens.teacher)).data
        .attendanceCorrections.length,
      1,
    );
    assert.equal(
      (
        await review(
          leader.data.id,
          {
            decision: "rejected",
            reason: "Evidence does not support the change",
          },
          "director",
        )
      ).status,
      200,
    );
    assert.equal((await store.all("attendance"))[0].status, "present");
    const stale = await send({ ...request, requestedStatus: "late" });
    await store.put("attendance", {
      ...(await store.all("attendance"))[0],
      updatedAt: "2020-01-01T00:00:00Z",
    });
    assert.equal((await review(stale.data.id)).status, 409);
    assert.equal(
      (
        await review(stale.data.id, {
          decision: "rejected",
          reason: "Record changed before review",
        })
      ).status,
      200,
    );
    const closed = await send({ ...request, requestedStatus: "late" });
    await call(school + "/calendar", tokens.principal, {
      title: "School closed",
      kind: "holiday",
      startDate: raw.date,
      endDate: raw.date,
    });
    assert.equal((await review(closed.data.id)).status, 409);
    assert.equal(
      (
        await review(closed.data.id, {
          decision: "rejected",
          reason: "Date is a school holiday",
        })
      ).status,
      200,
    );
    assert.equal(
      (await send({ ...request, requestedStatus: "late" })).status,
      409,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  }
});
