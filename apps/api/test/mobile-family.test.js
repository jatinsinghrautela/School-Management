import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
import { closeStorage } from "../src/file-storage.js";
let store, server, base, token;
const sid = "school-north";
const fileId = "87777777-7777-4777-8777-777777777777";
before(async () => {
  store = await createStore("demo");
  await seed(store);
  const student = (await store.all("users")).find((u) => u.role === "student");
  await store.put("users", {
    ...student,
    id: "other-student",
    email: "other@orbit.local",
    name: "Other student",
    classIds: ["school-north-9"],
  });
  await store.put("users", {
    ...student,
    id: "parent-mobile",
    email: "parent-mobile@orbit.local",
    name: "Demo guardian",
    role: "parent",
    classIds: [],
  });
  await store.put("parentLinks", {
    id: "link-mobile",
    schoolId: sid,
    userId: "parent-mobile",
    guardianId: "guardian-mobile",
    active: true,
  });
  await store.put("studentGuardians", {
    id: "guardian-student",
    schoolId: sid,
    studentId: student.id,
    guardianId: "guardian-mobile",
    active: true,
  });
  for (const studentId of [student.id, "other-student"])
    await store.put("feePayments", {
      id: `payment-${studentId}`,
      schoolId: sid,
      studentId,
      receiptNumber: `REC-${studentId}`,
      studentName: "<Student>",
      schoolName: "Demo school",
      name: "Tuition",
      amountMinor: 25000,
      currency: "INR",
      paidOn: "2026-10-15",
      method: "cash",
      createdAt: "2026-10-15T00:00:00Z",
    });
  await store.put("timetable", {
    id: "period-mobile",
    schoolId: sid,
    academicYearId: "school-north-year",
    classId: "school-north-10",
    subjectId: "subject-math",
    teacherId: "user-teacher",
    day: 5,
    start: "09:00",
    end: "09:40",
  });
  await store.put("substitutions", {
    id: "sub-mobile",
    schoolId: sid,
    entryId: "period-mobile",
    date: "2026-10-16",
    teacherId: "user-principal",
    reason: "Private staff reason",
    cancelled: false,
  });
  await store.put("resources", {
    id: "mobile-resource",
    schoolId: sid,
    classId: "school-north-10",
    title: "Private resource",
    type: "syllabus",
    fileId,
  });
  await store.put("files", {
    id: fileId,
    schoolId: sid,
    name: "demo.pdf",
    mime: "application/pdf",
    scanStatus: "unscanned",
    size: 5,
  });
  server = createApp(store, { mailer: null, scanner: async () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "parent-mobile@orbit.local",
      password: "OrbitDemo123!",
    }),
  });
  token = (await response.json()).token;
});
after(async () => {
  await closeStorage();
  await new Promise((r) => server.close(r));
  await store.close();
});
const call = (path) =>
  fetch(`${base}/schools/${sid}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
test("guardian family payments and receipt export remain child-scoped and escaped", async () => {
  const family = await (await call("/family")).json();
  assert.equal(family.child.payments.length, 1);
  assert.equal(family.child.payments[0].studentId, "user-student");
  const good = await call("/family/fee-payments/payment-user-student/receipt");
  assert.equal(good.status, 200);
  const doc = await good.json();
  assert.match(doc.html, /&lt;Student&gt;/);
  assert.equal(
    (await call("/family/fee-payments/payment-other-student/receipt")).status,
    404,
  );
  assert.equal((await call("/family?childId=other-student")).status, 404);
});
test("guardian dated timetable respects links, substitutions, private reasons and holidays", async () => {
  let response = await call(
    "/family/timetable?childId=user-student&date=2026-10-16",
  );
  assert.equal(response.status, 200);
  let data = await response.json();
  assert.equal(data.entries[0].teacherName, "Priya Sharma");
  assert.equal(data.entries[0].substitution.reason, undefined);
  assert.equal(
    (await call("/family/timetable?childId=other-student&date=2026-10-16"))
      .status,
    404,
  );
  assert.equal(
    (await call("/family/timetable?childId=user-student&date=2026-02-30"))
      .status,
    400,
  );
  await store.put("calendar", {
    id: "holiday-mobile",
    schoolId: sid,
    kind: "holiday",
    audience: "all",
    classId: null,
    startDate: "2026-10-16",
    endDate: "2026-10-16",
    title: "School closed",
  });
  data = await (
    await call("/family/timetable?childId=user-student&date=2026-10-16")
  ).json();
  assert.deepEqual(data.entries, []);
  assert.deepEqual(data.holidays, ["School closed"]);
});
test("guardian resources use the cloud adapter and respect its paused state without a provider call", async () => {
  const previous = {
    FILE_STORAGE: process.env.FILE_STORAGE,
    R2_PAUSED: process.env.R2_PAUSED,
  };
  try {
    process.env.FILE_STORAGE = "r2";
    process.env.R2_PAUSED = "yes";
    const response = await call("/family/resources/mobile-resource/download");
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /paused/);
  } finally {
    await closeStorage();
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
test("revoked guardian links cannot export old receipts or child schedules", async () => {
  await store.put("parentLinks", {
    id: "link-mobile",
    schoolId: sid,
    userId: "parent-mobile",
    guardianId: "guardian-mobile",
    active: false,
  });
  assert.equal(
    (await call("/family/fee-payments/payment-user-student/receipt")).status,
    404,
  );
  assert.equal(
    (await call("/family/timetable?childId=user-student&date=2026-10-16"))
      .status,
    404,
  );
  const family = await (await call("/family")).json();
  assert.deepEqual(family.children, []);
  assert.equal(family.child, null);
});
