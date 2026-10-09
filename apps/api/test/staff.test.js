import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createStore } from "../src/store.js";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
test("staff profiles and leave enforce privacy, independent decisions, tenancy and concurrent retry safety", async () => {
  const store = await createStore("demo");
  await seed(store);
  const teacher = (await store.all("users")).find(
    (u) => u.id === "user-teacher",
  );
  await store.put("users", {
    ...teacher,
    id: "user-staff",
    email: "staff@orbit.local",
    name: "Synthetic staff",
    role: "staff",
    classIds: [],
  });
  const server = createApp(store, { mailer: null }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
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
    const t = {};
    for (const role of [
      "teacher",
      "principal",
      "director",
      "student",
      "staff",
      "owner",
    ])
      t[role] = (
        await call("/auth/login", null, {
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).data.token;
    const p = "/schools/school-north";
    assert.equal((await call(p + "/staff-workspace", t.student)).status, 403);
    assert.equal((await call(p + "/staff-workspace", t.owner)).status, 403);
    const profile = {
      employeeNumber: "EMP-001",
      jobTitle: "Science teacher",
      department: "Science",
      joinDate: "2026-04-01",
    };
    assert.equal(
      (await call(p + "/staff-profiles/user-teacher", t.teacher, profile))
        .status,
      403,
    );
    assert.equal(
      (
        await call(p + "/staff-profiles/user-teacher", t.principal, {
          ...profile,
          joinDate: "2026-02-30",
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(p + "/staff-profiles/user-teacher", t.principal, profile))
        .status,
      200,
    );
    assert.equal(
      (await call(p + "/staff-profiles/user-staff", t.principal, profile))
        .status,
      409,
    );
    assert.equal(
      (
        await call(p + "/staff-profiles/user-student", t.principal, {
          ...profile,
          employeeNumber: "EMP-002",
        })
      ).status,
      404,
    );
    const own = await call(p + "/staff-workspace", t.teacher);
    assert.deepEqual(
      own.data.people.map((u) => u.id),
      ["user-teacher"],
    );
    assert.equal(own.data.profiles.length, 1);
    assert.equal(
      (await call(p + "/staff-workspace", t.staff)).data.profiles.length,
      0,
    );
    const body = {
      startDate: "2026-11-02",
      endDate: "2026-11-04",
      type: "personal",
      reason: "Family appointment",
      requestKey: randomUUID(),
    };
    assert.equal(
      (
        await call(p + "/leave-requests", t.teacher, {
          ...body,
          endDate: "2026-11-01",
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(p + "/leave-requests", t.student, body)).status,
      403,
    );
    const retry = await Promise.all([
      call(p + "/leave-requests", t.teacher, body),
      call(p + "/leave-requests", t.teacher, body),
    ]);
    assert.deepEqual(
      retry.map((r) => r.status),
      [201, 201],
    );
    assert.equal(retry[0].data.id, retry[1].data.id);
    assert.equal((await store.all("leaveRequests")).length, 1);
    assert.equal(
      (
        await call(p + "/leave-requests", t.teacher, {
          ...body,
          reason: "Different explanation",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(p + "/leave-requests", t.teacher, {
          ...body,
          requestKey: randomUUID(),
        })
      ).status,
      409,
    );
    const decision = p + `/leave-requests/${retry[0].data.id}/decision`;
    assert.equal(
      (
        await call(decision, t.teacher, {
          decision: "approved",
          reason: "I approve myself",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/schools/school-west" + decision.slice(p.length),
          t.director,
          { decision: "approved", reason: "Cross school review" },
        )
      ).status,
      404,
    );
    const race = await Promise.all([
      call(decision, t.principal, {
        decision: "approved",
        reason: "Cover has been arranged",
      }),
      call(decision, t.director, {
        decision: "rejected",
        reason: "Cover is unavailable",
      }),
    ]);
    assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
    let row = (await store.all("leaveRequests"))[0];
    assert.equal(row.history.length, 1);
    assert.equal(
      (await call(p + "/staff-workspace", t.staff)).data.requests.length,
      0,
    );
    if (row.status === "approved") {
      assert.equal(
        (
          await call(decision, t.teacher, {
            decision: "cancelled",
            reason: "Cancel my approved leave",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await call(decision, t.principal, {
            decision: "cancelled",
            reason: "Employee no longer needs leave",
          })
        ).status,
        200,
      );
    }
    const second = await call(p + "/leave-requests", t.teacher, {
      ...body,
      requestKey: randomUUID(),
    });
    assert.equal(second.status, 201);
    assert.equal(
      (
        await call(p + `/leave-requests/${second.data.id}/decision`, t.staff, {
          decision: "cancelled",
          reason: "Cancel someone else",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          p + `/leave-requests/${second.data.id}/decision`,
          t.teacher,
          { decision: "cancelled", reason: "No longer needed" },
        )
      ).status,
      200,
    );
    const principalLeave = await call(p + "/leave-requests", t.principal, {
      ...body,
      requestKey: randomUUID(),
    });
    assert.equal(
      (
        await call(
          p + `/leave-requests/${principalLeave.data.id}/decision`,
          t.principal,
          { decision: "approved", reason: "Approve my own leave" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          p + `/leave-requests/${principalLeave.data.id}/decision`,
          t.director,
          { decision: "approved", reason: "Leadership cover arranged" },
        )
      ).status,
      200,
    );
    const staffLeave = await call(p + "/leave-requests", t.staff, {
      ...body,
      requestKey: randomUUID(),
    });
    await store.put("users", {
      ...(await store.all("users")).find((u) => u.id === "user-staff"),
      active: false,
    });
    assert.equal(
      (
        await call(
          p + `/leave-requests/${staffLeave.data.id}/decision`,
          t.principal,
          { decision: "approved", reason: "Attempt inactive approval" },
        )
      ).status,
      409,
    );
    const support = await call("/platform/support", t.owner, {
      userId: "user-principal",
      schoolId: "school-north",
      reason: "Reproduce staff record issue",
      acknowledge: true,
    });
    assert.equal(support.status, 200);
    assert.equal(
      (await call(p + "/staff-workspace", support.data.token)).status,
      200,
    );
    assert.equal(
      (
        await call(
          p + "/staff-profiles/user-teacher",
          support.data.token,
          profile,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(p + "/leave-requests", support.data.token, {
          ...body,
          requestKey: randomUUID(),
        })
      ).status,
      403,
    );
    assert(
      (await store.all("audit")).some((a) => a.action === "leave.approved"),
    );
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
