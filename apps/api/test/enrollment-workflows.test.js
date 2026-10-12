import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
import { randomUUID } from "node:crypto";
import { lessonSlots } from "../src/timetable-planner.js";
let store,
  server,
  base,
  tokens = {};
const school = "/schools/school-north";
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
before(async () => {
  store = await createStore("demo");
  await seed(store);
  server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  for (const role of ["owner", "principal", "teacher", "student"])
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
test("another account may use the same password; first-login change still requires changing own password", async () => {
  const reset = await call("/auth/forgot-password", null, {
    email: "teacher@orbit.local",
  });
  const r = await call("/auth/reset-password", null, {
    token: reset.data.demoToken,
    password: "OrbitDemo123!",
  });
  assert.equal(r.status, 200);
  const login = await call("/auth/login", null, {
    email: "teacher@orbit.local",
    password: "OrbitDemo123!",
  });
  assert.equal(login.status, 200);
  tokens.teacher = login.data.token;
  assert.equal(
    (
      await call("/auth/change-password", tokens.teacher, {
        currentPassword: "OrbitDemo123!",
        password: "OrbitDemo123!",
      })
    ).status,
    400,
  );
});
test("different users can choose the same new password", async () => {
  for (const role of ["teacher", "student"]) {
    assert.equal(
      (
        await call("/auth/change-password", tokens[role], {
          currentPassword: "OrbitDemo123!",
          password: "SharedAcrossAccounts123!",
        })
      ).status,
      200,
    );
    const fresh = await call("/auth/login", null, {
      email: `${role}@orbit.local`,
      password: "SharedAcrossAccounts123!",
    });
    assert.equal(fresh.status, 200);
    tokens[role] = fresh.data.token;
  }
});
test("separate imports create multi-class teachers and student details with unique automatic numbers", async () => {
  const classes = await store.all("classes", "school-north");
  const years = await store.all("academicYears");
  const labels = classes.map(
    (c) =>
      `${c.name} | ${years.find((y) => y.id === c.academicYearId)?.name || "Legacy"}`,
  );
  const teacherTemplate = await call(
    school + "/people-import/template?type=teacher",
    tokens.principal,
  );
  assert.equal(teacherTemplate.status, 200);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(teacherTemplate.data.base64, "base64"));
  book.getWorksheet("People").getRow(2).values = [
    "Multi Class Teacher",
    "multi.teacher@sample.sgd",
    "teacher",
    labels.join(";"),
    "",
    "",
  ];
  async function upload(book) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([await book.xlsx.writeBuffer()]),
      "import.xlsx",
    );
    return call(school + "/people-import/preview", tokens.principal, form);
  }
  const preview = await upload(book);
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.entries[0].classIds.length, classes.length);
  const applied = await call(
    school + "/people-import/apply",
    tokens.principal,
    { previewId: preview.data.previewId },
  );
  assert.equal(applied.status, 200, JSON.stringify(applied.data));
  const teacher = (await store.all("users")).find(
    (u) => u.email === "multi.teacher@sample.sgd",
  );
  assert.ok(
    (await store.all("staffProfiles", "school-north"))
      .find((p) => p.userId === teacher.id)
      .employeeNumber.startsWith("HIR"),
  );
  const studentTemplate = await call(
    school + "/people-import/template?type=student",
    tokens.principal,
  );
  const studentBook = new ExcelJS.Workbook();
  await studentBook.xlsx.load(
    Buffer.from(studentTemplate.data.base64, "base64"),
  );
  studentBook.getWorksheet("People").getRow(2).values = [
    "Detailed Student",
    "details.student@sample.sgd",
    "student",
    labels[0],
    "",
    "2013-01-01",
    "Sample address",
    "Yes",
    "Sample Guardian",
    "Mother",
    "0000000000",
    "guardian@sample.sgd",
  ];
  const sp = await upload(studentBook);
  assert.equal(sp.status, 200, JSON.stringify(sp.data));
  assert.equal(
    (
      await call(school + "/people-import/apply", tokens.principal, {
        previewId: sp.data.previewId,
      })
    ).status,
    200,
  );
  const student = (await store.all("users")).find(
    (u) => u.email === "details.student@sample.sgd",
  );
  const profile = (await store.all("studentProfiles", "school-north")).find(
    (p) => p.studentId === student.id,
  );
  assert.equal(profile.address, "Sample address");
  assert.ok(profile.admissionNumber.startsWith("HIR"));
  const links = (await store.all("studentGuardians", "school-north")).filter(
    (l) => l.studentId === student.id && l.active,
  );
  assert.equal(links.length, 1);
  const guardian = (await store.all("guardians", "school-north")).find(
    (g) => g.id === links[0].guardianId,
  );
  assert.equal(
    (
      await call(school + `/guardian-records/${guardian.id}`, tokens.student, {
        active: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(
        school + `/guardian-records/${guardian.id}`,
        tokens.principal,
        { name: "Edited Guardian", active: false },
      )
    ).status,
    200,
  );
  assert.ok(
    (await store.all("guardians", "school-north")).some(
      (g) => g.id === guardian.id,
    ),
  );
  assert.equal(
    (await store.all("studentGuardians", "school-north")).find(
      (l) => l.id === links[0].id,
    ).active,
    false,
  );
  const count = (await store.all("users")).length;
  await call(school + "/enrollment-numbers/assign", tokens.principal, {});
  const profiles = await store.all("studentProfiles", "school-north");
  assert.equal(
    new Set(profiles.map((p) => p.admissionNumber)).size,
    profiles.length,
  );
  assert.equal((await store.all("users")).length, count);
});
test("year fees are atomic, bounded by year, and retry-safe without altering existing balances", async () => {
  const cls = (await store.all("classes", "school-north"))[0];
  const year = (await store.all("academicYears", "school-north")).find(
    (y) => y.id === cls.academicYearId,
  );
  const body = {
    classId: cls.id,
    name: "Monthly tuition",
    amountMinor: 10000,
    months: [year.startDate.slice(0, 7)],
    dueDay: 31,
    requestKey: randomUUID(),
    assign: true,
  };
  const before = await store.all("feeCharges", "school-north");
  const r = await call(school + "/fee-year-plan", tokens.principal, body);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.created, 1);
  assert.ok(r.data.charges > 0);
  const count = (await store.all("feeCharges", "school-north")).length;
  assert.equal(
    (await call(school + "/fee-year-plan", tokens.principal, body)).data
      .repeated,
    true,
  );
  assert.equal((await store.all("feeCharges", "school-north")).length, count);
  assert.equal(
    (
      await call(school + "/fee-year-plan", tokens.principal, {
        ...body,
        months: ["1999-01"],
        requestKey: randomUUID(),
      })
    ).status,
    400,
  );
  assert.equal(
    (await call(school + "/fee-year-plan", tokens.student, body)).status,
    403,
  );
  for (const old of before)
    assert.deepEqual(
      (await store.all("feeCharges", "school-north")).find(
        (c) => c.id === old.id,
      ),
      old,
    );
});
test("timetable planning rejects infeasible staffing and atomic conflicting batches, and imports class Excel", async () => {
  const cls = (await store.all("classes", "school-north"))[0];
  const teacher = (await store.all("users")).find(
    (u) => u.role === "teacher" && u.classIds.includes(cls.id),
  );
  const subject = await call(school + "/academics/subjects", tokens.principal, {
    classId: cls.id,
    name: "Sports planning test",
    category: "sport",
    teacherIds: [teacher.id],
  });
  assert.equal(subject.status, 201, JSON.stringify(subject.data));
  const config = {
    start: "08:00",
    end: "10:00",
    assemblyMinutes: 10,
    lunchCount: 1,
    lunchMinutes: 20,
    periodMinutes: 30,
  };
  assert.equal(lessonSlots(config).length, 3);
  const generated = await call(
    school + "/timetable-plan/generate",
    tokens.principal,
    {
      classIds: [cls.id],
      subjectIds: [subject.data.id],
      weekdays: [7],
      config,
    },
  );
  assert.equal(generated.status, 200, JSON.stringify(generated.data));
  assert.equal(generated.data.rows.length, 3);
  const before = (await store.all("timetable", "school-north")).length;
  assert.equal(
    (
      await call(school + "/timetable-plan/apply", tokens.principal, {
        rows: [generated.data.rows[0], generated.data.rows[0]],
      })
    ).status,
    409,
  );
  assert.equal((await store.all("timetable", "school-north")).length, before);
  assert.equal(
    (
      await call(school + "/timetable-plan/apply", tokens.principal, {
        rows: generated.data.rows,
        config,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(school + "/timetable-plan/generate", tokens.principal, {
        classIds: [cls.id],
        subjectIds: [subject.data.id],
        weekdays: [7],
        config,
      })
    ).status,
    409,
  );
  const template = await call(
    school + "/timetable-plan/template",
    tokens.principal,
    { classId: cls.id, config, weekdays: [6] },
  );
  assert.equal(template.status, 200);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(template.data.base64, "base64"));
  const sheet = book.getWorksheet("Timetable");
  for (let n = 2; n <= sheet.rowCount; n++) {
    sheet.getCell(`D${n}`).value = subject.data.name;
    sheet.getCell(`E${n}`).value = teacher.email;
  }
  const form = new FormData();
  form.append(
    "file",
    new Blob([await book.xlsx.writeBuffer()]),
    "timetable.xlsx",
  );
  const preview = await call(
    school + "/timetable-plan/preview",
    tokens.principal,
    form,
  );
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.rows.length, 3);
  assert.equal(
    (
      await call(school + "/timetable-plan/apply", tokens.principal, {
        rows: preview.data.rows,
      })
    ).status,
    200,
  );
});
test("owner edits and archives retain school and organization records and block school access", async () => {
  const schoolRow = (await store.all("schools")).find(
    (s) => s.id === "school-west",
  );
  const count = (await store.all("schools")).length;
  assert.equal(
    (
      await call("/platform/schools/school-west/edit", tokens.principal, {
        active: false,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/platform/schools/school-west/edit", tokens.owner, {
        name: "Renamed school",
        active: false,
      })
    ).status,
    200,
  );
  assert.equal((await store.all("schools")).length, count);
  const director = await call("/auth/login", null, {
    email: "director@orbit.local",
    password: "OrbitDemo123!",
  });
  assert.equal(
    (await call("/schools/school-west/workspace", director.data.token)).status,
    403,
  );
  assert.equal(
    (await store.all("schools")).find((s) => s.id === schoolRow.id).active,
    false,
  );
  assert.equal(
    (
      await call("/platform/organizations/org-demo/edit", tokens.owner, {
        active: false,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call("/platform/schools/school-west/edit", tokens.owner, {
        active: true,
      })
    ).status,
    200,
  );
});
