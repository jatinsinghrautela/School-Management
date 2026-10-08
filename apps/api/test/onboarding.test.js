import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";

test("owner onboards an organization and principal; principal enrolls a student in an isolated school", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(path, token, body) {
    const res = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await res.json();
    assert.ok(res.ok, JSON.stringify(result));
    if (path === "/auth/login" && result.user.passwordChangeRequired) {
      await call("/auth/change-password", result.token, {
        currentPassword: body.password,
        password: body.password + "Personal!",
      });
      return call(path, null, {
        ...body,
        password: body.password + "Personal!",
      });
    }
    return result;
  }
  try {
    const owner = (
      await call("/auth/login", null, {
        email: "owner@orbit.local",
        password: "OrbitDemo123!",
      })
    ).token;
    const org = await call("/platform/organizations", owner, {
      name: "Isolated Test Organization",
    });
    const school = await call("/platform/schools", owner, {
      orgId: org.id,
      name: "Isolated School",
      city: "Delhi",
      code: "ISO",
    });
    await call("/users", owner, {
      name: "Test Principal",
      email: "new-principal@test.local",
      password: "NewSchoolTest123!",
      role: "principal",
      orgId: org.id,
      schoolIds: [school.id],
      classIds: [],
    });
    const principal = (
      await call("/auth/login", null, {
        email: "new-principal@test.local",
        password: "NewSchoolTest123!",
      })
    ).token;
    const cls = await call(`/schools/${school.id}/classes`, principal, {
      name: "Grade 8 · B",
    });
    const student = await call("/users", principal, {
      name: "New Student",
      email: "new-student@test.local",
      password: "NewSchoolTest123!",
      role: "student",
      orgId: org.id,
      schoolIds: [school.id],
      classIds: [cls.id],
    });
    const session = await call("/auth/login", null, {
      email: "new-student@test.local",
      password: "NewSchoolTest123!",
    });
    assert.deepEqual(
      (await call("/me", session.token)).schools.map((s) => s.id),
      [school.id],
    );
    const workspace = await call(
      `/schools/${school.id}/workspace`,
      session.token,
    );
    assert.deepEqual(
      workspace.classes.map((c) => c.id),
      [cls.id],
    );
    assert.deepEqual(
      workspace.users.map((u) => u.id),
      [student.id],
    );
    const denied = await fetch(base + "/schools/school-north/workspace", {
      headers: { Authorization: `Bearer ${principal}` },
    });
    assert.equal(denied.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
  }
});
