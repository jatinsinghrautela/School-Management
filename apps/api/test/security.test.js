import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
test("durable token adapter survives app restart, onboarding gate and access edits revoke sessions", async () => {
  const store = await createStore("demo");
  await seed(store);
  let server = createApp(store).listen(0, "127.0.0.1");
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
    const result = await r.json();
    assert.equal(r.status, status, JSON.stringify(result));
    return result;
  };
  try {
    const owner = await call("/auth/login", null, {
      email: "owner@orbit.local",
      password: "OrbitDemo123!",
    });
    await new Promise((r) => server.close(r));
    server = createApp(store).listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    await call("/platform", owner.token);
    const target = await call(
      "/users",
      owner.token,
      {
        name: "New staff",
        email: "setup@test.local",
        password: "Temporary123!",
        role: "staff",
        orgId: "org-demo",
        schoolIds: ["school-north"],
        classIds: [],
      },
      201,
    );
    const first = await call("/auth/login", null, {
      email: target.email,
      password: "Temporary123!",
    });
    assert.equal(first.user.passwordChangeRequired, true);
    await call("/schools/school-north/workspace", first.token, null, 403);
    await call(
      "/auth/change-password",
      first.token,
      { currentPassword: "Wrong123456!", password: "PersonalNew123!" },
      400,
    );
    await call("/auth/change-password", first.token, {
      currentPassword: "Temporary123!",
      password: "PersonalNew123!",
    });
    await call("/me", first.token, null, 401);
    const fresh = await call("/auth/login", null, {
      email: target.email,
      password: "PersonalNew123!",
    });
    assert.equal(fresh.user.passwordChangeRequired, false);
    await call("/schools/school-north/workspace", fresh.token);
    await call(
      `/users/${target.id}/access`,
      fresh.token,
      { role: "principal", schoolIds: ["school-north"], classIds: [] },
      403,
    );
    await call(`/users/${target.id}/access`, owner.token, {
      role: "student",
      schoolIds: ["school-north"],
      classIds: ["school-north-10"],
    });
    await call("/me", fresh.token, null, 401);
    const student = await call("/auth/login", null, {
      email: target.email,
      password: "PersonalNew123!",
    });
    assert.equal(student.user.role, "student");
    const principal = await call("/auth/login", null, {
      email: "principal@orbit.local",
      password: "OrbitDemo123!",
    });
    await call(
      `/users/${target.id}/access`,
      principal.token,
      { role: "director", schoolIds: ["school-north"], classIds: [] },
      403,
    );
    await call(
      "/users/user-teacher/access",
      owner.token,
      { role: "staff", schoolIds: ["school-north"], classIds: [] },
      409,
    );
    const reset = await call(`/users/${target.id}/recovery`, owner.token, {});
    await new Promise((r) => server.close(r));
    server = createApp(store).listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const responses = await Promise.all(
      [0, 1].map(async () => {
        const r = await fetch(
          `http://127.0.0.1:${server.address().port}/api/auth/reset-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: reset.token,
              password: "RecoveredNew123!",
            }),
          },
        );
        return r.status;
      }),
    );
    assert.deepEqual(responses.sort(), [200, 400]);
    await call("/me", student.token, null, 401);
    const login = await call("/auth/login", null, {
      email: target.email,
      password: "RecoveredNew123!",
    });
    await call("/auth/logout", login.token, {});
    await call("/me", login.token, null, 401);
    const stored = JSON.stringify(await store.all("securityTokens"));
    assert.ok(!stored.includes(owner.token));
    assert.ok(!stored.includes(reset.token));
  } finally {
    await new Promise((r) => server.close(r));
  }
});
