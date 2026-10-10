import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";

test("privacy exports are password-confirmed, school-scoped and exclude credentials, peers and unpublished results", async () => {
  const store = await createStore("demo");
  await seed(store);
  const users = await store.all("users"),
    student = users.find((u) => u.email === "student@orbit.local");
  await store.put("studentProfiles", {
    id: "private-profile",
    schoolId: "school-north",
    studentId: student.id,
    birthDate: "2010-01-01",
    address: "Synthetic address",
    internalSecret: "DO-NOT-EXPORT",
  });
  await store.put("attendance", {
    id: "my-day",
    schoolId: "school-north",
    studentId: student.id,
    date: "2026-10-01",
    status: "present",
  });
  await store.put("attendance", {
    id: "other-school",
    schoolId: "school-west",
    studentId: student.id,
    date: "2026-10-01",
    status: "absent",
  });
  await store.put("attendance", {
    id: "peer-day",
    schoolId: "school-north",
    studentId: "peer",
    date: "2026-10-01",
    status: "absent",
  });
  await store.put("exams", {
    id: "pub",
    schoolId: "school-north",
    status: "published",
    version: 2,
  });
  await store.put("exams", {
    id: "draft",
    schoolId: "school-north",
    status: "draft",
    version: 1,
  });
  for (const [id, examId, version] of [
    ["visible", "pub", 2],
    ["old", "pub", 1],
    ["hidden", "draft", 1],
  ])
    await store.put("reports", {
      id,
      schoolId: "school-north",
      studentId: student.id,
      examId,
      version,
      rows: [],
      internalSecret: "DO-NOT-EXPORT",
    });
  await store.put("feeCharges", {
    id: "own-charge",
    schoolId: "school-north",
    studentId: student.id,
    amountMinor: 10000,
    currency: "INR",
  });
  await store.put("feePayments", {
    id: "own-payment",
    schoolId: "school-north",
    chargeId: "own-charge",
    amountMinor: 2000,
  });
  await store.put("feePayments", {
    id: "peer-payment",
    schoolId: "school-north",
    chargeId: "other-charge",
    amountMinor: 9000,
  });
  const server = createApp(store, { mailer: null }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(path, token, body, expected = 200) {
    const res = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    assert.equal(res.status, expected, JSON.stringify(data));
    return data;
  }
  try {
    const login = async (role) =>
      (
        await call("/auth/login", null, {
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).token;
    const token = await login("student"),
      principal = await login("principal");
    const root = "/schools/school-north/privacy";
    await call(root, null, null, 401);
    await call("/schools/school-west/privacy", token, null, 403);
    await call(root + "/export", token, { currentPassword: "wrong" }, 403);
    const exported = await call(root + "/export", token, {
      currentPassword: "OrbitDemo123!",
      userId: "peer",
    });
    assert.equal(exported.account.id, student.id);
    assert.ok(exported.records.attendance.some((a) => a.id === "my-day"));
    assert.equal(
      exported.records.attendance.some((a) =>
        ["other-school", "peer-day"].includes(a.id),
      ),
      false,
    );
    assert.deepEqual(
      exported.records.reports.map((r) => r.id),
      ["visible"],
    );
    assert.deepEqual(
      exported.records.feePayments.map((r) => r.id),
      ["own-payment"],
    );
    assert.equal(exported.records.studentProfiles[0].birthDate, "2010-01-01");
    for (const forbidden of [
      "passwordHash",
      "tokenHash",
      "authVersion",
      "DO-NOT-EXPORT",
    ])
      assert.equal(JSON.stringify(exported).includes(forbidden), false);
    const policy = {
      contactEmail: "privacy@example.test",
      jurisdiction: "School-approved jurisdiction",
      notice: "Our synthetic school uses records for education.",
      retention: "School-approved retention with reviewed legal holds.",
      approved: true,
      version: 0,
    };
    await call(root + "/policy", token, policy, 403);
    await call(
      root + "/policy",
      principal,
      { ...policy, approved: false },
      400,
    );
    const published = await call(root + "/policy", principal, policy);
    assert.equal(published.policy.version, 1);
    await call(root + "/policy", principal, policy, 409);
    assert.equal((await call(root, token)).policy.notice, policy.notice);
    const request = {
      type: "deletion",
      details: "Please review deletion of my synthetic records",
      requestKey: randomUUID(),
    };
    const ticket = await call(root + "/requests", token, request);
    assert.equal(
      (await call(root + "/requests", token, request)).id,
      ticket.id,
    );
    await call(
      root + "/requests",
      token,
      { ...request, type: "correction" },
      409,
    );
    assert.equal((await call(root, principal)).requests.length, 1);
    assert.equal((await call(root, await login("teacher"))).requests.length, 0);
    await call(root + "/inventory", token, null, 403);
    const inventory = await call(root + "/inventory", principal);
    assert.ok(
      inventory.counts.some(
        (r) => r.collection === "studentProfiles" && r.count === 1,
      ),
    );
    await call(`/schools/school-north/tickets/${ticket.id}/status`, principal, {
      version: 1,
      status: "closed",
      reason: "Retention review required; records remain held",
    });
    assert.equal(
      (await store.all("studentProfiles", "school-north")).length,
      1,
    );
    assert.ok(
      (await store.all("audit")).some(
        (a) => a.action === "privacy.personal-export",
      ),
    );
    const owner = await login("owner");
    await call(
      root + "/export",
      owner,
      { currentPassword: "OrbitDemo123!" },
      403,
    );
    const support = await call("/platform/support", owner, {
      userId: student.id,
      reason: "Reproduce synthetic privacy access",
      acknowledge: true,
    });
    await call(
      root + "/export",
      support.token,
      { currentPassword: "OrbitDemo123!" },
      403,
    );
    await call(
      root + "/requests",
      support.token,
      { ...request, requestKey: randomUUID() },
      403,
    );
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
