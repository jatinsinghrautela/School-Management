import { Router } from "express";
import { id, managers, canSeeClass } from "./domain.js";
export function createHomeworkRouter(store) {
  const router = Router({ mergeParams: true });
  const fail = (status, message) => {
    throw Object.assign(new Error(message), { status });
  };
  const audit = (tx, req, action) =>
    tx.put("audit", {
      id: id(),
      actorId: req.user.id,
      action,
      schoolId: req.school.id,
      createdAt: new Date().toISOString(),
    });
  router.post("/homework/:resourceId/submit", async (req, res, next) => {
    try {
      if (req.user.role !== "student")
        fail(403, "Only students submit homework");
      const { answer, attachmentId = null } = req.body;
      if (typeof answer !== "string" || !answer.trim() || answer.length > 10000)
        fail(400, "Write an answer of 1–10000 characters");
      const result = await store.transaction(req.school.id, async (tx) => {
        const current = (await tx.all("users")).find(
          (u) => u.id === req.user.id,
        );
        if (
          !current ||
          current.active === false ||
          current.role !== "student" ||
          (current.authVersion || 0) !== (req.user.authVersion || 0)
        )
          fail(409, "Enrollment changed; sign in again");
        const resource = (await tx.all("resources")).find(
          (r) =>
            r.id === req.params.resourceId &&
            r.schoolId === req.school.id &&
            r.type === "homework",
        );
        if (!resource || !canSeeClass(current, resource.classId))
          fail(404, "Homework not found");
        const attachment = attachmentId
          ? (await tx.all("files")).find(
              (f) =>
                f.id === attachmentId &&
                !f.deleted &&
                f.staged &&
                f.scanStatus === "clean" &&
                f.schoolId === req.school.id &&
                f.studentId === req.user.id &&
                f.resourceId === resource.id,
            )
          : null;
        if (attachmentId && !attachment)
          fail(400, "Choose your own scanned attachment for this homework");
        const attempts = (await tx.all("submissions"))
          .filter(
            (s) => s.resourceId === resource.id && s.studentId === req.user.id,
          )
          .sort((a, b) => b.version - a.version);
        if (attempts[0]?.status === "reviewed")
          fail(409, "Your teacher must request a revision before resubmission");
        const now = new Date().toISOString();
        const row = await tx.put("submissions", {
          id: id(),
          schoolId: req.school.id,
          classId: resource.classId,
          resourceId: resource.id,
          studentId: req.user.id,
          studentName: req.user.name,
          answer: answer.trim(),
          attachmentId: attachment?.id || null,
          attachmentName: attachment?.name || null,
          version: (attempts[0]?.version || 0) + 1,
          status: "submitted",
          submittedAt: now,
          late: !!resource.dueDate && now.slice(0, 10) > resource.dueDate,
          reviews: [],
        });
        if (attachment)
          await tx.put("files", {
            ...attachment,
            staged: false,
            submissionId: row.id,
          });
        await audit(tx, req, "homework.submitted");
        return row;
      });
      res.status(201).json(result);
    } catch (e) {
      if (e.status) res.status(e.status).json({ error: e.message });
      else next(e);
    }
  });
  router.post(
    "/homework/submissions/:submissionId/review",
    async (req, res, next) => {
      try {
        if (!["teacher", ...managers].includes(req.user.role))
          fail(403, "Teaching access required");
        const { feedback, status } = req.body;
        if (
          typeof feedback !== "string" ||
          !feedback.trim() ||
          feedback.length > 5000 ||
          !["reviewed", "revision-requested"].includes(status)
        )
          fail(400, "Provide feedback and a valid review status");
        const result = await store.transaction(req.school.id, async (tx) => {
          const entries = await tx.all("submissions");
          const entry = entries.find(
            (s) =>
              s.id === req.params.submissionId &&
              s.schoolId === req.school.id &&
              canSeeClass(req.user, s.classId),
          );
          if (!entry) fail(404, "Submission not found");
          if (
            entries.some(
              (s) =>
                s.resourceId === entry.resourceId &&
                s.studentId === entry.studentId &&
                s.version > entry.version,
            )
          )
            fail(409, "Review the latest submission version");
          const review = {
            id: id(),
            actorId: req.user.id,
            teacherName: req.user.name,
            feedback: feedback.trim(),
            status,
            reviewedAt: new Date().toISOString(),
          };
          const row = await tx.put("submissions", {
            ...entry,
            status,
            reviews: [...entry.reviews, review],
          });
          await audit(tx, req, "homework.reviewed");
          return row;
        });
        res.json(result);
      } catch (e) {
        if (e.status) res.status(e.status).json({ error: e.message });
        else next(e);
      }
    },
  );
  return router;
}
