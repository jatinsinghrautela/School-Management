import { Router } from "express";
import { id, managers, canSeeClass } from "./domain.js";
import { validDate, holidaysOn, requireAttendanceDay } from "./calendar.js";
export async function datedTimetable(tx, schoolId, date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  const years = (await tx.all("academicYears")).filter(
    (y) => y.schoolId === schoolId && y.startDate <= date && y.endDate >= date,
  );
  const entries = (await tx.all("timetable")).filter(
    (e) =>
      e.schoolId === schoolId &&
      !e.cancelled &&
      e.day === day &&
      years.some((y) => y.id === e.academicYearId),
  );
  const subs = (await tx.all("substitutions")).filter(
    (s) => s.schoolId === schoolId && s.date === date && !s.cancelled,
  );
  return entries.map((e) => ({
    ...e,
    ...(subs.find((s) => s.entryId === e.id)
      ? {
          teacherId: subs.find((s) => s.entryId === e.id).teacherId,
          substitution: subs.find((s) => s.entryId === e.id),
        }
      : {}),
  }));
}
export function createSubstitutionRouter(store) {
  const router = Router({ mergeParams: true });
  const route = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e.status) res.status(e.status).json({ error: e.message });
      else next(e);
    }
  };
  const fail = (status, message) => {
    throw Object.assign(new Error(message), { status });
  };
  router.get(
    "/timetable-date",
    route(async (req, res) => {
      const date = req.query.date;
      if (!validDate(date)) fail(400, "Choose a valid date");
      const holidays = holidaysOn(
        await store.all("calendar"),
        req.school.id,
        date,
      );
      const users = await store.all("users"),
        classes = await store.all("classes"),
        subjects = await store.all("subjects");
      const rows = holidays.length
        ? []
        : (await datedTimetable(store, req.school.id, date))
            .filter(
              (e) =>
                canSeeClass(req.user, e.classId) || e.teacherId === req.user.id,
            )
            .map((e) => ({
              ...e,
              ...(e.substitution && !managers.includes(req.user.role)
                ? {
                    substitution: {
                      id: e.substitution.id,
                      teacherId: e.substitution.teacherId,
                    },
                  }
                : {}),
              teacherName:
                users.find((u) => u.id === e.teacherId)?.name || "Teacher",
              className: classes.find((c) => c.id === e.classId)?.name,
              subjectName: subjects.find((s) => s.id === e.subjectId)?.name,
            }));
      res.json({ date, holidays: holidays.map((h) => h.title), entries: rows });
    }),
  );
  router.post(
    "/substitutions",
    route(async (req, res) => {
      if (!managers.includes(req.user.role))
        fail(403, "School management access required");
      const { entryId, date, teacherId, reason } = req.body;
      if (
        !validDate(date) ||
        typeof reason !== "string" ||
        reason.trim().length < 5 ||
        reason.length > 500
      )
        fail(400, "Choose a date and provide a reason of 5–500 characters");
      const row = await store.transaction(req.school.id, async (tx) => {
        await requireAttendanceDay(tx, req.school.id, date);
        const effective = await datedTimetable(tx, req.school.id, date),
          entry = effective.find((e) => e.id === entryId);
        if (!entry) fail(404, "Period does not run on this date");
        const teacher = (await tx.all("users")).find(
          (u) =>
            u.id === teacherId &&
            u.role === "teacher" &&
            u.active !== false &&
            u.schoolIds.includes(req.school.id) &&
            u.classIds.includes(entry.classId),
        );
        if (!teacher)
          fail(400, "Choose an active teacher assigned to this class");
        if (entry.substitution)
          fail(409, "Cancel the existing substitution before replacing it");
        if (entry.teacherId === teacherId)
          fail(400, "Choose a different teacher");
        if (
          effective.some(
            (e) =>
              e.id !== entryId &&
              e.teacherId === teacherId &&
              e.start < entry.end &&
              entry.start < e.end,
          )
        )
          fail(409, "Substitute teacher already has an overlapping period");
        const row = await tx.put("substitutions", {
          id: id(),
          schoolId: req.school.id,
          classId: entry.classId,
          entryId,
          date,
          teacherId,
          previousTeacherId: entry.teacherId,
          reason: reason.trim(),
          cancelled: false,
        });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          schoolId: req.school.id,
          action: "timetable.substituted",
          substitutionId: row.id,
          reason: row.reason,
          createdAt: new Date().toISOString(),
        });
        return row;
      });
      res.status(201).json(row);
    }),
  );
  router.post(
    "/substitutions/:id/cancel",
    route(async (req, res) => {
      if (!managers.includes(req.user.role))
        fail(403, "School management access required");
      if (
        typeof req.body.reason !== "string" ||
        req.body.reason.trim().length < 5 ||
        req.body.reason.length > 500
      )
        fail(400, "Provide a cancellation reason of 5–500 characters");
      const row = await store.transaction(req.school.id, async (tx) => {
        const s = (await tx.all("substitutions")).find(
          (s) =>
            s.id === req.params.id &&
            s.schoolId === req.school.id &&
            !s.cancelled,
        );
        if (!s) fail(404, "Substitution not found");
        const row = await tx.put("substitutions", {
          ...s,
          cancelled: true,
          cancelReason: req.body.reason.trim(),
        });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          schoolId: req.school.id,
          action: "timetable.substitution-cancelled",
          substitutionId: s.id,
          reason: row.cancelReason,
          createdAt: new Date().toISOString(),
        });
        return row;
      });
      res.json(row);
    }),
  );
  return router;
}
