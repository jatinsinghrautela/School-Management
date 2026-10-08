import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
import { maintenance } from "../src/maintenance.js";
test("emailed recovery hides tokens, revokes failed delivery and email changes invalidate old links", async () => {
  const store = await createStore("demo");
  await seed(store);
  let shouldFail = false;
  const sent = [];
  const server = createApp(store, {
    mailer: async (u, token, invitation) => {
      sent.push({ userId: u.id, email: u.email, token, invitation });
      if (shouldFail) throw new Error("fixture SMTP unavailable");
    },
  }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(path, body, token) {
    const r = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  }
  try {
    const login = await call("/auth/login", {
      email: "principal@orbit.local",
      password: "OrbitDemo123!",
    });
    const principal = login.data.token;
    const mail = await call(
      "/users/user-student/recovery",
      { delivery: "email", invitation: true },
      principal,
    );
    assert.equal(mail.status, 200);
    assert.equal(mail.data.token, undefined);
    assert.equal(sent[0].invitation, true);
    assert.equal(sent[0].email, "student@orbit.local");
    shouldFail = true;
    assert.equal(
      (
        await call(
          "/users/user-student/recovery",
          { delivery: "email" },
          principal,
        )
      ).status,
      503,
    );
    assert.equal(
      (
        await call("/auth/reset-password", {
          token: sent[1].token,
          password: "NewFixturePass123!",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(
          "/users/user-student/profile",
          {
            name: "Student",
            email: "updated@test.local",
            emailReason: "Corrected school records",
          },
          principal,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call("/auth/reset-password", {
          token: sent[0].token,
          password: "NewFixturePass123!",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call("/auth/login", {
          email: "updated@test.local",
          password: "OrbitDemo123!",
        })
      ).status,
      200,
    );
    assert.ok(
      (await store.all("audit")).some(
        (a) => a.action === "user.recovery-email-failed",
      ),
    );
    await store.put("securityTokens", {
      id: "expired-fixture",
      userId: "user-student",
      type: "reset",
      tokenHash: "dead",
      expires: Date.now() - 8 * 86400000,
      revoked: true,
    });
    await store.put("peopleImports", {
      id: "expired-import",
      schoolId: "school-north",
      expiresAt: Date.now() - 2 * 86400000,
    });
    const cleanup = await maintenance(store);
    assert.equal(cleanup.removedTokens, 1);
    assert.equal(cleanup.removedPreviews, 1);
    assert.ok((await store.all("securityTokens")).length > 0);
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
