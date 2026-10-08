import { Router } from "express";
import { id, managers, canSeeClass } from "./domain.js";
import { requireAttendanceDay } from "./calendar.js";
const statuses = ["present", "absent", "late", "excused"];
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const reasonValid = (value) =>
  typeof value === "string" && value.trim().length >= 5 && value.length <= 500;
export function requireAttendanceCorrection(old, status) {
  if (old && old.status !== status)
    fail(
      409,
      "Saved attendance can only be changed through an approved correction request.",
    );
}
export function createAttendanceCorrectionRouter(store) {
  const router = Router({ mergeParams: true });
  const route = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      if ([400, 403, 404, 409].includes(error.status))
        res.status(error.status).json({ error: error.message });
      else next(error);
    }
  };
  const audit = (tx, req, action, request) =>
    tx.put("audit", {
      id: id(),
      actorId: req.user.id,
      schoolId: req.school.id,
      action,
      correctionId: request.id,
      attendanceId: request.attendanceId,
      beforeStatus: request.beforeStatus,
      requestedStatus: request.requestedStatus,
      reason: request.reviewReason || request.reason,
      createdAt: new Date().toISOString(),
    });
  router.post(
    "/attendance-corrections",
    route(async (req, res) => {
      if (!managers.includes(req.user.role) && req.user.role !== "teacher")
        fail(403, "Teaching access required");
      const { attendanceId, requestedStatus, reason } = req.body;
      if (!statuses.includes(requestedStatus) || !reasonValid(reason))
        fail(
          400,
          "Choose an attendance status and provide a reason of 5–500 characters",
        );
      const result = await store.transaction(req.school.id, async (tx) => {
        const record = (await tx.all("attendance")).find(
          (r) =>
            r.id === attendanceId &&
            r.schoolId === req.school.id &&
            canSeeClass(req.user, r.classId),
        );
        if (!record) fail(404, "Attendance record not found");
        await requireAttendanceDay(tx, req.school.id, record.date);
        if (record.status === requestedStatus)
          fail(400, "Choose a different status from the saved record");
        if (
          (await tx.all("attendanceCorrections")).some(
            (r) =>
              r.schoolId === req.school.id &&
              r.attendanceId === record.id &&
              r.status === "pending",
          )
        )
          fail(409, "This record already has a pending correction request");
        const request = await tx.put("attendanceCorrections", {
          id: id(),
          schoolId: req.school.id,
          attendanceId: record.id,
          classId: record.classId,
          studentId: record.studentId,
          sessionId: record.sessionId || null,
          date: record.date,
          beforeStatus: record.status,
          beforeUpdatedAt: record.updatedAt || null,
          requestedStatus,
          reason: reason.trim(),
          requestedBy: req.user.id,
          requesterName: req.user.name,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
        await audit(tx, req, "attendance.correction-requested", request);
        return request;
      });
      res.status(201).json(result);
    }),
  );
  router.post(
    "/attendance-corrections/:requestId/review",
    route(async (req, res) => {
      if (!managers.includes(req.user.role))
        fail(403, "School management access required");
      const { decision, reason } = req.body;
      if (!["approved", "rejected"].includes(decision) || !reasonValid(reason))
        fail(
          400,
          "Choose approve/reject and provide a review reason of 5–500 characters",
        );
      const result = await store.transaction(req.school.id, async (tx) => {
        const request = (await tx.all("attendanceCorrections")).find(
          (r) => r.id === req.params.requestId && r.schoolId === req.school.id,
        );
        if (!request) fail(404, "Correction request not found");
        if (request.status !== "pending")
          fail(409, "This request has already been reviewed");
        if (request.requestedBy === req.user.id)
          fail(403, "Another school leader must review your request");
        const now = new Date().toISOString();
        if (decision === "approved") {
          const record = (await tx.all("attendance")).find(
            (r) =>
              r.id === request.attendanceId && r.schoolId === req.school.id,
          );
          if (
            !record ||
            record.status !== request.beforeStatus ||
            (record.updatedAt || null) !== request.beforeUpdatedAt
          )
            fail(
              409,
              "The attendance record changed. Reject this request and submit a new one after checking the record.",
            );
          await requireAttendanceDay(tx, req.school.id, record.date);
          await tx.put("attendance", {
            ...record,
            status: request.requestedStatus,
            updatedAt: now,
            lastCorrectionId: request.id,
          });
        }
        const reviewed = await tx.put("attendanceCorrections", {
          ...request,
          status: decision,
          reviewedBy: req.user.id,
          reviewerName: req.user.name,
          reviewReason: reason.trim(),
          reviewedAt: now,
        });
        await audit(tx, req, `attendance.correction-${decision}`, reviewed);
        return reviewed;
      });
      res.json(result);
    }),
  );
  return router;
}
