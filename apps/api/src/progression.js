import { Router } from "express";
import { createHash } from "node:crypto";
import { id, managers } from "./domain.js";
import { validDate } from "./calendar.js";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const digest = (students) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        students
          .map((u) => [u.id, u.classIds, u.authVersion || 0])
          .sort((a, b) => a[0].localeCompare(b[0])),
      ),
    )
    .digest("hex");
export function createProgressionRouter(store) {
  const router = Router({ mergeParams: true });
  const route = (fn) => async (req, res, next) => {
    try {
      if (!managers.includes(req.user.role))
        fail(403, "School management access required");
      await fn(req, res);
    } catch (e) {
      if (e.status) res.status(e.status).json({ error: e.message });
      else next(e);
    }
  };
  const audit = (tx, req, action, extra = {}) =>
    tx.put("audit", {
      id: id(),
      actorId: req.user.id,
      schoolId: req.school.id,
      action,
      ...extra,
      createdAt: new Date().toISOString(),
    });
  router.post(
    "/academics/terms",
    route(async (req, res) => {
      const { academicYearId, name, startDate, endDate } = req.body;
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.length > 80 ||
        !validDate(startDate) ||
        !validDate(endDate) ||
        startDate > endDate
      )
        fail(400, "Provide a term name and valid date range");
      const result = await store.transaction(req.school.id, async (tx) => {
        const year = (await tx.all("academicYears")).find(
          (y) => y.id === academicYearId && y.schoolId === req.school.id,
        );
        if (!year || startDate < year.startDate || endDate > year.endDate)
          fail(400, "Term dates must fall within this school's academic year");
        if (
          (await tx.all("terms")).some(
            (t) =>
              t.academicYearId === year.id &&
              (t.name.toLowerCase() === name.trim().toLowerCase() ||
                (startDate <= t.endDate && endDate >= t.startDate)),
          )
        )
          fail(409, "Terms must have distinct names and non-overlapping dates");
        const row = await tx.put("terms", {
          id: id(),
          schoolId: req.school.id,
          academicYearId,
          name: name.trim(),
          startDate,
          endDate,
        });
        await audit(tx, req, "term.created");
        return row;
      });
      res.status(201).json(result);
    }),
  );
  async function promotion(tx, req, fromClassId, toClassId) {
    const classes = (await tx.all("classes")).filter(
        (c) => c.schoolId === req.school.id,
      ),
      years = await tx.all("academicYears");
    const from = classes.find((c) => c.id === fromClassId),
      to = classes.find((c) => c.id === toClassId);
    const fromYear = years.find((y) => y.id === from?.academicYearId),
      toYear = years.find((y) => y.id === to?.academicYearId);
    const today = new Date().toISOString().slice(0, 10);
    if (
      !fromYear ||
      !toYear ||
      toYear.startDate <= fromYear.startDate ||
      today < toYear.startDate ||
      today > toYear.endDate
    )
      fail(
        400,
        "Choose a destination class in a later year that has already started and not ended",
      );
    const students = (await tx.all("users")).filter(
      (u) =>
        u.role === "student" &&
        u.active !== false &&
        u.schoolIds.includes(req.school.id) &&
        u.classIds.includes(fromClassId),
    );
    if (
      !students.length ||
      students.some((u) => u.classIds.includes(toClassId))
    )
      fail(
        409,
        "No eligible students, or a student is already in the destination class",
      );
    return { from, to, students, today };
  }
  router.post(
    "/academics/promotions/preview",
    route(async (req, res) => {
      const result = await store.transaction(req.school.id, async (tx) => {
        let p = await promotion(
          tx,
          req,
          req.body.fromClassId,
          req.body.toClassId,
        );
        const row = await tx.put("promotionPreviews", {
          id: id(),
          schoolId: req.school.id,
          actorId: req.user.id,
          authVersion: req.user.authVersion || 0,
          fromClassId: p.from.id,
          toClassId: p.to.id,
          digest: digest(p.students),
          expiresAt: Date.now() + 900000,
          used: false,
        });
        return {
          previewId: row.id,
          from: p.from.name,
          to: p.to.name,
          students: p.students.map((u) => ({ id: u.id, name: u.name })),
          expiresAt: row.expiresAt,
        };
      });
      res.json(result);
    }),
  );
  router.post(
    "/academics/promotions/apply",
    route(async (req, res) => {
      const result = await store.transaction(req.school.id, async (tx) => {
        const preview = (await tx.all("promotionPreviews")).find(
          (p) =>
            p.id === req.body.previewId &&
            p.schoolId === req.school.id &&
            p.actorId === req.user.id,
        );
        if (
          !preview ||
          preview.used ||
          preview.expiresAt <= Date.now() ||
          preview.authVersion !== (req.user.authVersion || 0)
        )
          fail(
            409,
            "Promotion preview expired or unavailable; review a new preview",
          );
        let p = await promotion(
          tx,
          req,
          preview.fromClassId,
          preview.toClassId,
        );
        await tx.lockUsers(p.students.map((u) => u.id));
        p = await promotion(tx, req, preview.fromClassId, preview.toClassId);
        if (digest(p.students) !== preview.digest)
          fail(409, "Enrollment changed; review a new preview");
        const enrollments = await tx.all("enrollments");
        for (const u of p.students) {
          const prior = enrollments.find(
            (e) =>
              e.studentId === u.id &&
              e.classId === p.from.id &&
              e.schoolId === req.school.id,
          );
          await tx.put("enrollments", {
            ...(prior || {}),
            id: prior?.id || id(),
            schoolId: req.school.id,
            studentId: u.id,
            classId: p.from.id,
            academicYearId: p.from.academicYearId,
            className: p.from.name,
            status: "promoted",
            endedOn: p.today,
          });
          await tx.put("enrollments", {
            id: id(),
            schoolId: req.school.id,
            studentId: u.id,
            classId: p.to.id,
            academicYearId: p.to.academicYearId,
            className: p.to.name,
            status: "active",
            startedOn: p.today,
          });
          await tx.put("users", {
            ...u,
            classIds: u.classIds.map((c) => (c === p.from.id ? p.to.id : c)),
            authVersion: (u.authVersion || 0) + 1,
          });
        }
        await tx.put("promotionPreviews", { ...preview, used: true });
        await audit(tx, req, "students.promoted", {
          fromClassId: p.from.id,
          toClassId: p.to.id,
          count: p.students.length,
        });
        return { promoted: p.students.length };
      });
      res.json(result);
    }),
  );
  return router;
}
