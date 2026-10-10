import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
import { scanBuffer } from "../src/upload-security.js";
import { unlink } from "node:fs/promises";
let store, server, base, tokens;
const school = "/schools/school-north";
before(async () => {
  store = await createStore("demo");
  await seed(store);
  server = createApp(store, { mailer: null, scanner: async () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  tokens = {};
  for (const role of ["principal", "teacher", "student"])
    tokens[role] = (
      await call("/auth/login", null, {
        email: `${role}@orbit.local`,
        password: "OrbitDemo123!",
      })
    ).data.token;
});
after(async () => {
  await new Promise((r) => server.close(r));
  await store.close();
});
async function call(path, token, body) {
  const form = body instanceof FormData;
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(!form ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
}
test("attendance sessions remain independent and reject inactive and foreign sessions", async () => {
  const session = await call(
    school + "/attendance-sessions",
    tokens.principal,
    { name: "Morning" },
  );
  assert.equal(session.status, 200);
  const body = {
    classId: "school-north-10",
    date: "2026-10-08",
    entries: [{ studentId: "user-student", status: "present" }],
  };
  assert.equal(
    (await call(school + "/attendance/batch", tokens.teacher, body)).status,
    200,
  );
  assert.equal(
    (
      await call(school + "/attendance/batch", tokens.teacher, {
        ...body,
        sessionId: session.data.id,
        entries: [{ studentId: "user-student", status: "absent" }],
      })
    ).status,
    200,
  );
  const rows = await store.all("attendance");
  assert.equal(rows.length, 2);
  assert.equal(new Set(rows.map((r) => r.id)).size, 2);
  assert.equal(
    (
      await call(school + "/attendance/batch", tokens.teacher, {
        ...body,
        sessionId: "foreign",
      })
    ).status,
    400,
  );
  await call(school + "/attendance-sessions", tokens.principal, {
    sessionId: session.data.id,
    name: "Morning",
    active: false,
  });
  assert.equal(
    (
      await call(school + "/attendance/batch", tokens.teacher, {
        ...body,
        sessionId: session.data.id,
      })
    ).status,
    400,
  );
});
test("terms enforce year bounds, overlaps and management permissions", async () => {
  const y = (await store.all("academicYears")).find(
    (y) => y.id === "school-north-year",
  );
  const body = {
    academicYearId: y.id,
    name: "Autumn",
    startDate: y.startDate,
    endDate: y.startDate,
  };
  assert.equal(
    (await call(school + "/academics/terms", tokens.teacher, body)).status,
    403,
  );
  assert.equal(
    (await call(school + "/academics/terms", tokens.principal, body)).status,
    201,
  );
  assert.equal(
    (
      await call(school + "/academics/terms", tokens.principal, {
        ...body,
        name: "Overlap",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(school + "/academics/terms", tokens.principal, {
        ...body,
        name: "Outside",
        startDate: "2000-01-01",
      })
    ).status,
    400,
  );
});
test("directory and workbook exports enforce visibility; imports preview, validate and consume once", async () => {
  const own = await call(school + "/directory", tokens.student);
  assert.equal(own.data.total, 1);
  assert.equal(own.data.users[0].id, "user-student");
  assert.equal(own.data.users[0].passwordHash, undefined);
  assert.equal(
    (await call(school + "/exports/directory", tokens.student)).status,
    403,
  );
  const result = await call(school + "/exports/attendance", tokens.student);
  assert.equal(result.status, 200);
  const exportBook = new ExcelJS.Workbook();
  await exportBook.xlsx.load(Buffer.from(result.data.base64, "base64"));
  assert.equal(exportBook.worksheets[0].rowCount, 3);
  const template = await call(
    school + "/people-import/template",
    tokens.principal,
  );
  assert.equal(template.status, 200);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(template.data.base64, "base64"));
  const label = book.getWorksheet("Classes").getRow(2).getCell(1).value;
  book.getWorksheet("People").getRow(2).values = [
    "Imported Student",
    "imported@test.local",
    "student",
    label,
  ];
  async function preview() {
    const form = new FormData();
    form.append(
      "file",
      new Blob([await book.xlsx.writeBuffer()]),
      "people.xlsx",
    );
    return call(school + "/people-import/preview", tokens.principal, form);
  }
  book.getWorksheet("People").getRow(2).getCell(3).value = "owner";
  const invalidRole = await preview();
  assert.equal(invalidRole.status, 400);
  assert.match(
    invalidRole.data.errors[0],
    /role must be student, teacher or staff/,
  );
  book.getWorksheet("People").getRow(2).getCell(3).value = "student";
  book.getWorksheet("People").getRow(2).getCell(4).value =
    "Missing Class | 2026-2027";
  const missingClass = await preview();
  assert.equal(missingClass.status, 400);
  assert.match(missingClass.data.errors[0], /class choice does not match/);
  book.getWorksheet("People").getRow(2).getCell(4).value = label;
  book.getWorksheet("People").getRow(3).values = [
    "Imported Teacher",
    "imported.teacher@test.local",
    "teacher",
    label,
  ];
  const p = await preview();
  assert.equal(p.status, 200, JSON.stringify(p.data));
  assert.equal(
    (
      await call(school + "/people-import/apply", tokens.teacher, {
        previewId: p.data.previewId,
      })
    ).status,
    403,
  );
  const applied = await call(
    school + "/people-import/apply",
    tokens.principal,
    { previewId: p.data.previewId },
  );
  assert.equal(applied.status, 200);
  assert.equal(applied.data.created, 2);
  const credentialBook = new ExcelJS.Workbook();
  await credentialBook.xlsx.load(
    Buffer.from(applied.data.credentials.base64, "base64"),
  );
  const credentials = credentialBook.getWorksheet("Login credentials");
  const temporary = credentials.getCell("D2").value;
  assert.equal(typeof temporary, "string");
  assert.ok(temporary.length >= 12);
  assert.notEqual(temporary, credentials.getCell("D3").value);
  const login = await call("/auth/login", null, {
    email: "imported@test.local",
    password: temporary,
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.passwordChangeRequired, true);
  assert.equal(
    (await call(school + "/directory", login.data.token)).status,
    403,
  );
  const changed = await call("/auth/change-password", login.data.token, {
    currentPassword: temporary,
    password: "ImportedAccountNew123!",
  });
  assert.equal(changed.status, 200);
  assert.equal(
    (
      await call("/auth/login", null, {
        email: "imported@test.local",
        password: temporary,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call("/auth/login", null, {
        email: "imported@test.local",
        password: "ImportedAccountNew123!",
      })
    ).status,
    200,
  );
  const teacherLogin = await call("/auth/login", null, {
    email: "imported.teacher@test.local",
    password: credentials.getCell("D3").value,
  });
  assert.equal(teacherLogin.status, 200);
  assert.equal(teacherLogin.data.user.passwordChangeRequired, true);
  assert.ok(!JSON.stringify(await store.all("users")).includes(temporary));
  assert.ok(
    !JSON.stringify(await store.all("peopleImports")).includes(temporary),
  );
  assert.equal(
    (
      await call(school + "/people-import/apply", tokens.principal, {
        previewId: p.data.previewId,
      })
    ).status,
    409,
  );
  const u = (await store.all("users")).find(
    (u) => u.email === "imported@test.local",
  );
  assert.equal(u.passwordChangeRequired, false);
  assert.equal(u.role, "student");
});
test("unconfigured email delivery and scanner fail safely", async () => {
  assert.equal(
    (
      await call("/users/user-student/recovery", tokens.principal, {
        delivery: "email",
      })
    ).status,
    503,
  );
  const old = process.env.CLAMAV_COMMAND;
  delete process.env.CLAMAV_COMMAND;
  try {
    await assert.rejects(
      scanBuffer(Buffer.from("%PDF-1.4")),
      (e) => e.status === 503,
    );
  } finally {
    if (old !== undefined) process.env.CLAMAV_COMMAND = old;
  }
});
test("private homework attachments become teacher-visible only after submission", async () => {
  const resource = (await store.all("resources")).find(
    (r) => r.type === "homework",
  );
  const form = new FormData();
  form.append("file", new Blob(["%PDF-1.4 synthetic fixture"]), "answer.pdf");
  const uploaded = await call(
    school + `/homework/${resource.id}/attachment`,
    tokens.student,
    form,
  );
  assert.equal(uploaded.status, 201, JSON.stringify(uploaded.data));
  const fileId = uploaded.data.attachmentId;
  try {
    let r = await fetch(base + school + `/files/${fileId}`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` },
    });
    assert.equal(r.status, 404);
    const submitted = await call(
      school + `/homework/${resource.id}/submit`,
      tokens.student,
      { answer: "Attached working", attachmentId: fileId },
    );
    assert.equal(submitted.status, 201);
    r = await fetch(base + school + `/files/${fileId}`, {
      headers: { Authorization: `Bearer ${tokens.teacher}` },
    });
    assert.equal(r.status, 200);
    assert.equal(
      (
        await call(school + `/homework/${resource.id}/submit`, tokens.student, {
          answer: "Reuse",
          attachmentId: fileId,
        })
      ).status,
      400,
    );
  } finally {
    await unlink(new URL(`../data/uploads/${fileId}`, import.meta.url)).catch(
      () => {},
    );
  }
});
test("dated substitutions replace a period, preserve base schedule and hide reasons from students", async () => {
  const teacher = (await store.all("users")).find(
    (u) => u.id === "user-teacher",
  );
  await store.put("users", {
    ...teacher,
    id: "sub-teacher",
    email: "sub@test.local",
    name: "Substitute",
  });
  await store.put("timetable", {
    id: "fixture-period",
    schoolId: "school-north",
    classId: "school-north-10",
    academicYearId: "school-north-year",
    subjectId: "subject-math",
    teacherId: teacher.id,
    day: 4,
    start: "09:00",
    end: "10:00",
    cancelled: false,
  });
  const body = {
    entryId: "fixture-period",
    date: "2026-10-08",
    teacherId: "sub-teacher",
    reason: "Private staff absence",
  };
  const result = await call(school + "/substitutions", tokens.principal, body);
  assert.equal(result.status, 201, JSON.stringify(result.data));
  assert.equal(
    (await call(school + "/substitutions", tokens.principal, body)).status,
    409,
  );
  const view = await call(
    school + "/timetable-date?date=2026-10-08",
    tokens.student,
  );
  assert.equal(view.data.entries[0].teacherId, "sub-teacher");
  assert.equal(view.data.entries[0].substitution.reason, undefined);
  assert.equal(
    (await store.all("timetable")).find((r) => r.id === "fixture-period")
      .teacherId,
    teacher.id,
  );
  assert.equal(
    (
      await call(
        school + `/substitutions/${result.data.id}/cancel`,
        tokens.principal,
        { reason: "Teacher returned" },
      )
    ).status,
    200,
  );
});
test("PDF exports require an approved own report and restrict archived versions", async () => {
  const exam = (await store.all("exams")).find((e) => e.id === "exam-demo");
  await store.put("exams", { ...exam, status: "published", version: 1 });
  await store.put("reports", {
    id: "report-fixture",
    schoolId: "school-north",
    classId: exam.classId,
    studentId: "user-student",
    examId: exam.id,
    version: 1,
    schoolName: "Fixture School",
    schoolCity: "Fixture",
    className: "Grade 10",
    academicYear: "2026-2027",
    examName: exam.name,
    studentName: "Fixture Student",
    rows: [
      {
        name: "Mathematics",
        score: 80,
        maxScore: 100,
        weight: 1,
        passed: true,
      },
    ],
    totalScore: 80,
    totalMax: 100,
    percentage: 80,
    grade: "A",
    passed: true,
    publishedAt: new Date().toISOString(),
    publishedBy: "Principal Fixture",
  });
  const result = await call(
    school + "/reports/exam-demo/user-student/pdf",
    tokens.student,
  );
  assert.equal(result.status, 200);
  assert.equal(
    Buffer.from(result.data.base64, "base64").subarray(0, 5).toString(),
    "%PDF-",
  );
  assert.equal(
    (
      await call(
        school + "/reports/exam-demo/other-student/pdf",
        tokens.student,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        school + "/reports/exam-demo/user-student/pdf?version=2",
        tokens.teacher,
      )
    ).status,
    403,
  );
});
test("promotion consumes reviewed roster, preserves history and invalidates old student sessions", async () => {
  const old = (await store.all("academicYears")).find(
    (y) => y.id === "school-north-year",
  );
  const year = new Date().getUTCFullYear();
  await store.put("academicYears", {
    ...old,
    startDate: `${year - 1}-04-01`,
    endDate: `${year}-03-31`,
  });
  await store.put("academicYears", {
    id: "new-year",
    schoolId: "school-north",
    name: "New",
    startDate: `${year}-04-01`,
    endDate: `${year + 1}-03-31`,
    isCurrent: true,
  });
  await store.put("classes", {
    id: "new-class",
    schoolId: "school-north",
    academicYearId: "new-year",
    name: "Grade 11",
  });
  const body = { fromClassId: "school-north-10", toClassId: "new-class" };
  assert.equal(
    (await call(school + "/academics/promotions/preview", tokens.teacher, body))
      .status,
    403,
  );
  const p = await call(
    school + "/academics/promotions/preview",
    tokens.principal,
    body,
  );
  assert.equal(p.status, 200);
  const applied = await call(
    school + "/academics/promotions/apply",
    tokens.principal,
    { previewId: p.data.previewId },
  );
  assert.equal(applied.status, 200, JSON.stringify(applied.data));
  assert.equal(
    (
      await call(school + "/academics/promotions/apply", tokens.principal, {
        previewId: p.data.previewId,
      })
    ).status,
    409,
  );
  assert.equal((await call(school + "/directory", tokens.student)).status, 401);
  const history = (await store.all("enrollments")).filter(
    (e) => e.studentId === "user-student",
  );
  assert.equal(history.length, 2);
  assert.ok(history.some((e) => e.status === "promoted"));
  const login = await call("/auth/login", null, {
    email: "student@orbit.local",
    password: "OrbitDemo123!",
  });
  assert.equal(
    (
      await call(
        school + "/reports/exam-demo/user-student/pdf",
        login.data.token,
      )
    ).status,
    200,
  );
});
