import { brandedResource } from "./resource-document.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  id,
  managers,
  canAccessSchool,
  visibleNotice,
  noticeMatchesClasses,
  publicUser,
} from "./domain.js";
import { schoolLogo } from "./school-media.js";
import { feeBalance } from "./fees.js";
import { holidaysOn } from "./calendar.js";
import {
  route,
  manage,
  normal,
  fail,
  text,
  reason,
  key,
  audit,
  children,
  member,
  escape,
  printable,
} from "./operations-common.js";
export const defaultSettings = {
  displayName: "",
  accent: "#11796f",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
  version: 0,
};
export async function linkParentAccount(tx, req, b, hash) {
  if (
    !text(b.name) ||
    !text(b.email) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) ||
    b.authorized !== true ||
    !Array.isArray(b.guardianIds) ||
    b.guardianIds.length < 1 ||
    b.guardianIds.length > 10 ||
    !b.guardianIds.every((x) => typeof x === "string") ||
    new Set(b.guardianIds).size !== b.guardianIds.length
  )
    fail(
      400,
      "Verify guardian identity and authorization, then choose name, email and guardian contacts",
    );
  const gs = await tx.all("guardians", req.school.id),
    sl = await tx.all("studentGuardians", req.school.id),
    users = await tx.all("users"),
    email = b.email.trim().toLowerCase();
  if (
    !b.guardianIds.every(
      (g) =>
        gs.some((x) => x.id === g) &&
        sl.some((x) => x.guardianId === g && x.active),
    )
  )
    fail(400, "Choose current guardian contacts from this school");
  let user = users.find((u) => u.email.toLowerCase() === email);
  if (
    user &&
    (user.role !== "parent" ||
      user.active === false ||
      !canAccessSchool(user, req.school) ||
      (!req.school.orgId && user.schoolIds.some((s) => s !== req.school.id)))
  )
    fail(409, "Email belongs to an incompatible or inactive account");
  if (user) user = await member(tx, req, user.id, ["parent"]);
  else {
    user = {
      id: id(),
      name: b.name.trim(),
      email,
      role: "parent",
      orgId: req.school.orgId || null,
      schoolIds: [req.school.id],
      classIds: [],
      active: true,
      passwordHash: hash,
      passwordChangeRequired: true,
      authVersion: 0,
    };
    await tx.put("users", user);
  }
  const existing = await tx.all("parentLinks", req.school.id);
  for (const guardianId of b.guardianIds) {
    const old = existing.find(
      (l) => l.userId === user.id && l.guardianId === guardianId,
    );
    if (!old?.active)
      await tx.put("parentLinks", {
        id: old?.id || id(),
        schoolId: req.school.id,
        userId: user.id,
        guardianId,
        active: true,
        verifiedBy: req.user.id,
        verifiedAt: new Date().toISOString(),
      });
  }
  await audit(tx, req, "parent.linked", {
    userId: user.id,
    guardianIds: b.guardianIds,
  });
  return {
    user: publicUser(user),
    message:
      "Parent linked. Use People → Recover account for private activation; no password is shared or emailed automatically.",
  };
}
async function peers(tx, req) {
  if (!["teacher", "parent"].includes(req.user.role)) return [];
  const users = (await tx.all("users")).filter(
      (u) => u.active !== false && canAccessSchool(u, req.school),
    ),
    current = users.find(
      (u) => u.id === req.user.id && u.role === req.user.role,
    );
  if (!current) return [];
  const links = (await tx.all("parentLinks", req.school.id)).filter(
      (l) => l.active,
    ),
    guardianLinks = (await tx.all("studentGuardians", req.school.id)).filter(
      (l) => l.active,
    ),
    guardianKids = new Map(),
    parentKids = new Map();
  for (const l of guardianLinks) {
    if (!guardianKids.has(l.guardianId))
      guardianKids.set(l.guardianId, new Set());
    guardianKids.get(l.guardianId).add(l.studentId);
  }
  for (const l of links) {
    if (!parentKids.has(l.userId)) parentKids.set(l.userId, new Set());
    for (const kid of guardianKids.get(l.guardianId) || [])
      parentKids.get(l.userId).add(kid);
  }
  const result = [],
    parents =
      current.role === "parent"
        ? [current]
        : users.filter((u) => u.role === "parent"),
    teachers =
      current.role === "teacher"
        ? [current]
        : users.filter((u) => u.role === "teacher");
  for (const parent of parents)
    for (const child of users.filter(
      (u) => u.role === "student" && parentKids.get(parent.id)?.has(u.id),
    ))
      for (const teacher of teachers)
        if (teacher.classIds.some((c) => child.classIds.includes(c))) {
          const peer = current.role === "teacher" ? parent : teacher;
          result.push({
            userId: peer.id,
            name: peer.name,
            studentId: child.id,
            studentName: child.name,
          });
        }
  return result;
}
async function inbox(tx, req) {
  const kids = await children(tx, req),
    classes = new Set(kids.flatMap((c) => c.classIds)),
    reads = await tx.all("noticeReads", req.school.id),
    pairs = await peers(tx, req);
  const notices = (await tx.all("notices", req.school.id)).filter((n) =>
    req.user.role === "parent"
      ? (n.audience === "all" || n.audience === "parent") &&
        noticeMatchesClasses(n, [...classes])
      : visibleNotice(req.user, n),
  );
  const documents = await tx.all("documentRequests", req.school.id);
  const notifications = (await tx.all("notifications", req.school.id)).filter(
    (n) =>
      n.userId === req.user.id &&
      (req.user.role !== "parent" ||
        n.sourceKind !== "document" ||
        documents.some(
          (d) => d.id === n.sourceId && kids.some((k) => k.id === d.studentId),
        )),
  );
  const messages = (await tx.all("messages", req.school.id)).filter(
    (m) =>
      m.toId === req.user.id &&
      pairs.some((p) => p.userId === m.fromId && p.studentId === m.studentId),
  );
  return [
    ...notifications,
    ...notices.map(({ schoolLogo, ...n }) => ({
      ...n,
      id: `notice:${n.id}`,
      readAt:
        reads.find((x) => x.userId === req.user.id && x.noticeId === n.id)
          ?.readAt || null,
      sourceKind: "notice",
    })),
    ...messages.map((m) => ({
      id: `message:${m.id}`,
      title: "New school message",
      body: `Message from ${m.fromName} about ${m.studentName}.`,
      readAt: m.readAt || null,
      createdAt: m.createdAt,
      sourceKind: "message",
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function createFamilySocialRouter(store) {
  const r = Router({ mergeParams: true });
  r.get(
    "/school-settings",
    route(async (req, res) =>
      res.json({
        ...defaultSettings,
        ...(await store.all("schoolSettings", req.school.id))[0],
        logoDataUri: await schoolLogo(store, req.school.id),
        uploadsEnabled: !!process.env.CLAMAV_COMMAND,
      }),
    ),
  );
  r.post(
    "/school-settings",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !text(b.displayName, 120) ||
        !/^#[a-f0-9]{6}$/i.test(b.accent || "") ||
        !["en-IN", "en-GB", "en-US", "hi-IN"].includes(b.locale) ||
        ![
          "Asia/Kolkata",
          "Etc/UTC",
          "Europe/London",
          "America/New_York",
        ].includes(b.timeZone)
      )
        fail(
          400,
          "Choose a school display name, hex accent, supported locale and timezone",
        );
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = (await tx.all("schoolSettings", req.school.id))[0];
          if ((old?.version || 0) !== b.version)
            fail(409, "School settings changed; reload before saving");
          const row = {
            ...old,
            id: old?.id || id(),
            schoolId: req.school.id,
            displayName: b.displayName.trim(),
            accent: b.accent,
            locale: b.locale,
            timeZone: b.timeZone,
            version: (old?.version || 0) + 1,
          };
          await tx.put("schoolSettings", row);
          await audit(tx, req, "school.settings-updated", {
            previous: old || null,
            settings: row,
          });
          return row;
        }),
      );
    }),
  );
  r.get(
    "/parent-accounts",
    route(async (req, res) => {
      if (!managers.includes(req.user.role))
        fail(403, "School leadership required");
      const users = await store.all("users");
      const gs = await store.all("guardians", req.school.id),
        links = await store.all("studentGuardians", req.school.id),
        parents = (await store.all("users")).filter(
          (u) => u.role === "parent" && canAccessSchool(u, req.school),
        );
      res.json({
        guardians: gs
          .filter((g) => links.some((l) => l.guardianId === g.id && l.active))
          .map((g) => ({
            ...g,
            studentNames: links
              .filter((l) => l.guardianId === g.id && l.active)
              .map(
                (l) =>
                  users.find((u) => u.id === l.studentId)?.name || "Student",
              ),
          })),
        links: await store.all("parentLinks", req.school.id),
        parents: parents.map(publicUser),
      });
    }),
  );
  r.post(
    "/parent-accounts",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      const hash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      res.json(
        await store.transaction(req.school.id, (tx) =>
          linkParentAccount(tx, req, b, hash),
        ),
      );
    }),
  );
  r.post(
    "/parent-links/:linkId/revoke",
    route(async (req, res) => {
      manage(req);
      if (!reason(req.body.reason)) fail(400, "Give a revocation reason");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = (await tx.all("parentLinks", req.school.id)).find(
            (x) => x.id === req.params.linkId,
          );
          if (!old) fail(404, "Parent link not found");
          if (!old.active) fail(409, "Link already revoked");
          const row = {
            ...old,
            active: false,
            endedAt: new Date().toISOString(),
            endReason: req.body.reason.trim(),
          };
          await tx.put("parentLinks", row);
          await audit(tx, req, "parent.link-revoked", {
            linkId: row.id,
            reason: row.endReason,
          });
          return row;
        }),
      );
    }),
  );
  r.get(
    "/family",
    route(async (req, res) => {
      if (req.user.role !== "parent") fail(403, "Parent account required");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const kids = await children(tx, req),
            student = kids.find(
              (u) => u.id === (req.query.childId || kids[0]?.id),
            );
          const classes = await tx.all("classes", req.school.id);
          const result = {
            children: kids.map((u) => ({
              id: u.id,
              name: u.name,
              classes: u.classIds
                .map((c) => classes.find((x) => x.id === c)?.name)
                .filter(Boolean),
            })),
            child: null,
          };
          if (!student) {
            if (req.query.childId) fail(404, "Linked child not found");
            return result;
          }
          const subjects = await tx.all("subjects", req.school.id),
            employees = await tx.all("users"),
            sessions = await tx.all("attendanceSessions", req.school.id);
          const allowed = new Set(student.classIds),
            exams = await tx.all("exams", req.school.id),
            calendar = await tx.all("calendar", req.school.id),
            payments = await tx.all("feePayments", req.school.id),
            concessions = await tx.all("feeConcessions", req.school.id);
          return {
            ...result,
            child: {
              id: student.id,
              name: student.name,
              attendance: (await tx.all("attendance", req.school.id))
                .filter((x) => x.studentId === student.id)
                .map((x) => ({
                  ...x,
                  sessionName:
                    sessions.find((s) => s.id === x.sessionId)?.name || "Daily",
                  excludedFromAttendance:
                    holidaysOn(calendar, req.school.id, x.date).length > 0,
                })),
              reports: (await tx.all("reports", req.school.id)).filter(
                (x) =>
                  x.studentId === student.id &&
                  exams.some(
                    (e) =>
                      e.id === x.examId &&
                      e.status === "published" &&
                      e.version === x.version,
                  ),
              ),
              resources: (await tx.all("resources", req.school.id))
                .filter((x) => allowed.has(x.classId))
                .map(({ fileId, schoolLogo, ...x }) => ({
                  ...x,
                  hasAttachment: !!fileId,
                })),
              timetable: (await tx.all("timetable", req.school.id))
                .filter((x) => !x.cancelled && allowed.has(x.classId))
                .map((x) => ({
                  ...x,
                  subjectName:
                    subjects.find((s) => s.id === x.subjectId)?.name ||
                    "Subject",
                  teacherName:
                    employees.find((u) => u.id === x.teacherId)?.name ||
                    "Teacher",
                })),
              fees: (await tx.all("feeCharges", req.school.id))
                .filter((x) => x.studentId === student.id)
                .map((x) => ({
                  ...x,
                  ...feeBalance(x, payments, concessions),
                })),
              notices: (await tx.all("notices", req.school.id)).filter(
                (x) =>
                  ["all", "parent", "student"].includes(x.audience) &&
                  noticeMatchesClasses(x, [...allowed]),
              ),
              calendar: calendar
                .filter(
                  (x) =>
                    !x.cancelled &&
                    ["all", "parent", "student"].includes(x.audience) &&
                    (!x.classId || allowed.has(x.classId)),
                )
                .map(({ reason, ...x }) => x),
            },
          };
        }),
      );
    }),
  );
  r.get(
    "/family/resources/:resourceId/download",
    route(async (req, res) => {
      if (req.user.role !== "parent") fail(403, "Parent account required");
      const kids = await children(store, req),
        classes = new Set(kids.flatMap((u) => u.classIds));
      const resource = (await store.all("resources", req.school.id)).find(
        (x) => x.id === req.params.resourceId && classes.has(x.classId),
      );
      const file =
        resource &&
        (await store.all("files", req.school.id)).find(
          (x) =>
            x.id === resource.fileId &&
            x.scanStatus === "clean" &&
            !x.staged &&
            !x.deleted &&
            ["application/pdf", "image/png", "image/jpeg"].includes(x.mime),
        );
      if (!file || !/^[a-f0-9-]{36}$/i.test(file.id))
        fail(404, "Authorized class attachment not found");
      let bytes;
      try {
        bytes = await readFile(
          fileURLToPath(new URL(`../data/uploads/${file.id}`, import.meta.url)),
        );
      } catch (e) {
        if (e.code === "ENOENT") fail(404, "Attachment is unavailable");
        throw e;
      }
      const logo =
        resource.schoolLogo || (await schoolLogo(store, req.school.id));
      const result = await brandedResource(
        bytes,
        file.mime,
        req.school,
        resource,
        logo,
      );
      res.json({
        filename: logo ? `class-resource-${resource.id}.pdf` : file.name,
        mime: result.mime,
        base64: result.bytes.toString("base64"),
      });
    }),
  );
  r.get(
    "/family/reports/:reportId",
    route(async (req, res) => {
      if (req.user.role !== "parent") fail(403, "Parent account required");
      const kids = await children(store, req),
        exams = await store.all("exams", req.school.id),
        report = (await store.all("reports", req.school.id)).find(
          (x) =>
            x.id === req.params.reportId &&
            kids.some((u) => u.id === x.studentId) &&
            exams.some(
              (e) =>
                e.id === x.examId &&
                e.status === "published" &&
                e.version === x.version,
            ),
        );
      if (!report) fail(404, "Current published report not found");
      res.json({
        filename: `report-${report.id}.html`,
        html: printable(
          report.examName,
          report.schoolName,
          `<p>${escape(report.studentName)} · ${escape(report.className)} · ${escape(report.academicYear)}</p><table><tr><th>Subject</th><th>Score</th><th>Maximum</th></tr>${report.rows.map((x) => `<tr><td>${escape(x.name)}</td><td>${escape(x.score)}</td><td>${escape(x.maxScore)}</td></tr>`).join("")}</table><p>Grade ${escape(report.grade)} · ${escape(report.percentage.toFixed(2))}%</p><p>Published version ${escape(report.version)} · ${escape(report.publishedAt)}</p>`,
          report.schoolLogo || (await schoolLogo(store, req.school.id)),
        ),
      });
    }),
  );
  r.get(
    "/inbox",
    route(async (req, res) => {
      if (req.user.role === "owner")
        fail(403, "School inbox requires a school account");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const items = await inbox(tx, req),
            receipts = managers.includes(req.user.role)
              ? await tx.all("noticeReads", req.school.id)
              : [],
            users = receipts.length ? await tx.all("users") : [],
            notices = receipts.length
              ? await tx.all("notices", req.school.id)
              : [];
          return {
            items,
            noticeReceipts: receipts.map((x) => ({
              id: x.id,
              title:
                notices.find((n) => n.id === x.noticeId)?.title || "Notice",
              readerName:
                users.find((u) => u.id === x.userId)?.name || "Account",
              readAt: x.readAt,
            })),
          };
        }),
      );
    }),
  );
  r.post(
    "/inbox/read",
    route(async (req, res) => {
      normal(req);
      if (!text(req.body.id, 120)) fail(400, "Choose an inbox item");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const item = (await inbox(tx, req)).find((x) => x.id === req.body.id);
          if (!item) fail(404, "Inbox item not found");
          const readAt = item.readAt || new Date().toISOString();
          if (item.id.startsWith("notice:")) {
            const noticeId = item.id.slice(7),
              old = (await tx.all("noticeReads", req.school.id)).find(
                (x) => x.userId === req.user.id && x.noticeId === noticeId,
              );
            await tx.put("noticeReads", {
              id: old?.id || id(),
              schoolId: req.school.id,
              userId: req.user.id,
              noticeId,
              readAt,
            });
          } else if (item.id.startsWith("message:")) {
            const m = (await tx.all("messages", req.school.id)).find(
              (x) => x.id === item.id.slice(8),
            );
            await tx.put("messages", { ...m, readAt });
          } else await tx.put("notifications", { ...item, readAt });
          if (!item.readAt)
            await audit(tx, req, "inbox.read", { itemId: item.id });
          return { readAt };
        }),
      );
    }),
  );
  r.get(
    "/messages",
    route(async (req, res) => {
      if (!["teacher", "parent", ...managers].includes(req.user.role))
        fail(403, "Messaging is available to teachers and guardians");
      const ps = await peers(store, req),
        rows = (await store.all("messages", req.school.id)).filter(
          (m) =>
            (m.fromId === req.user.id || m.toId === req.user.id) &&
            ps.some(
              (p) =>
                p.userId === (m.fromId === req.user.id ? m.toId : m.fromId) &&
                p.studentId === m.studentId,
            ),
        );
      res.json({
        peers: ps,
        messages: rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      });
    }),
  );
  r.post(
    "/messages",
    route(async (req, res) => {
      normal(req);
      const b = req.body;
      if (!text(b.body, 2000) || !key(b.requestKey))
        fail(400, "Enter a message of up to 2000 characters and request key");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          await tx.lockUsers(
            [req.user.id, b.toId].filter((x) => typeof x === "string"),
          );
          const current = await member(tx, req, req.user.id, [
            "teacher",
            "parent",
          ]);
          const ps = await peers(tx, { ...req, user: current }),
            peer = ps.find(
              (p) => p.userId === b.toId && p.studentId === b.studentId,
            );
          if (!peer)
            fail(
              403,
              "Only current assigned teachers and linked guardians can message about this child",
            );
          const old = (await tx.all("messages", req.school.id)).find(
            (x) => x.requestKey === b.requestKey,
          );
          if (old) {
            if (
              old.fromId !== req.user.id ||
              old.toId !== b.toId ||
              old.studentId !== b.studentId ||
              old.body !== b.body.trim()
            )
              fail(409, "Request key was used for a different message");
            return old;
          }
          const row = {
            id: id(),
            schoolId: req.school.id,
            fromId: req.user.id,
            toId: b.toId,
            studentId: b.studentId,
            fromName: req.user.name,
            toName: peer.name,
            studentName: peer.studentName,
            body: b.body.trim(),
            requestKey: b.requestKey,
            createdAt: new Date().toISOString(),
            readAt: null,
          };
          await tx.put("messages", row);
          await audit(tx, req, "message.sent", {
            messageId: row.id,
            toId: row.toId,
            studentId: row.studentId,
          });
          return row;
        }),
      );
    }),
  );
  return r;
}
