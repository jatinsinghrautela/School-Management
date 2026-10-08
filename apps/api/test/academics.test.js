import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
let store, server, base, tokens;
before(async () => {
  store = await createStore("demo");
  await seed(store);
  server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  tokens = {};
  for (const role of ["principal", "teacher", "student", "director"])
    tokens[role] = (
      await call("/auth/login", null, {
        email: `${role}@orbit.local`,
        password: "OrbitDemo123!",
      })
    ).data.token;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await store.close();
});
async function call(path, token, body) {
  const res = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}
const school = "/schools/school-north";

test("academic configuration validates dates, year/class scope, and teacher memberships", async () => {
  assert.equal(
    (
      await call(school + "/academics/years", tokens.teacher, {
        name: "Denied",
        startDate: "2027-04-01",
        endDate: "2028-03-31",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(school + "/academics/years", tokens.principal, {
        name: "Invalid",
        startDate: "2026-02-30",
        endDate: "2027-03-31",
      })
    ).status,
    400,
  );
  const year = await call(school + "/academics/years", tokens.principal, {
    name: "Next year",
    startDate: "2027-04-01",
    endDate: "2028-03-31",
  });
  assert.equal(year.status, 201);
  const cls = await call(school + "/academics/classes", tokens.principal, {
    academicYearId: year.data.id,
    grade: "Grade 11",
    section: "B",
  });
  assert.equal(cls.status, 201);
  assert.equal(
    (
      await call(school + "/academics/classes", tokens.principal, {
        academicYearId: year.data.id,
        grade: "Grade 11",
        section: "B",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(school + "/academics/classes", tokens.principal, {
        academicYearId: "school-west-year",
        grade: "Grade 12",
        section: "A",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(school + "/academics/subjects", tokens.principal, {
        classId: cls.data.id,
        name: "Physics",
        teacherIds: ["user-teacher"],
      })
    ).status,
    400,
  );
  const subject = await call(school + "/academics/subjects", tokens.principal, {
    classId: cls.data.id,
    name: "Physics",
    teacherIds: [],
  });
  assert.equal(subject.status, 201);
  assert.equal(
    (
      await call(
        school + `/academics/subjects/${subject.data.id}/assign`,
        tokens.teacher,
        { teacherIds: ["user-teacher"] },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        school + "/academics/years/" + year.data.id + "/activate",
        tokens.principal,
        {},
      )
    ).status,
    200,
  );
  const workspace = await call(school + "/workspace", tokens.principal);
  assert.equal(
    workspace.data.academicYears.filter((y) => y.isCurrent).length,
    1,
  );
});

test("attendance batch is all-or-nothing, rejects impossible dates and ignores injected scope fields", async () => {
  const request = {
    classId: "school-north-10",
    date: "2026-10-08",
    entries: [
      { studentId: "user-student", status: "present" },
      { studentId: "nonexistent", status: "absent" },
    ],
  };
  assert.equal(
    (await call(school + "/attendance/batch", tokens.teacher, request)).status,
    400,
  );
  assert.equal((await store.all("attendance")).length, 0);
  assert.equal(
    (
      await call(school + "/attendance/batch", tokens.teacher, {
        ...request,
        date: "2026-02-30",
        entries: [request.entries[0]],
      })
    ).status,
    400,
  );
  const r = await call(school + "/attendance/batch", tokens.teacher, {
    ...request,
    entries: [
      {
        ...request.entries[0],
        schoolId: "school-west",
        id: "overwritten-id",
        date: "1900-01-01",
      },
    ],
  });
  assert.equal(r.status, 200);
  const row = (await store.all("attendance"))[0];
  assert.equal(row.schoolId, "school-north");
  assert.equal(row.date, "2026-10-08");
  assert.notEqual(row.id, "overwritten-id");
  await Promise.all([
    call(school + "/attendance/batch", tokens.teacher, {
      ...request,
      entries: [{ ...request.entries[0], status: "late" }],
    }),
    call(school + "/attendance/batch", tokens.teacher, {
      ...request,
      entries: [{ ...request.entries[0], status: "present" }],
    }),
  ]);
  assert.equal((await store.all("attendance")).length, 1);
});

test("store transactions roll back writes and audit entries on failure", async () => {
  const before = (await store.all("audit")).length;
  await assert.rejects(
    store.transaction("school-north", async (tx) => {
      await tx.put("audit", {
        id: "rollback-marker",
        schoolId: "school-north",
        action: "should.not.persist",
      });
      throw new Error("simulated failure");
    }),
  );
  assert.equal((await store.all("audit")).length, before);
  assert.ok(
    !(await store.all("audit")).some((a) => a.id === "rollback-marker"),
  );
});

test("exam publication gates student visibility and produces immutable weighted report versions", async () => {
  const teacher = (await store.all("users")).find(
    (u) => u.id === "user-teacher",
  );
  await store.put("users", {
    ...teacher,
    id: "unassigned-teacher",
    email: "unassigned@orbit.local",
  });
  const unassigned = (
    await call("/auth/login", null, {
      email: "unassigned@orbit.local",
      password: "OrbitDemo123!",
    })
  ).data.token;
  const year = (await store.all("academicYears")).find(
    (y) => y.id === "school-north-year",
  );
  const payload = {
    name: "Weighted assessment",
    academicYearId: year.id,
    classId: "school-north-10",
    startDate: year.startDate,
    endDate: year.startDate,
    subjects: [
      { subjectId: "subject-math", maxScore: 200, weight: 3, passPercent: 40 },
      {
        subjectId: "subject-science",
        maxScore: 100,
        weight: 1,
        passPercent: 40,
      },
    ],
    gradingBands: [
      { label: "A", minPercent: 80 },
      { label: "B", minPercent: 60 },
      { label: "F", minPercent: 0 },
    ],
  };
  assert.equal(
    (
      await call(school + "/exams", tokens.principal, {
        ...payload,
        gradingBands: [{ label: "A", minPercent: 80 }],
      })
    ).status,
    400,
  );
  const created = await call(school + "/exams", tokens.principal, payload);
  assert.equal(created.status, 201);
  const eid = created.data.id;
  const marks = (subjectId) => ({
    subjectId,
    entries: [{ studentId: "user-student", score: 100 }],
  });
  assert.equal(
    (
      await call(
        school + `/exams/${eid}/marks/batch`,
        unassigned,
        marks("subject-math"),
      )
    ).status,
    403,
  );
  assert.equal(
    (await call(school + `/exams/${eid}/publish`, tokens.teacher, {})).status,
    403,
  );
  assert.equal(
    (await call(school + `/exams/${eid}/publish`, tokens.principal, {})).status,
    409,
  );
  assert.equal(
    (
      await call(
        school + `/exams/${eid}/marks/batch`,
        tokens.teacher,
        marks("subject-math"),
      )
    ).status,
    200,
  );
  const drafts = await call(school + "/workspace", tokens.student);
  assert.ok(!drafts.data.exams.some((e) => e.id === eid));
  assert.ok(!drafts.data.marks.some((m) => m.examId === eid));
  const invalid = await call(
    school + `/exams/${eid}/marks/batch`,
    tokens.teacher,
    {
      subjectId: "subject-science",
      entries: [
        { studentId: "user-student", score: 50 },
        { studentId: "missing", score: 40 },
      ],
    },
  );
  assert.equal(invalid.status, 400);
  assert.ok(
    !(await store.all("marks")).some(
      (m) => m.examId === eid && m.subjectId === "subject-science",
    ),
  );
  assert.equal(
    (
      await call(
        school + `/exams/${eid}/marks/batch`,
        tokens.teacher,
        marks("subject-science"),
      )
    ).status,
    200,
  );
  assert.equal(
    (await call(school + `/exams/${eid}/publish`, tokens.principal, {})).status,
    200,
  );
  const report = (
    await call(school + `/reports/${eid}/user-student`, tokens.student)
  ).data;
  assert.equal(report.percentage, 62.5);
  assert.equal(report.grade, "B");
  assert.equal(report.totalScore, 200);
  assert.equal(report.passed, true);
  assert.equal(report.version, 1);
  assert.equal(
    (await call(school + `/reports/${eid}/someone-else`, tokens.student))
      .status,
    403,
  );
  assert.equal(
    (
      await call(
        "/schools/school-west" + `/reports/${eid}/user-student`,
        tokens.director,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await call(
        school + `/exams/${eid}/marks/batch`,
        tokens.teacher,
        marks("subject-math"),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await call(school + "/marks", tokens.teacher, {
        classId: "school-north-10",
        studentId: "user-student",
        exam: payload.name,
        subject: "Mathematics",
        score: 50,
        maxScore: 200,
      })
    ).status,
    409,
  );
  assert.equal(
    (await call(school + `/exams/${eid}/reopen`, tokens.principal, {})).status,
    400,
  );
  assert.equal(
    (
      await call(school + `/exams/${eid}/reopen`, tokens.principal, {
        reason: "Corrected assessment entry",
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(school + `/reports/${eid}/user-student`, tokens.student))
      .status,
    403,
  );
  assert.equal(
    (
      await call(school + `/exams/${eid}/marks/batch`, tokens.teacher, {
        subjectId: "subject-math",
        entries: [{ studentId: "user-student", score: 180 }],
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(school + `/exams/${eid}/publish`, tokens.principal, {})).status,
    200,
  );
  const updated = (
    await call(school + `/reports/${eid}/user-student`, tokens.student)
  ).data;
  assert.equal(updated.percentage, 92.5);
  assert.equal(updated.version, 2);
  const history = await call(
    school + `/reports/${eid}/user-student/history`,
    tokens.principal,
  );
  assert.equal(history.status, 200);
  assert.deepEqual(
    history.data.reports.map((r) => [r.version, r.archived]),
    [
      [2, false],
      [1, true],
    ],
  );
  assert.equal(
    (
      await call(
        school + `/reports/${eid}/user-student/history`,
        tokens.student,
      )
    ).status,
    403,
  );
  assert.equal(
    (await store.all("reports")).find((r) => r.id === report.id).percentage,
    62.5,
  );
});

test("concurrent publications produce a single approved version", async () => {
  for (const subjectId of ["subject-math", "subject-science"])
    assert.equal(
      (
        await call(school + "/exams/exam-demo/marks/batch", tokens.teacher, {
          subjectId,
          entries: [{ studentId: "user-student", score: 75 }],
        })
      ).status,
      200,
    );
  const outcomes = await Promise.all([
    call(school + "/exams/exam-demo/publish", tokens.principal, {}),
    call(school + "/exams/exam-demo/publish", tokens.principal, {}),
  ]);
  assert.deepEqual(outcomes.map((o) => o.status).sort(), [200, 409]);
  assert.equal(
    (await store.all("reports")).filter((r) => r.examId === "exam-demo").length,
    1,
  );
});
