import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
test("timetable validates assignments, serializes conflicts and limits class visibility", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const call = async (path, token, body) => {
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
    return { status: r.status, data: await r.json() };
  };
  try {
    const login = async (role) =>
      (
        await call("/auth/login", null, {
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).data.token;
    const principal = await login("principal"),
      teacher = await login("teacher"),
      student = await login("student");
    const subject = (await store.all("subjects"))[0];
    const period = {
      classId: subject.classId,
      subjectId: subject.id,
      teacherId: subject.teacherIds[0],
      day: 1,
      start: "09:00",
      end: "09:45",
      room: "Room 1",
    };
    const path = "/schools/school-north/timetable";
    assert.equal((await call(path, teacher, period)).status, 403);
    assert.equal(
      (await call(path, principal, { ...period, end: "08:00" })).status,
      400,
    );
    assert.equal(
      (await call(path, principal, { ...period, teacherId: "user-student" }))
        .status,
      400,
    );
    const outcomes = await Promise.all([
      call(path, principal, period),
      call(path, principal, period),
    ]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [201, 409]);
    const entry = outcomes.find((r) => r.status === 201).data;
    const originalTeacher = (await store.all("users")).find(
      (u) => u.id === period.teacherId,
    );
    await store.put("users", {
      ...originalTeacher,
      classIds: [...originalTeacher.classIds, "school-north-9"],
    });
    await store.put("users", {
      ...originalTeacher,
      id: "teacher-second",
      classIds: ["school-north-9"],
    });
    await store.put("subjects", {
      ...subject,
      id: "subject-second-class",
      classId: "school-north-9",
      teacherIds: [originalTeacher.id, "teacher-second"],
    });
    const otherClass = {
      ...period,
      classId: "school-north-9",
      subjectId: "subject-second-class",
      room: "Room 2",
    };
    assert.equal((await call(path, principal, otherClass)).status, 409);
    assert.equal(
      (
        await call(path, principal, {
          ...otherClass,
          teacherId: "teacher-second",
          room: " room 1 ",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(path, principal, {
          ...otherClass,
          teacherId: "teacher-second",
        })
      ).status,
      201,
    );
    assert.equal(
      (await call(path, principal, { ...period, start: "09:45", end: "10:30" }))
        .status,
      201,
    );
    assert.equal(
      (await call("/schools/school-west/timetable", principal, period)).status,
      403,
    );
    const workspace = (await call("/schools/school-north/workspace", student))
      .data;
    assert.ok(workspace.timetable.some((e) => e.id === entry.id));
    await store.put("timetable", {
      ...entry,
      id: "other-class",
      classId: "school-north-9",
      day: 2,
    });
    assert.ok(
      !(
        await call("/schools/school-north/workspace", student)
      ).data.timetable.some((e) => e.id === "other-class"),
    );
    assert.equal(
      (
        await call(path, principal, {
          ...period,
          entryId: entry.id,
          start: "08:00",
          end: "08:45",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call(`${path}/${entry.id}/cancel`, principal, {})).status,
      200,
    );
    assert.equal(
      (await call(`${path}/${entry.id}/cancel`, principal, {})).status,
      404,
    );
    assert.ok(
      !(
        await call("/schools/school-north/workspace", student)
      ).data.timetable.some((e) => e.id === entry.id),
    );
    assert.ok(
      (await store.all("audit")).some(
        (a) => a.action === "timetable.cancelled",
      ),
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
