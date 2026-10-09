import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
test("admissions review atomically creates restricted student accounts and private guardian/enrollment records", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store, { mailer: null }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function call(path, token, body) {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json() };
  }
  try {
    const tokens = {};
    for (const role of ["principal", "student", "teacher", "director"])
      tokens[role] = (
        await call("/auth/login", null, {
          email: `${role}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).data.token;
    const prefix = "/schools/school-north",
      body = {
        studentName: "Synthetic Applicant",
        loginEmail: "applicant@fixture.local",
        classId: "school-north-10",
        admissionNumber: "N-001",
        birthDate: "2010-05-10",
        address: "Synthetic address",
        guardianConsent: true,
        guardians: [
          {
            name: "Fixture Guardian",
            relationship: "Guardian",
            email: "guardian@fixture.local",
            phone: "",
          },
        ],
      };
    assert.equal(
      (await call(prefix + "/admissions", tokens.teacher, body)).status,
      403,
    );
    assert.equal(
      (
        await call(prefix + "/admissions", tokens.principal, {
          ...body,
          guardianConsent: false,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(prefix + "/admissions", tokens.principal, {
          ...body,
          classId: "school-west-10",
        })
      ).status,
      400,
    );
    const admission = await call(
      prefix + "/admissions",
      tokens.principal,
      body,
    );
    assert.equal(admission.status, 201);
    assert.equal(
      (await call(prefix + "/admissions", tokens.principal, body)).status,
      409,
    );
    const decision = prefix + `/admissions/${admission.data.id}/decision`;
    assert.equal(
      (
        await call(decision, tokens.principal, {
          status: "admitted",
          reason: "Approved documents",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(decision, tokens.principal, {
          status: "reviewing",
          reason: "Documents received",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          `/schools/school-west/admissions/${admission.data.id}/decision`,
          tokens.director,
          { status: "admitted", reason: "Attempt wrong scope" },
        )
      ).status,
      404,
    );
    const before = (await store.all("users")).length;
    const results = await Promise.all([
      call(decision, tokens.principal, {
        status: "admitted",
        reason: "Verified eligibility",
      }),
      call(decision, tokens.principal, {
        status: "admitted",
        reason: "Verified eligibility",
      }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await store.all("users")).length, before + 1);
    const admitted = results.find((r) => r.status === 200).data,
      student = (await store.all("users")).find(
        (u) => u.id === admitted.studentId,
      );
    assert.equal(student.passwordChangeRequired, true);
    assert.equal(student.role, "student");
    assert.deepEqual(student.classIds, [body.classId]);
    assert.equal(admitted.passwordHash, undefined);
    assert.equal(
      (await store.all("enrollments")).filter((e) => e.studentId === student.id)
        .length,
      1,
    );
    const own = await call(prefix + "/student-records", tokens.student);
    assert.equal(own.data.students.length, 1);
    assert.equal(own.data.guardians.length, 0);
    assert.equal(own.data.admissions.length, 0);
    assert.equal(
      (await call(prefix + "/student-records", tokens.teacher)).status,
      403,
    );
    assert.equal(
      (
        await call(
          prefix + "/students/user-student/profile",
          tokens.principal,
          { ...body },
        )
      ).status,
      409,
    );
    const p = await call(
      prefix + "/students/user-student/profile",
      tokens.principal,
      { ...body, admissionNumber: "N-002" },
    );
    assert.equal(p.status, 200);
    assert.equal(
      (await call(prefix + "/student-records", tokens.student)).data.guardians
        .length,
      1,
    );
    await call(prefix + "/students/user-student/profile", tokens.principal, {
      admissionNumber: "N-002",
      guardians: [],
    });
    assert.equal(
      (await call(prefix + "/student-records", tokens.student)).data.guardians
        .length,
      0,
    );
    assert.ok(
      (await store.all("studentGuardians")).some(
        (l) => l.studentId === "user-student" && !l.active,
      ),
    );
    const second = await call(prefix + "/admissions", tokens.principal, {
      ...body,
      loginEmail: "second@fixture.local",
      admissionNumber: "N-001",
    });
    await call(
      prefix + `/admissions/${second.data.id}/decision`,
      tokens.principal,
      { status: "reviewing", reason: "Check duplicate number" },
    );
    const size = (await store.all("users")).length;
    assert.equal(
      (
        await call(
          prefix + `/admissions/${second.data.id}/decision`,
          tokens.principal,
          { status: "admitted", reason: "Verify atomic rollback" },
        )
      ).status,
      409,
    );
    assert.equal((await store.all("users")).length, size);
    assert.equal(
      (
        await call(
          prefix + `/admissions/${second.data.id}/decision`,
          tokens.principal,
          { status: "rejected", reason: "Duplicate admission number" },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          prefix + `/admissions/${second.data.id}/decision`,
          tokens.principal,
          { status: "reviewing", reason: "Attempt finalized change" },
        )
      ).status,
      409,
    );
    const withdrawal = await call(prefix + "/admissions", tokens.principal, {
      ...body,
      loginEmail: "withdrawn@fixture.local",
      admissionNumber: "N-003",
    });
    assert.equal(
      (
        await call(
          prefix + `/admissions/${withdrawal.data.id}/decision`,
          tokens.principal,
          { status: "withdrawn", reason: "Applicant withdrew request" },
        )
      ).status,
      200,
    );
    assert.ok(
      (await store.all("audit")).some((a) => a.action === "admission.admitted"),
    );
    assert.equal(
      (
        await call(prefix + "/students/user-student/profile", tokens.student, {
          guardians: [],
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          prefix + "/students/user-student/profile",
          tokens.principal,
          { birthDate: "2999-01-01", guardians: [] },
        )
      ).status,
      400,
    );
    const multiple = {
      guardianConsent: true,
      guardians: [
        body.guardians[0],
        {
          name: "Second Fixture Guardian",
          relationship: "Guardian",
          email: "secondguardian@fixture.local",
          phone: "",
        },
      ],
    };
    assert.equal(
      (
        await call(
          prefix + "/students/user-student/profile",
          tokens.principal,
          multiple,
        )
      ).status,
      200,
    );
    assert.equal(
      (await call(prefix + "/student-records", tokens.student)).data.guardians
        .length,
      2,
    );
    const owner = (
      await call("/auth/login", null, {
        email: "owner@orbit.local",
        password: "OrbitDemo123!",
      })
    ).data.token;
    const support = (
      await call("/platform/support", owner, {
        userId: "user-principal",
        reason: "Reproduce admission fixture issue",
        acknowledge: true,
      })
    ).data.token;
    assert.equal(
      (
        await call(prefix + "/admissions", support, {
          ...body,
          loginEmail: "support@fixture.local",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(prefix + "/students/user-student/profile", support, {
          guardians: [],
        })
      ).status,
      403,
    );
  } finally {
    await new Promise((r) => server.close(r));
    await store.close();
  }
});
