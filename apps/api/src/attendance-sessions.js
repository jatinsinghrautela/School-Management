import { Router } from "express";
import { id, managers } from "./domain.js";
export async function attendanceSession(tx, schoolId, sessionId) {
  if (sessionId == null) return null;
  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    !(await tx.all("attendanceSessions")).some(
      (s) => s.id === sessionId && s.schoolId === schoolId && s.active,
    )
  )
    throw Object.assign(
      new Error("Choose an active attendance session for this school"),
      { status: 400 },
    );
  return sessionId;
}
export function createAttendanceSessionRouter(store) {
  const router = Router({ mergeParams: true });
  router.post("/attendance-sessions", async (req, res, next) => {
    try {
      if (!managers.includes(req.user.role))
        return res
          .status(403)
          .json({ error: "School management access required" });
      const { name, sessionId, active = true } = req.body;
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.length > 80 ||
        typeof active !== "boolean"
      )
        return res
          .status(400)
          .json({ error: "Provide a session name and active state" });
      const row = await store.transaction(req.school.id, async (tx) => {
        const rows = (await tx.all("attendanceSessions")).filter(
          (s) => s.schoolId === req.school.id,
        );
        if (sessionId && !rows.some((s) => s.id === sessionId))
          throw Object.assign(new Error("Session not found"), { status: 404 });
        if (
          rows.some(
            (s) =>
              s.id !== sessionId &&
              s.name.toLowerCase() === name.trim().toLowerCase(),
          )
        )
          throw Object.assign(new Error("Session name already exists"), {
            status: 409,
          });
        const row = await tx.put("attendanceSessions", {
          id: sessionId || id(),
          schoolId: req.school.id,
          name: name.trim(),
          active,
        });
        await tx.put("audit", {
          id: id(),
          schoolId: req.school.id,
          actorId: req.user.id,
          action: "attendance-session.saved",
          createdAt: new Date().toISOString(),
        });
        return row;
      });
      res.json(row);
    } catch (error) {
      if (error.status) res.status(error.status).json({ error: error.message });
      else next(error);
    }
  });
  return router;
}
