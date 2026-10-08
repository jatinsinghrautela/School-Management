import { Router } from "express";
import { id, managers } from "./domain.js";

const minute = (value) =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
    : NaN;
export function createTimetableRouter(store) {
  const router = Router({ mergeParams: true });
  router.use("/timetable", (req, res, next) =>
    managers.includes(req.user.role)
      ? next()
      : res.status(403).json({ error: "School management access required" }),
  );
  router.post("/timetable", async (req, res, next) => {
    try {
      const {
        classId,
        subjectId,
        teacherId,
        day,
        start,
        end,
        room = "",
        entryId,
      } = req.body;
      if (
        !Number.isInteger(day) ||
        day < 1 ||
        day > 7 ||
        !Number.isFinite(minute(start)) ||
        !Number.isFinite(minute(end)) ||
        minute(start) >= minute(end) ||
        typeof room !== "string" ||
        room.length > 80
      )
        return res.status(400).json({
          error:
            "Choose a weekday, valid increasing times and a room of at most 80 characters",
        });
      const result = await store.transaction(req.school.id, async (tx) => {
        const reject = (status, message) => {
          throw Object.assign(new Error(message), { status });
        };
        const cls = (await tx.all("classes")).find(
          (c) => c.id === classId && c.schoolId === req.school.id,
        );
        const subject = (await tx.all("subjects")).find(
          (s) =>
            s.id === subjectId &&
            s.classId === classId &&
            s.schoolId === req.school.id,
        );
        const teacher = (await tx.all("users")).find(
          (u) =>
            u.id === teacherId &&
            u.role === "teacher" &&
            u.active !== false &&
            u.schoolIds.includes(req.school.id) &&
            u.classIds.includes(classId),
        );
        if (
          !cls?.academicYearId ||
          !subject ||
          !subject.teacherIds.includes(teacherId) ||
          !teacher
        )
          reject(
            400,
            "Choose a year-linked class, subject and active assigned teacher",
          );
        const entries = await tx.all("timetable");
        if (
          (await tx.all("substitutions")).some(
            (s) =>
              s.schoolId === req.school.id &&
              !s.cancelled &&
              s.date >= new Date().toISOString().slice(0, 10),
          )
        )
          reject(
            409,
            "Review and cancel future substitutions before changing weekly periods",
          );
        if (
          entryId &&
          !entries.some(
            (e) =>
              e.id === entryId && e.schoolId === req.school.id && !e.cancelled,
          )
        )
          reject(404, "Schedule entry not found");
        const cleanRoom = room.trim();
        const conflict = entries.find(
          (e) =>
            e.id !== entryId &&
            !e.cancelled &&
            e.schoolId === req.school.id &&
            e.academicYearId === cls.academicYearId &&
            e.day === day &&
            minute(start) < minute(e.end) &&
            minute(e.start) < minute(end) &&
            (e.classId === classId ||
              e.teacherId === teacherId ||
              (cleanRoom && e.room.toLowerCase() === cleanRoom.toLowerCase())),
        );
        if (conflict)
          reject(409, "This period overlaps a class, teacher or room booking");
        const row = await tx.put("timetable", {
          id: entryId || id(),
          schoolId: req.school.id,
          academicYearId: cls.academicYearId,
          classId,
          subjectId,
          teacherId,
          day,
          start,
          end,
          room: cleanRoom,
          cancelled: false,
        });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          action: entryId ? "timetable.updated" : "timetable.created",
          schoolId: req.school.id,
          createdAt: new Date().toISOString(),
        });
        return row;
      });
      res.status(entryId ? 200 : 201).json(result);
    } catch (e) {
      if (e.status) res.status(e.status).json({ error: e.message });
      else next(e);
    }
  });
  router.post("/timetable/:entryId/cancel", async (req, res, next) => {
    try {
      await store.transaction(req.school.id, async (tx) => {
        const entry = (await tx.all("timetable")).find(
          (e) =>
            e.id === req.params.entryId &&
            e.schoolId === req.school.id &&
            !e.cancelled,
        );
        if (!entry)
          throw Object.assign(new Error("Schedule entry not found"), {
            status: 404,
          });
        if (
          (await tx.all("substitutions")).some(
            (s) => s.entryId === entry.id && !s.cancelled,
          )
        )
          throw Object.assign(
            new Error("Cancel this period's substitutions first"),
            { status: 409 },
          );
        await tx.put("timetable", { ...entry, cancelled: true });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          action: "timetable.cancelled",
          schoolId: req.school.id,
          createdAt: new Date().toISOString(),
        });
      });
      res.json({ ok: true });
    } catch (e) {
      if (e.status) res.status(e.status).json({ error: e.message });
      else next(e);
    }
  });
  return router;
}
