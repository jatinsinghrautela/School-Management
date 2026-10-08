import { Router } from "express";
import { id, managers, visibleNotice, roles } from "./domain.js";
export const holidaysOn = (entries, schoolId, date) =>
  entries.filter(
    (e) =>
      e.schoolId === schoolId &&
      e.kind === "holiday" &&
      !e.cancelled &&
      !e.classId &&
      e.audience === "all" &&
      e.startDate <= date &&
      e.endDate >= date,
  );
export async function requireAttendanceDay(store, schoolId, date) {
  const holidays = holidaysOn(await store.all("calendar"), schoolId, date);
  if (holidays.length)
    throw Object.assign(
      new Error(
        `Attendance is closed on ${date}: ${holidays.map((h) => h.title).join("; ")}. School management must update the Calendar before recording attendance.`,
      ),
      { status: 409 },
    );
}
export const validDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function createCalendarRouter(store) {
  const router = Router({ mergeParams: true });
  router.use("/calendar", (req, res, next) =>
    managers.includes(req.user.role)
      ? next()
      : res.status(403).json({ error: "School management access required" }),
  );
  router.post("/calendar", async (req, res, next) => {
    try {
      const {
        entryId,
        title,
        description = "",
        startDate,
        endDate,
        kind = "event",
        audience = "all",
        classId = null,
      } = req.body;
      if (
        typeof title !== "string" ||
        !title.trim() ||
        title.length > 120 ||
        typeof description !== "string" ||
        description.length > 2000 ||
        !validDate(startDate) ||
        !validDate(endDate) ||
        startDate > endDate ||
        !["event", "holiday"].includes(kind) ||
        !["all", ...roles].includes(audience) ||
        (kind === "holiday" && (classId || audience !== "all"))
      )
        return res.status(400).json({
          error:
            "Provide a title, valid date range and audience. Holidays must apply to the whole school.",
        });
      const row = await store.transaction(req.school.id, async (tx) => {
        const reject = (status, message) => {
          throw Object.assign(new Error(message), { status });
        };
        if (
          classId &&
          !(await tx.all("classes")).some(
            (c) => c.id === classId && c.schoolId === req.school.id,
          )
        )
          reject(400, "Class does not belong to this school");
        if (
          entryId &&
          !(await tx.all("calendar")).some(
            (e) =>
              e.id === entryId && e.schoolId === req.school.id && !e.cancelled,
          )
        )
          reject(404, "Active calendar entry not found");
        const row = await tx.put("calendar", {
          ...(entryId
            ? (await tx.all("calendar")).find((e) => e.id === entryId)
            : {}),
          id: entryId || id(),
          schoolId: req.school.id,
          title: title.trim(),
          description: description.trim(),
          startDate,
          endDate,
          kind,
          audience,
          classId,
          cancelled: false,
          updatedAt: new Date().toISOString(),
        });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          schoolId: req.school.id,
          action: entryId ? "calendar.updated" : "calendar.created",
          entryId: row.id,
          createdAt: new Date().toISOString(),
        });
        return row;
      });
      res.status(entryId ? 200 : 201).json(row);
    } catch (error) {
      if (error.status) res.status(error.status).json({ error: error.message });
      else next(error);
    }
  });
  router.post("/calendar/:entryId/cancel", async (req, res, next) => {
    try {
      const reason = req.body.reason;
      if (
        typeof reason !== "string" ||
        reason.trim().length < 5 ||
        reason.length > 500
      )
        return res
          .status(400)
          .json({ error: "Provide a cancellation reason of 5–500 characters" });
      const result = await store.transaction(req.school.id, async (tx) => {
        const row = (await tx.all("calendar")).find(
          (e) =>
            e.id === req.params.entryId &&
            e.schoolId === req.school.id &&
            !e.cancelled,
        );
        if (!row)
          throw Object.assign(new Error("Active calendar entry not found"), {
            status: 404,
          });
        const result = await tx.put("calendar", {
          ...row,
          cancelled: true,
          cancellationReason: reason.trim(),
          updatedAt: new Date().toISOString(),
        });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          schoolId: req.school.id,
          action: "calendar.cancelled",
          entryId: row.id,
          reason: reason.trim(),
          createdAt: new Date().toISOString(),
        });
        return result;
      });
      res.json(result);
    } catch (error) {
      if (error.status) res.status(error.status).json({ error: error.message });
      else next(error);
    }
  });
  return router;
}
export function visibleCalendar(user, entry) {
  return !entry.cancelled && visibleNotice(user, entry);
}
