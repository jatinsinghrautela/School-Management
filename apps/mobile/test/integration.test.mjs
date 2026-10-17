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
    const other = await api.login("principal@orbit.local", "OrbitDemo123!");
    const foreign = await api.login("teacher@orbit.local", "OrbitDemo123!");
    const sessions = (await session.activeSessions()).sessions;
    assert.equal(sessions.length, 2);
    assert.equal(sessions.filter((s) => s.current).length, 1);
    assert.ok(sessions.every((s) => !("token" in s)));
    assert.equal((await session.revokeOtherSessions()).count, 1);
    await assert.rejects(api.me(other.token), (e) => e.status === 401);
    assert.equal((await api.me(foreign.token)).user.role, "teacher");
    assert.equal((await session.activeSessions()).sessions.length, 1);
    await api.logout(foreign.token);
    const pupil = (await store.all("users")).find(
      (u) => u.email === "student@orbit.local",
    );
    const second = { ...pupil, id: "batch-pupil", email: "batch@orbit.local" };
    await store.put("users", second);
    const batch = {
      classId: pupil.classIds[0],
      date: "2026-10-19",
      entries: [
        { studentId: pupil.id, status: "present" },
        { studentId: second.id, status: "absent" },
      ],
    };
    await assert.rejects(
      session.school("/attendance/batch", {
        ...batch,
        entries: [batch.entries[0], { studentId: "foreign", status: "absent" }],
      }),
      (e) => e.status === 400,
    );
    assert.equal(
      (await store.all("attendance")).filter((r) => r.date === batch.date)
        .length,
      0,
    );
    assert.equal((await session.school("/attendance/batch", batch)).saved, 2);
    await session.school("/attendance/batch", batch);
    assert.equal(
      (await store.all("attendance")).filter((r) => r.date === batch.date)
        .length,
      2,
    );
    await assert.rejects(
      session.school("/attendance/batch", {
        ...batch,
        entries: batch.entries.map((e) => ({ ...e, status: "late" })),
      }),
      (e) => e.status === 409,
    );
    assert.equal(
      (await store.all("attendance")).find((r) => r.studentId === second.id)
        .status,
      "absent",
    );
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
    await assert.rejects(session.activeSessions(), /password change/);
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
