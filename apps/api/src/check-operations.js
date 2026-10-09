import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { createStore } from "./store.js";
import { tableFor } from "./relational-store.js";
const store = await createStore("mysql");
const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "orbit",
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || "orbit_school",
});
const sid = randomUUID(),
  otherSid = randomUUID(),
  uid = randomUUID(),
  parentId = randomUUID(),
  duplicate = randomUUID(),
  rows = new Map();
async function put(kind, fields) {
  const row = { id: randomUUID(), schoolId: sid, ...fields };
  rows.set(kind, [...(rows.get(kind) || []), row.id, duplicate]);
  await store.put(kind, row);
  assert((await store.all(kind, sid)).some((x) => x.id === row.id));
  return row;
}
const conflict = (fn) => assert.rejects(fn, (e) => e.status === 409);
try {
  await store.put("schools", {
    id: sid,
    name: "Disposable Phase 3 fixture",
    code: sid,
  });
  await store.put("schools", {
    id: otherSid,
    name: "Disposable other fixture",
    code: otherSid,
  });
  for (const [userId, role] of [
    [uid, "student"],
    [parentId, "parent"],
  ])
    await store.put("users", {
      id: userId,
      name: "Disposable account",
      email: `${userId}@fixture.local`,
      role,
      orgId: null,
      passwordHash: "synthetic-nonlogin",
      schoolIds: [sid],
      classIds: [],
      active: true,
    });
  const guardian = await put("guardians", {
    name: "Disposable guardian",
    relationship: "Guardian",
    email: "synthetic@fixture.local",
    phone: "",
  });
  await put("studentGuardians", {
    guardianId: guardian.id,
    studentId: uid,
    active: true,
  });
  const link = await put("parentLinks", {
    guardianId: guardian.id,
    userId: parentId,
    active: true,
  });
  assert.equal(
    (await store.all("parentLinks", sid)).find((x) => x.id === link.id).active,
    true,
  );
  await conflict(() => store.put("parentLinks", { ...link, id: duplicate }));
  await conflict(() =>
    store.put("parentLinks", { ...link, id: duplicate, schoolId: otherSid }),
  );
  const book = await put("libraryBooks", {
    code: "SYNTHETIC-BOOK",
    title: "Disposable book",
    author: "Fixture",
    copies: 1,
    active: true,
    version: 1,
  });
  await conflict(() =>
    store.put("libraryBooks", {
      ...book,
      id: duplicate,
      copies: 0,
      code: "INVALID",
    }),
  );
  const loan = await put("libraryLoans", {
    bookId: book.id,
    userId: uid,
    dueDate: "2026-11-01",
    status: "open",
    requestKey: randomUUID(),
  });
  await conflict(() => store.put("libraryLoans", { ...loan, id: duplicate }));
  await conflict(() =>
    store.put("libraryLoans", {
      ...loan,
      id: duplicate,
      schoolId: otherSid,
      requestKey: randomUUID(),
    }),
  );
  const route = await put("transportRoutes", {
    code: "SYNTHETIC-ROUTE",
    name: "Disposable route",
    vehicle: "Fixture",
    capacity: 1,
    active: true,
    version: 1,
    stops: ["Fixture gate"],
  });
  const assignment = await put("transportAssignments", {
    routeId: route.id,
    studentId: uid,
    active: true,
  });
  await conflict(() =>
    store.put("transportAssignments", { ...assignment, id: duplicate }),
  );
  await conflict(() =>
    store.put("transportAssignments", {
      ...assignment,
      id: duplicate,
      schoolId: otherSid,
    }),
  );
  await store.put("transportAssignments", { ...assignment, active: false });
  await store.put("transportAssignments", { ...assignment, id: duplicate });
  const asset = await put("assets", {
    code: "SYNTHETIC-ASSET",
    name: "Disposable asset",
    category: "Fixture",
    quantity: 1,
    status: "available",
    custodianId: null,
    version: 1,
    history: [],
  });
  await conflict(() =>
    store.put("assets", {
      ...asset,
      id: duplicate,
      code: "INVALID",
      quantity: 0,
    }),
  );
  const ticket = await put("tickets", {
    userId: uid,
    status: "open",
    requestKey: randomUUID(),
    version: 1,
    history: [],
  });
  await conflict(() =>
    store.put("tickets", {
      ...ticket,
      id: duplicate,
      status: "invalid",
      requestKey: randomUUID(),
    }),
  );
  const visitor = await put("visitors", {
    hostId: uid,
    name: "Disposable visitor",
    status: "checked-in",
    requestKey: randomUUID(),
  });
  await conflict(() => store.put("visitors", { ...visitor, id: duplicate }));
  const doc = await put("documentRequests", {
    userId: parentId,
    studentId: uid,
    type: "certificate",
    status: "requested",
    requestKey: randomUUID(),
    version: 1,
  });
  await conflict(() =>
    store.put("documentRequests", { ...doc, id: duplicate }),
  );
  await put("notifications", {
    userId: uid,
    title: "Disposable notification",
    body: "Fixture",
    sourceKind: "operation",
    createdAt: new Date().toISOString(),
  });
  const notice = await put("notices", {
    title: "Disposable notice",
    body: "Fixture",
    audience: "all",
    classId: null,
  });
  const read = await put("noticeReads", {
    userId: uid,
    noticeId: notice.id,
    readAt: new Date().toISOString(),
  });
  await conflict(() => store.put("noticeReads", { ...read, id: duplicate }));
  const msg = await put("messages", {
    fromId: parentId,
    toId: uid,
    studentId: uid,
    requestKey: randomUUID(),
    body: "Fixture message",
    createdAt: new Date().toISOString(),
    readAt: null,
  });
  await conflict(() =>
    store.put("messages", {
      ...msg,
      id: duplicate,
      toId: parentId,
      requestKey: randomUUID(),
    }),
  );
  const settings = await put("schoolSettings", {
    displayName: "Disposable school",
    accent: "#11796f",
    locale: "en-IN",
    timeZone: "Asia/Kolkata",
    version: 1,
  });
  await conflict(() =>
    store.put("schoolSettings", { ...settings, id: duplicate }),
  );
  console.log(
    "Phase 3 MySQL verification passed: parent role, scoped references, active assignments, uniqueness, bounds and typed round-trips.",
  );
} finally {
  for (const kind of [
    "schoolSettings",
    "messages",
    "noticeReads",
    "notices",
    "notifications",
    "documentRequests",
    "visitors",
    "tickets",
    "assets",
    "transportAssignments",
    "transportRoutes",
    "libraryLoans",
    "libraryBooks",
    "parentLinks",
    "studentGuardians",
    "guardians",
  ]) {
    const ids = rows.get(kind);
    if (ids?.length)
      await db.execute(
        `DELETE FROM ${tableFor(kind)} WHERE id IN (${ids.map(() => "?").join(",")})`,
        ids,
      );
  }
  await db.execute("DELETE FROM sg_user_schools WHERE user_id IN (?,?)", [
    uid,
    parentId,
  ]);
  await db.execute("DELETE FROM sg_users WHERE id IN (?,?)", [uid, parentId]);
  await db.execute("DELETE FROM sg_schools WHERE id IN (?,?)", [sid, otherSid]);
  await db.end();
  await store.close();
}
