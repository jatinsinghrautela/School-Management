import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createStore } from "../src/store.js";
import { createApp } from "../src/app.js";
import { seed } from "../src/seed.js";
async function fixture() {
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
  const tokens = {};
  for (const role of ["principal", "teacher", "student", "director", "owner"])
    tokens[role] = (
      await call("/auth/login", null, {
        email: `${role}@orbit.local`,
        password: "OrbitDemo123!",
      })
    ).data.token;
  return {
    store,
    call,
    tokens,
    p: "/schools/school-north",
    close: async () => {
      await new Promise((r) => server.close(r));
      await store.close();
    },
  };
}
test("school operations enforce copy/seat capacity, history, ownership, stale edits and safe printable documents", async () => {
  const { store, call, tokens: t, p, close } = await fixture();
  try {
    const student = (await store.all("users")).find(
      (u) => u.id === "user-student",
    );
    await store.put("users", {
      ...student,
      id: "student-two",
      email: "second@orbit.local",
      name: "Synthetic second student",
    });
    const bookBody = {
      code: "BOOK-1",
      title: "Synthetic learning",
      author: "School author",
      copies: 1,
      active: true,
    };
    assert.equal(
      (await call(p + "/library/books", t.student, bookBody)).status,
      403,
    );
    const book = await call(p + "/library/books", t.principal, bookBody);
    assert.equal(book.status, 200);
    const dueDate = new Date(Date.now() + 14 * 86400000)
      .toISOString()
      .slice(0, 10);
    const loans = await Promise.all(
      ["user-student", "user-teacher"].map((userId) =>
        call(p + "/library/loans", t.principal, {
          bookId: book.data.id,
          userId,
          dueDate,
          requestKey: randomUUID(),
        }),
      ),
    );
    assert.deepEqual(loans.map((r) => r.status).sort(), [200, 409]);
    const loan = loans.find((r) => r.status === 200).data;
    assert.equal(
      (await call(p + "/operations", t.student)).data.books[0].available,
      0,
    );
    assert.equal(
      (
        await call(p + "/library/books", t.principal, {
          ...book.data,
          active: false,
        })
      ).status,
      409,
    );
    const returns = await Promise.all([
      call(p + `/library/loans/${loan.id}/return`, t.principal, {
        reason: "Returned in good condition",
      }),
      call(p + `/library/loans/${loan.id}/return`, t.principal, {
        reason: "Duplicate return attempt",
      }),
    ]);
    assert.deepEqual(returns.map((r) => r.status).sort(), [200, 409]);
    assert.equal(
      (await call(p + "/operations", t.student)).data.books[0].available,
      1,
    );
    assert.equal(
      (
        await call(
          "/schools/school-west/library/loans/" + loan.id + "/return",
          t.director,
          { reason: "Cross school attempt" },
        )
      ).status,
      404,
    );
    const route = await call(p + "/transport/routes", t.principal, {
      code: "R-1",
      name: "Synthetic route",
      vehicle: "School bus",
      capacity: 1,
      stops: ["Gate A", "Gate B"],
      active: true,
    });
    assert.equal(route.status, 200);
    const assignments = await Promise.all(
      ["user-student", "student-two"].map((studentId) =>
        call(p + "/transport/assignments", t.principal, {
          routeId: route.data.id,
          studentId,
          pickupStop: "Gate A",
        }),
      ),
    );
    assert.deepEqual(assignments.map((r) => r.status).sort(), [200, 409]);
    const assignment = assignments.find((r) => r.status === 200).data;
    assert.equal(
      (
        await call(p + "/transport/routes", t.principal, {
          ...route.data,
          stops: ["Gate B"],
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          p + `/transport/assignments/${assignment.id}/release`,
          t.student,
          { reason: "Attempt unauthorized release" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          p + `/transport/assignments/${assignment.id}/release`,
          t.principal,
          { reason: "Route change requested" },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(p + "/transport/routes", t.principal, {
          ...route.data,
          active: false,
        })
      ).status,
      200,
    );
    const assetBody = {
      code: "A-1",
      name: "School tablet",
      category: "IT",
      quantity: 2,
      status: "in-use",
      custodianId: "user-teacher",
      reason: "Register school-owned devices",
    };
    const asset = await call(p + "/assets", t.principal, assetBody);
    assert.equal(asset.status, 200);
    assert.equal(
      (await call(p + "/operations", t.student)).data.assets.length,
      0,
    );
    assert.equal(
      (await call(p + "/operations", t.teacher)).data.assets.length,
      1,
    );
    assert.equal(
      (
        await call(p + "/assets", t.principal, {
          ...asset.data,
          version: 0,
          reason: "Stale update attempt",
        })
      ).status,
      409,
    );
    const ticketBody = {
      subject: "Synthetic issue",
      description: "Classroom projector needs review",
      category: "facilities",
      requestKey: randomUUID(),
    };
    const ticket = await call(p + "/tickets", t.student, ticketBody);
    assert.equal(ticket.status, 200);
    assert.equal(
      (await call(p + "/tickets", t.student, ticketBody)).data.id,
      ticket.data.id,
    );
    assert.equal(
      (await call(p + "/operations", t.teacher)).data.tickets.length,
      0,
    );
    assert.equal(
      (
        await call(p + `/tickets/${ticket.data.id}/status`, t.teacher, {
          status: "resolved",
          reason: "Attempt forbidden decision",
          version: 1,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(p + `/tickets/${ticket.data.id}/status`, t.principal, {
          status: "resolved",
          reason: "Projector connection repaired",
          version: 1,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call(p + `/tickets/${ticket.data.id}/status`, t.principal, {
          status: "closed",
          reason: "Stale closure attempt",
          version: 1,
        })
      ).status,
      409,
    );
    const visitor = await call(p + "/visitors", t.principal, {
      name: "Synthetic visitor",
      purpose: "Scheduled school meeting",
      hostId: "user-teacher",
      requestKey: randomUUID(),
    });
    assert.equal(visitor.status, 200);
    assert.equal(
      (await call(p + "/operations", t.student)).data.visitors.length,
      0,
    );
    assert.equal(
      (await call(p + `/visitors/${visitor.data.id}/checkout`, t.principal, {}))
        .status,
      200,
    );
    assert.equal(
      (await call(p + `/visitors/${visitor.data.id}/checkout`, t.principal, {}))
        .status,
      409,
    );
    assert.equal(
      (
        await call(p + "/document-requests", t.student, {
          studentId: "student-two",
          type: "certificate",
          details: "Attempt other student request",
          requestKey: randomUUID(),
        })
      ).status,
      403,
    );
    const doc = await call(p + "/document-requests", t.student, {
      studentId: "user-student",
      type: "certificate",
      details: "Participation confirmation",
      requestKey: randomUUID(),
    });
    assert.equal(doc.status, 200);
    const docPath = p + `/document-requests/${doc.data.id}`;
    assert.equal((await call(docPath + "/download", t.student)).status, 409);
    assert.equal(
      (
        await call(docPath + "/decision", t.principal, {
          version: 1,
          status: "ready",
          reason: "Verified school participation",
          reference: "REF-1",
          content: "School-approved text <script>alert(1)</script>",
        })
      ).status,
      200,
    );
    const html = (await call(docPath + "/download", t.student)).data.html;
    assert(html.includes("&lt;script&gt;"));
    assert(!html.includes("<script>"));
    assert.equal((await call(docPath + "/download", t.teacher)).status, 404);
    const inbox = await call(p + "/inbox", t.student);
    assert(inbox.data.items.some((x) => x.title === "Support ticket updated"));
    assert(
      inbox.data.items.some((x) => x.title === "Document request updated"),
    );
    const notice = inbox.data.items.find((x) => x.id.startsWith("notice:"));
    assert(notice);
    assert.equal(
      (await call(p + "/inbox/read", t.student, { id: notice.id })).status,
      200,
    );
    assert(
      (await call(p + "/inbox", t.student)).data.items.find(
        (x) => x.id === notice.id,
      ).readAt,
    );
    const support = (
      await call("/platform/support", t.owner, {
        userId: "user-principal",
        reason: "Reproduce school operations",
        acknowledge: true,
      })
    ).data.token;
    assert.equal((await call(p + "/operations", support)).status, 200);
    assert.equal((await call(p + "/assets", support, assetBody)).status, 403);
    assert.equal(
      (await call(p + "/inbox/read", support, { id: notice.id })).status,
      403,
    );
    const settings = {
      displayName: "Synthetic school",
      accent: "#336655",
      locale: "hi-IN",
      timeZone: "Asia/Kolkata",
      version: 0,
    };
    assert.equal(
      (await call(p + "/school-settings", t.student, settings)).status,
      403,
    );
    assert.equal(
      (
        await call(p + "/school-settings", t.principal, {
          ...settings,
          accent: "url(javascript:x)",
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(p + "/school-settings", t.principal, settings)).status,
      200,
    );
    assert.equal(
      (await call(p + "/school-settings", t.principal, settings)).status,
      409,
    );
    assert.equal(
      (await call(p + "/workspace", t.principal)).data.schoolSettings.locale,
      "hi-IN",
    );
  } finally {
    await close();
  }
});
test("verified parent portal isolates linked children, activation, current reports, messaging, and revocation", async () => {
  const { store, call, tokens: t, p, close } = await fixture();
  try {
    const student = (await store.all("users")).find(
      (u) => u.id === "user-student",
    );
    await store.put("users", {
      ...student,
      id: "sibling",
      name: "Synthetic sibling",
      email: "sibling@orbit.local",
      classIds: ["school-north-9"],
    });
    await store.put("users", {
      ...student,
      id: "unlinked-child",
      name: "Private unlinked child",
      email: "unlinked@orbit.local",
    });
    const contact = {
      name: "Verified synthetic guardian",
      relationship: "Guardian",
      phone: "0000000000",
      email: "parent@fixture.local",
    };
    const profile = {
      birthDate: "2010-01-01",
      address: "",
      admissionNumber: "",
      guardianConsent: true,
      guardians: [contact],
    };
    assert.equal(
      (await call(p + "/students/user-student/profile", t.principal, profile))
        .status,
      200,
    );
    assert.equal(
      (await call(p + "/students/sibling/profile", t.principal, profile))
        .status,
      200,
    );
    const guardians = (await call(p + "/parent-accounts", t.principal)).data
      .guardians;
    assert.equal(guardians.length, 2);
    assert(guardians[0].studentNames.length);
    const b = {
      name: "Synthetic parent",
      email: "parent@fixture.local",
      guardianIds: guardians.map((g) => g.id),
      authorized: true,
    };
    assert.equal(
      (await call(p + "/parent-accounts", t.teacher, b)).status,
      403,
    );
    assert.equal(
      (
        await call(p + "/parent-accounts", t.principal, {
          ...b,
          authorized: false,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(p + "/parent-accounts", t.principal, {
          ...b,
          guardianIds: ["foreign-guardian"],
        })
      ).status,
      400,
    );
    const parent = await call(p + "/parent-accounts", t.principal, b);
    assert.equal(parent.status, 200);
    assert(!parent.data.user.passwordHash);
    assert(parent.data.user.passwordChangeRequired);
    assert.equal(
      (await call(p + "/parent-accounts", t.principal, b)).data.user.id,
      parent.data.user.id,
    );
    const reset = await call(
      `/users/${parent.data.user.id}/recovery`,
      t.principal,
      {},
    );
    assert.equal(reset.status, 200);
    assert.equal(
      (
        await call("/auth/reset-password", null, {
          token: reset.data.token,
          password: "SyntheticParent123!",
        })
      ).status,
      200,
    );
    const pt = (
      await call("/auth/login", null, {
        email: b.email,
        password: "SyntheticParent123!",
      })
    ).data.token;
    assert(pt);
    const workspace = (await call(p + "/workspace", pt)).data;
    assert.equal(workspace.users.length, 1);
    assert.equal(workspace.classes.length, 0);
    assert.equal(workspace.attendance.length, 0);
    assert.equal((await call(p + "/student-records", pt)).status, 403);
    assert.equal((await call(p + "/directory", pt)).status, 403);
    assert.equal((await call("/schools/school-west/family", pt)).status, 403);
    const family = await call(p + "/family", pt);
    assert.equal(family.status, 200);
    assert.equal(family.data.children.length, 2);
    assert.equal(
      (await call(p + "/family?childId=unlinked-child", pt)).status,
      404,
    );
    assert.equal(
      (await call(p + "/family?childId=sibling", pt)).data.child.id,
      "sibling",
    );
    assert.equal(
      (
        await call(p + "/students/user-student/profile", t.principal, {
          ...profile,
          birthDate: "2010-02-01",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call(p + "/family", pt)).data.children.length,
      2,
      "Unchanged guardian contacts retain parent links",
    );
    const exam = (await store.all("exams")).find((e) => e.id === "exam-demo");
    await store.put("exams", { ...exam, status: "published", version: 1 });
    const report = {
      id: "report-linked",
      schoolId: "school-north",
      studentId: "user-student",
      classId: "school-north-10",
      examId: exam.id,
      version: 1,
      schoolName: "Synthetic school",
      studentName: "Synthetic child",
      className: "Synthetic class",
      academicYear: "2026",
      examName: "Test report",
      rows: [{ name: "Synthetic subject", score: 75, maxScore: 100 }],
      percentage: 75,
      grade: "B",
      passed: true,
      publishedAt: new Date().toISOString(),
    };
    await store.put("reports", report);
    await store.put("reports", {
      ...report,
      id: "report-private",
      studentId: "unlinked-child",
    });
    assert.equal(
      (await call(p + "/family?childId=user-student", pt)).data.child.reports
        .length,
      1,
    );
    assert.equal(
      (await call(p + "/family/reports/report-linked", pt)).status,
      200,
    );
    assert.equal(
      (await call(p + "/family/reports/report-private", pt)).status,
      404,
    );
    await store.put("exams", { ...exam, status: "draft", version: 1 });
    assert.equal(
      (await call(p + "/family/reports/report-linked", pt)).status,
      404,
    );
    await store.put("exams", { ...exam, status: "published", version: 1 });
    const peers = (await call(p + "/messages", pt)).data.peers;
    assert.equal(peers.length, 1);
    assert.equal(peers[0].studentId, "user-student");
    const mb = {
      toId: "user-teacher",
      studentId: "user-student",
      body: "Synthetic classwork question",
      requestKey: randomUUID(),
    };
    const sent = await call(p + "/messages", pt, mb);
    assert.equal(sent.status, 200);
    assert.equal((await call(p + "/messages", pt, mb)).data.id, sent.data.id);
    assert.equal(
      (
        await call(p + "/messages", pt, {
          ...mb,
          studentId: "sibling",
          requestKey: randomUUID(),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(p + "/messages", pt, {
          ...mb,
          studentId: "unlinked-child",
          requestKey: randomUUID(),
        })
      ).status,
      403,
    );
    assert.equal(
      (await call(p + "/messages", t.principal)).data.messages.length,
      0,
      "Leadership cannot inspect private conversations",
    );
    const inbox = (await call(p + "/inbox", t.teacher)).data.items;
    const mi = inbox.find((x) => x.id === `message:${sent.data.id}`);
    assert(mi);
    assert.equal(
      (await call(p + "/inbox/read", t.teacher, { id: mi.id })).status,
      200,
    );
    assert((await call(p + "/messages", pt)).data.messages[0].readAt);
    const teacherMsg = await call(p + "/messages", t.teacher, {
      toId: parent.data.user.id,
      studentId: "user-student",
      body: "Synthetic teacher response",
      requestKey: randomUUID(),
    });
    assert.equal(teacherMsg.status, 200);
    const doc = await call(p + "/document-requests", pt, {
      studentId: "user-student",
      type: "bonafide",
      details: "Synthetic document request",
      requestKey: randomUUID(),
    });
    assert.equal(doc.status, 200);
    assert.equal(
      (
        await call(
          p + `/document-requests/${doc.data.id}/decision`,
          t.principal,
          {
            version: 1,
            status: "ready",
            reason: "Verified synthetic request",
            content: "School-provided synthetic confirmation",
            reference: "TEST-REF",
          },
        )
      ).status,
      200,
    );
    assert.equal(
      (await call(p + `/document-requests/${doc.data.id}/download`, pt)).status,
      200,
    );
    const links = (await call(p + "/parent-accounts", t.principal)).data.links;
    const guardianId = (await store.all("studentGuardians")).find(
        (x) => x.studentId === "user-student" && x.active,
      ).guardianId,
      link = links.find((x) => x.guardianId === guardianId);
    assert.equal(
      (
        await call(p + `/parent-links/${link.id}/revoke`, t.principal, {
          reason: "Authorization no longer applies",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call(p + "/family?childId=user-student", pt)).status,
      404,
    );
    assert.equal(
      (await call(p + "/family/reports/report-linked", pt)).status,
      404,
    );
    assert.equal((await call(p + "/messages", pt)).data.messages.length, 0);
    assert.equal((await call(p + "/messages", pt, mb)).status, 403);
    assert.equal(
      (await call(p + `/document-requests/${doc.data.id}/download`, pt)).status,
      404,
    );
    assert.equal((await call(p + "/operations", pt)).data.documents.length, 0);
    assert(
      !(await call(p + "/inbox", pt)).data.items.some(
        (x) => x.sourceKind === "message" || x.sourceKind === "document",
      ),
    );
    assert.equal((await call(p + "/family", pt)).data.children.length, 1);
    assert(
      (await store.all("audit")).some(
        (x) => x.action === "parent.link-revoked",
      ),
    );
  } finally {
    await close();
  }
});
