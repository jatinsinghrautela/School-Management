import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";

test("independent schools remain isolated and support sessions preserve role gates and owner attribution", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  async function call(path, token, body, status = 200) {
    const res = await fetch(
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
    const data = await res.json();
    assert.equal(res.status, status, JSON.stringify(data));
    return data;
  }
  try {
    const owner = await call("/auth/login", null, {
      email: "owner@orbit.local",
      password: "OrbitDemo123!",
    });
    const a = await call(
      "/platform/schools",
      owner.token,
      { name: "Independent A", city: "Pune", code: "INA" },
      201,
    );
    const b = await call(
      "/platform/schools",
      owner.token,
      { name: "Independent B", city: "Pune", code: "INB", orgId: "" },
      201,
    );
    assert.equal(a.orgId, null);
    assert.equal(b.orgId, null);
    await call(
      "/platform/schools",
      owner.token,
      { name: "Invalid", city: "Pune", code: "BAD", orgId: "missing" },
      400,
    );
    const details = {
      name: "Independent Principal",
      email: "independent@test.local",
      password: "Independent123!",
      role: "principal",
      schoolIds: [a.id],
      classIds: [],
    };
    const principal = await call("/users", owner.token, details, 201);
    await call(
      "/users",
      owner.token,
      { ...details, email: "multi@test.local", schoolIds: [a.id, b.id] },
      400,
    );
    const login = await call("/auth/login", null, {
      email: details.email,
      password: details.password,
    });
    assert.deepEqual(
      (await call("/me", login.token)).schools.map((s) => s.id),
      [a.id],
    );
    await call(`/schools/${b.id}/workspace`, login.token, null, 403);
    const c = await call(
      `/schools/${a.id}/classes`,
      login.token,
      { name: "Grade 1" },
      201,
    );
    const student = await call(
      "/users",
      login.token,
      {
        name: "Independent Student",
        email: "ind-student@test.local",
        password: "Independent123!",
        role: "student",
        schoolIds: [a.id],
        classIds: [c.id],
      },
      201,
    );
    await call(`/users/${student.id}/recovery`, login.token, {});
    await call(
      "/platform/support",
      login.token,
      {
        userId: student.id,
        reason: "Reproduce missing notice",
        acknowledge: true,
      },
      403,
    );
    await call(
      "/platform/support",
      owner.token,
      { userId: principal.id, reason: "short", acknowledge: true },
      400,
    );
    await call(
      "/platform/support",
      owner.token,
      {
        userId: owner.user.id,
        reason: "Reproduce owner issue",
        acknowledge: true,
      },
      400,
    );
    const support = await call("/platform/support", owner.token, {
      userId: principal.id,
      reason: "Ticket 101 notice publishing issue",
      acknowledge: true,
    });
    assert.equal(
      (await call("/me", support.token)).support.ownerId,
      owner.user.id,
    );
    await call("/platform", support.token, null, 403);
    await call(`/schools/${b.id}/workspace`, support.token, null, 403);
    await call(
      `/schools/${a.id}/notices`,
      support.token,
      {
        title: "Support test",
        body: "Reproduction",
        audience: "all",
        classId: null,
      },
      201,
    );
    await call(`/users/${student.id}/recovery`, support.token, {}, 403);
    const audit = await store.all("audit");
    assert.ok(
      audit.some(
        (r) =>
          r.action === "support.request" &&
          r.actorId === owner.user.id &&
          r.targetUserId === principal.id,
      ),
    );
    await call("/support/end", support.token, {});
    await call("/me", support.token, null, 401);
    await call("/me", owner.token);
    const ss = await call("/platform/support", owner.token, {
      userId: student.id,
      reason: "Reproduce student notice issue",
      acknowledge: true,
    });
    await call(
      `/schools/${a.id}/notices`,
      ss.token,
      { title: "Forbidden", body: "test", audience: "all" },
      403,
    );
    await call(
      `/users/${principal.id}/status`,
      login.token,
      { active: false },
      403,
    );
    await call(
      `/users/${student.id}/status`,
      support.token,
      { active: false },
      401,
    );
    await call(`/users/${student.id}/status`, login.token, { active: false });
    await call("/me", ss.token, null, 401);
    await call(
      "/auth/login",
      null,
      { email: "ind-student@test.local", password: "Independent123!" },
      401,
    );
    await call(`/users/${student.id}/recovery`, login.token, {}, 400);
    await call(`/users/${student.id}/status`, login.token, { active: true });
    await call("/auth/login", null, {
      email: "ind-student@test.local",
      password: "Independent123!",
    });
    await call(
      `/users/${owner.user.id}/status`,
      login.token,
      { active: false },
      403,
    );
    const other = await call("/auth/login", null, {
      email: "student@orbit.local",
      password: "OrbitDemo123!",
    });
    await call(
      `/users/${other.user.id}/status`,
      login.token,
      { active: false },
      403,
    );
    assert.ok(
      (await store.all("audit")).some(
        (r) => r.action === "user.suspended" && r.targetUserId === student.id,
      ),
    );
    const replacement = await call("/platform/support", owner.token, {
      userId: student.id,
      reason: "Verify parent session revocation",
      acknowledge: true,
    });
    await call("/auth/logout", owner.token, {});
    await call("/me", replacement.token, null, 401);
    await call("/me", ss.token, null, 401);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
