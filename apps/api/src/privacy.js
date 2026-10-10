import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { id, managers } from "./domain.js";
import { collections } from "./store.js";
import { defaultSettings } from "./family-social.js";
import {
  route,
  normal,
  manage,
  fail,
  text,
  reason,
  key,
  audit,
} from "./operations-common.js";

const pick = (row, fields) =>
  Object.fromEntries(
    fields.filter((k) => row[k] !== undefined).map((k) => [k, row[k]]),
  );
// An explicit allow-list prevents credentials, internal notes and other users' data
// from becoming part of the download as collections evolve.
const personalRecords = {
  attendance: ["studentId", ["id", "date", "status", "classId", "sessionId"]],
  enrollments: ["studentId", ["id", "academicYearId", "classId", "status"]],
  studentProfiles: [
    "studentId",
    ["id", "admissionNumber", "birthDate", "address"],
  ],
  staffProfiles: [
    "userId",
    ["id", "employeeNumber", "jobTitle", "department", "phone", "address"],
  ],
  feeCharges: [
    "studentId",
    ["id", "name", "amountMinor", "currency", "dueDate", "academicYearId"],
  ],
  submissions: [
    "studentId",
    ["id", "resourceId", "answer", "submittedAt", "status", "late"],
  ],
  leaveRequests: [
    "userId",
    ["id", "startDate", "endDate", "type", "reason", "status"],
  ],
  libraryLoans: ["userId", ["id", "bookId", "dueDate", "status", "returnedAt"]],
  transportAssignments: ["studentId", ["id", "routeId", "stopId", "active"]],
};
export async function personalExport(tx, req) {
  const account = (await tx.all("users")).find((u) => u.id === req.user.id);
  const records = {};
  for (const [kind, [field, fields]] of Object.entries(personalRecords)) {
    records[kind] = (await tx.all(kind, req.school.id))
      .filter((r) => r[field] === account.id)
      .map((r) => pick(r, fields));
  }
  const charges = new Set(records.feeCharges.map((c) => c.id));
  for (const kind of ["feePayments", "feeConcessions"])
    records[kind] = (await tx.all(kind, req.school.id))
      .filter((r) => charges.has(r.chargeId))
      .map((r) =>
        pick(r, [
          "id",
          "chargeId",
          "amountMinor",
          "createdAt",
          "method",
          "receiptNumber",
          "reason",
          "voided",
        ]),
      );
  const exams = await tx.all("exams", req.school.id);
  records.reports = (await tx.all("reports", req.school.id))
    .filter(
      (r) =>
        r.studentId === account.id &&
        exams.some(
          (e) =>
            e.id === r.examId &&
            e.status === "published" &&
            e.version === r.version,
        ),
    )
    .map((r) => ({
      ...pick(r, [
        "id",
        "examId",
        "academicYear",
        "examName",
        "publishedAt",
        "version",
        "percentage",
        "grade",
        "passed",
        "totalScore",
        "totalMax",
      ]),
      rows: (r.rows || []).map((x) =>
        pick(x, ["name", "score", "maxScore", "percent", "passed"]),
      ),
    }));
  return {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    school: { id: req.school.id, name: req.school.name },
    account: pick(account, ["id", "name", "email", "role", "active"]),
    records,
    scope:
      "Your account and selected records in this school. Attachments, shared conversations, guardian/child data and retained internal records require school review before disclosure.",
  };
}
export function createPrivacyRouter(store) {
  const r = Router({ mergeParams: true });
  r.use((req, res, next) => {
    if (req.user.role === "owner")
      return res
        .status(403)
        .json({ error: "Use a school account for personal privacy actions" });
    next();
  });
  const exportLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    keyGenerator: (req) => req.user.id,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many export attempts; try again later" },
  });
  r.get(
    "/privacy",
    route(async (req, res) => {
      const settings = (await store.all("schoolSettings", req.school.id))[0];
      const tickets = (await store.all("tickets", req.school.id)).filter(
        (t) =>
          t.category === "privacy" &&
          (managers.includes(req.user.role) || t.userId === req.user.id),
      );
      res.json({
        policy: settings?.privacy || null,
        settingsVersion: settings?.version || 0,
        requests: tickets,
      });
    }),
  );
  r.post(
    "/privacy/policy",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !text(b.contactEmail, 200) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.contactEmail) ||
        !text(b.notice, 6000) ||
        !text(b.retention, 2000) ||
        !text(b.jurisdiction, 120) ||
        b.approved !== true
      )
        fail(
          400,
          "Provide jurisdiction, privacy contact, notice and retention rules approved by your school",
        );
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = (await tx.all("schoolSettings", req.school.id))[0];
          if ((old?.version || 0) !== b.version)
            fail(409, "School settings changed; reload before publishing");
          const privacy = {
            contactEmail: b.contactEmail.trim(),
            notice: b.notice.trim(),
            retention: b.retention.trim(),
            jurisdiction: b.jurisdiction.trim(),
            publishedAt: new Date().toISOString(),
            version: (old?.privacy?.version || 0) + 1,
          };
          await tx.put("schoolSettings", {
            ...defaultSettings,
            ...old,
            id: old?.id || id(),
            schoolId: req.school.id,
            privacy,
            version: (old?.version || 0) + 1,
          });
          await audit(tx, req, "privacy.policy-published", {
            policyVersion: privacy.version,
          });
          return { policy: privacy };
        }),
      );
    }),
  );
  r.post(
    "/privacy/export",
    exportLimit,
    route(async (req, res) => {
      normal(req);
      if (
        !text(req.body.currentPassword, 200) ||
        !(await bcrypt.compare(req.body.currentPassword, req.user.passwordHash))
      )
        fail(403, "Current password is incorrect");
      const result = await store.transaction(req.school.id, async (tx) => {
        await tx.lockUsers([req.user.id]);
        const current = (await tx.all("users")).find(
          (u) => u.id === req.user.id,
        );
        if (
          !current ||
          current.active === false ||
          current.authVersion !== req.user.authVersion ||
          current.passwordHash !== req.user.passwordHash
        )
          fail(409, "Account changed; sign in again before exporting");
        const data = await personalExport(tx, req);
        await audit(tx, req, "privacy.personal-export", {
          subjectId: req.user.id,
        });
        return data;
      });
      res.json(result);
    }),
  );
  r.post(
    "/privacy/requests",
    route(async (req, res) => {
      normal(req);
      const b = req.body;
      if (
        !["access", "correction", "deletion"].includes(b.type) ||
        !reason(b.details) ||
        !key(b.requestKey)
      )
        fail(
          400,
          "Choose a request type and explain your request (5–500 characters)",
        );
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const rows = await tx.all("tickets", req.school.id);
          const old = rows.find((t) => t.requestKey === b.requestKey);
          if (old) {
            if (
              old.userId !== req.user.id ||
              old.privacyType !== b.type ||
              old.description !== b.details.trim()
            )
              fail(409, "Request key already used for different details");
            return old;
          }
          if (
            rows.filter(
              (t) =>
                t.userId === req.user.id &&
                t.category === "privacy" &&
                ["open", "in-progress"].includes(t.status),
            ).length >= 5
          )
            fail(
              409,
              "Review your existing open requests before adding another",
            );
          const row = {
            id: id(),
            schoolId: req.school.id,
            userId: req.user.id,
            requesterName: req.user.name,
            category: "privacy",
            privacyType: b.type,
            subject: `Privacy: ${b.type}`,
            description: b.details.trim(),
            status: "open",
            version: 1,
            requestKey: b.requestKey,
            createdAt: new Date().toISOString(),
            history: [],
          };
          await tx.put("tickets", row);
          await audit(tx, req, "privacy.request-created", {
            ticketId: row.id,
            type: b.type,
          });
          return row;
        }),
      );
    }),
  );
  r.get(
    "/privacy/inventory",
    route(async (req, res) => {
      manage(req);
      const counts = [];
      for (const kind of collections.filter(
        (k) =>
          !["users", "organizations", "schools", "securityTokens"].includes(k),
      ))
        counts.push({
          collection: kind,
          count: (await store.all(kind, req.school.id)).length,
        });
      res.json({
        generatedAt: new Date().toISOString(),
        counts,
        note: "Read-only inventory. Audit, statutory academic/financial records, legal holds and backup copies require reviewed retention decisions; closing a privacy ticket does not erase data.",
      });
    }),
  );
  return r;
}
