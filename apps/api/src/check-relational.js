import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { createStore } from "./store.js";
const ids = Object.fromEntries(
  [
    "school",
    "otherSchool",
    "year",
    "class",
    "otherClass",
    "user",
    "attendance",
    "duplicate",
  ].map((k) => [k, randomUUID()]),
);
const store = await createStore("mysql");
const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "orbit",
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || "orbit_school",
});
try {
  for (const key of ["school", "otherSchool"])
    await store.put("schools", {
      id: ids[key],
      name: "Disposable relational fixture",
      city: "Fixture",
      code: ids[key],
    });
  await store.put("academicYears", {
    id: ids.year,
    schoolId: ids.school,
    name: "Fixture year",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    isCurrent: false,
  });
  await store.put("classes", {
    id: ids.class,
    schoolId: ids.school,
    academicYearId: ids.year,
    name: "Fixture class",
  });
  await assert.rejects(
    store.put("classes", {
      id: ids.otherClass,
      schoolId: ids.otherSchool,
      academicYearId: ids.year,
      name: "Wrong tenant",
    }),
    (e) => e.status === 409,
  );
  const email = `${ids.user}@fixture.local`;
  await store.put("users", {
    id: ids.user,
    name: "Fixture student",
    email,
    role: "student",
    passwordHash: "synthetic-non-login",
    schoolIds: [ids.school],
    classIds: [ids.class],
  });
  await assert.rejects(
    store.put("users", {
      id: ids.duplicate,
      name: "Must not overwrite",
      email,
      role: "student",
      passwordHash: "synthetic-non-login",
      schoolIds: [ids.school],
      classIds: [],
    }),
    (e) => e.status === 409,
  );
  assert.equal(
    (await store.all("users")).find((u) => u.id === ids.user).name,
    "Fixture student",
  );
  const row = {
    id: ids.attendance,
    schoolId: ids.school,
    classId: ids.class,
    studentId: ids.user,
    date: "2026-10-08",
    sessionId: null,
    status: "present",
  };
  await store.put("attendance", row);
  await assert.rejects(
    store.put("attendance", { ...row, id: ids.duplicate }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    store.put("attendance", {
      ...row,
      id: ids.duplicate,
      schoolId: ids.otherSchool,
    }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    store.put("marks", {
      id: ids.duplicate,
      schoolId: ids.school,
      classId: ids.class,
      studentId: ids.user,
      score: 101,
      maxScore: 100,
    }),
    (e) => e.status === 409,
  );
  await store.transaction(ids.school, async (tx) => {
    const initial = (await tx.all("users")).find((u) => u.id === ids.user);
    await store.userTransaction(ids.user, async (userTx) => {
      await userTx.put("users", {
        ...initial,
        authVersion: (initial.authVersion || 0) + 1,
      });
    });
    await tx.lockUsers([ids.user]);
    assert.equal(
      (await tx.all("users")).find((u) => u.id === ids.user).authVersion,
      (initial.authVersion || 0) + 1,
    );
  });
  console.log(
    "MySQL relational verification passed: duplicate identities, tenant references, attendance uniqueness and mark ranges are enforced.",
  );
} finally {
  await db.execute("DELETE FROM sg_attendance WHERE id IN (?,?)", [
    ids.attendance,
    ids.duplicate,
  ]);
  await db.execute("DELETE FROM sg_user_classes WHERE user_id IN (?,?)", [
    ids.user,
    ids.duplicate,
  ]);
  await db.execute("DELETE FROM sg_user_schools WHERE user_id IN (?,?)", [
    ids.user,
    ids.duplicate,
  ]);
  await db.execute("DELETE FROM sg_users WHERE id IN (?,?)", [
    ids.user,
    ids.duplicate,
  ]);
  await db.execute("DELETE FROM sg_classes WHERE id IN (?,?)", [
    ids.class,
    ids.otherClass,
  ]);
  await db.execute("DELETE FROM sg_academic_years WHERE id=?", [ids.year]);
  await db.execute("DELETE FROM sg_schools WHERE id IN (?,?)", [
    ids.school,
    ids.otherSchool,
  ]);
  await db.end();
  await store.close();
}
