import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
test("homework preserves attempts and reviews, enforces own/class scope and records lateness", async () => {
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
    const data = await r.json();
    assert.equal(r.status, status, JSON.stringify(data));
    return data;
  };
  try {
    const login = async (role) =>
      (
        await call("/auth/login", null, {
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).token;
    const student = await login("student"),
      teacher = await login("teacher"),
      principal = await login("principal");
    const homework = (await store.all("resources")).find(
      (r) => r.type === "homework",
    );
    await store.put("resources", { ...homework, dueDate: "2000-01-01" });
    const path = `/schools/school-north/homework/${homework.id}/submit`;
    await call(path, teacher, { answer: "Forbidden" }, 403);
    await call(path, student, { answer: " " }, 400);
    const first = await call(
      path,
      student,
      { answer: "My first answer", studentId: "injected", classId: "other" },
      201,
    );
    assert.equal(first.studentId, "user-student");
    assert.equal(first.late, true);
    await call(
      `/schools/school-west/homework/${homework.id}/submit`,
      student,
      { answer: "cross-school" },
      403,
    );
    const review = (s) =>
      `/schools/school-north/homework/submissions/${s.id}/review`;
    await call(
      review(first),
      student,
      { feedback: "Self grade", status: "reviewed" },
      403,
    );
    await call(review(first), teacher, {
      feedback: "Good work",
      status: "reviewed",
    });
    await call(path, student, { answer: "Unauthorized revision" }, 409);
    await call(review(first), teacher, {
      feedback: "Please expand your explanation",
      status: "revision-requested",
    });
    const second = await call(
      path,
      student,
      { answer: "Expanded answer" },
      201,
    );
    assert.equal(second.version, 2);
    await call(
      review(first),
      teacher,
      { feedback: "Outdated", status: "reviewed" },
      409,
    );
    assert.equal(
      (await store.all("submissions")).find((s) => s.id === first.id).reviews
        .length,
      2,
    );
    const outsider = {
      ...first,
      id: "other-student-attempt",
      studentId: "other-student",
    };
    await store.put("submissions", outsider);
    const own = (await call("/schools/school-north/workspace", student))
      .submissions;
    assert.ok(own.every((s) => s.studentId === "user-student"));
    await store.put("resources", {
      ...homework,
      id: "other-class-homework",
      classId: "school-north-9",
    });
    await call(
      "/schools/school-north/homework/other-class-homework/submit",
      student,
      { answer: "Other class" },
      404,
    );
    await store.put("submissions", {
      ...first,
      id: "other-class-submission",
      classId: "school-north-9",
    });
    await call(
      "/schools/school-north/homework/submissions/other-class-submission/review",
      teacher,
      { feedback: "Other class", status: "reviewed" },
      404,
    );
    await call(review(second), principal, {
      feedback: "Checked by school management",
      status: "reviewed",
    });
    assert.ok(
      (await store.all("audit")).some((a) => a.action === "homework.reviewed"),
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
