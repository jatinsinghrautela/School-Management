import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../../api/src/store.js";
import { seed } from "../../api/src/seed.js";
import { createApp } from "../../api/src/app.js";
import { createApi } from "../src/core/api.ts";
import { Session } from "../src/core/session.ts";
test("mobile client uses existing bearer API, school boundaries, mandatory password change and session revocation", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store, {
    mailer: null,
    scanner: async () => {},
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const api = createApi(`http://127.0.0.1:${server.address().port}/api`);
    let saved = null;
    const session = new Session(
      api,
      {
        read: async () => saved,
        write: async (t) => {
          saved = t;
        },
        clear: async () => {
          saved = null;
        },
      },
      () => {},
    );
    await session.login("principal@orbit.local", "OrbitDemo123!");
    assert.equal(session.state.status, "ready");
    assert.equal(session.state.workspace.school.id, "school-north");
    const old = saved;
    await session.logout();
    assert.equal(saved, null);
    await assert.rejects(api.me(old), (e) => e.status === 401);
    const student = (await store.all("users")).find(
      (u) => u.email === "student@orbit.local",
    );
    await store.put("users", { ...student, passwordChangeRequired: true });
    await session.login("student@orbit.local", "OrbitDemo123!");
    assert.equal(session.state.identity.user.passwordChangeRequired, true);
    assert.equal(session.state.workspace, null);
    await assert.rejects(
      api.workspace(saved, "school-north"),
      (e) => e.status === 403,
    );
    await session.changePassword("OrbitDemo123!", "MobileDemoNew123!");
    assert.equal(saved, null);
    await session.login("student@orbit.local", "MobileDemoNew123!");
    assert.equal(session.state.identity.user.passwordChangeRequired, false);
    await assert.rejects(
      api.workspace(saved, "school-west"),
      (e) => e.status === 403,
    );
    assert.ok(session.state.workspace.users?.every((u) => u.id === student.id));
    await session.logout();
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
