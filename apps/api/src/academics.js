import { Router } from "express";
import { requireAttendanceDay } from "./calendar.js";
import { requireAttendanceCorrection } from "./attendance-corrections.js";
import { attendanceSession } from "./attendance-sessions.js";
import { reportPdf } from "./report-pdf.js";
import { createHash } from "node:crypto";
import { id, managers, canSeeClass } from "./domain.js";

const assert = (condition, status, message) => {
  if (!condition) throw Object.assign(new Error(message), { status });
};
const text = (value, max = 120) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;
const objectRows = (value) =>
  Array.isArray(value) &&
  value.every((r) => r && typeof r === "object" && !Array.isArray(r));
export const dateValid = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const stableId = (...parts) =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 36);
const scoped = async (store, kind, sid) =>
  (await store.all(kind, sid)).filter((r) => r.schoolId === sid);
const management = (user) => managers.includes(user.role);
const audit = (store, user, sid, action) =>
  store.put("audit", {
    id: id(),
    actorId: user.id,
    schoolId: sid,
    action,
    createdAt: new Date().toISOString(),
  });

export async function academicWorkspace(store, user, schoolId) {
  const classes = (await scoped(store, "classes", schoolId)).filter((c) =>
    canSeeClass(user, c.id),
  );
  const allowed = new Set(classes.map((c) => c.id));
  const ownExams = new Set(
    user.role === "student"
      ? (await scoped(store, "reports", schoolId))
          .filter((r) => r.studentId === user.id)
          .map((r) => r.examId)
      : [],
  );
  return {
    academicYears: await scoped(store, "academicYears", schoolId),
    subjects: (await scoped(store, "subjects", schoolId)).filter((s) =>
      allowed.has(s.classId),
    ),
    exams: (await scoped(store, "exams", schoolId)).filter(
      (e) =>
        (allowed.has(e.classId) || ownExams.has(e.id)) &&
        (user.role !== "student" || e.status === "published"),
    ),
  };
}

export function createAcademicRouter(store) {
  const router = Router({ mergeParams: true });
  const route = (handler) => async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      if ([400, 403, 404, 409].includes(error.status))
        res.status(error.status).json({ error: error.message });
      else next(error);
    }
  };
  const transact = (req, work) => store.transaction(req.school.id, work);
  const classFor = async (tx, req, classId) => {
    const cls = (await scoped(tx, "classes", req.school.id)).find(
      (c) => c.id === classId,
    );
    assert(cls && canSeeClass(req.user, classId), 403, "Class access denied");
    return cls;
  };
  const examFor = async (tx, req, examId) => {
    const exam = (await scoped(tx, "exams", req.school.id)).find(
      (e) => e.id === examId,
    );
    const ownReport =
      req.user.role === "student" &&
      exam?.status === "published" &&
      (await scoped(tx, "reports", req.school.id)).some(
        (r) => r.examId === exam.id && r.studentId === req.user.id,
      );
    assert(
      exam && (canSeeClass(req.user, exam.classId) || ownReport),
      404,
      "Exam not found",
    );
    return exam;
  };
  const requireManager = (req) =>
    assert(management(req.user), 403, "School management access required");
  const requireTeacher = (req) =>
    assert(
      management(req.user) || req.user.role === "teacher",
      403,
      "Teaching access required",
    );

  router.post(
    "/academics/years",
    route(async (req, res) => {
      requireManager(req);
      const { name, startDate, endDate } = req.body;
      assert(
        text(name) &&
          dateValid(startDate) &&
          dateValid(endDate) &&
          startDate < endDate,
        400,
        "Enter a name and valid academic-year dates",
      );
      const row = await transact(req, async (tx) => {
        const years = await scoped(tx, "academicYears", req.school.id);
        assert(
          !years.some(
            (y) => y.name.toLowerCase() === name.trim().toLowerCase(),
          ),
          409,
          "Academic year already exists",
        );
        const row = {
          id: id(),
          schoolId: req.school.id,
          name: name.trim(),
          startDate,
          endDate,
          isCurrent: years.length === 0,
        };
        await tx.put("academicYears", row);
        await audit(tx, req.user, req.school.id, "academic-year.created");
        return row;
      });
      res.status(201).json(row);
    }),
  );
  router.post(
    "/academics/report-settings",
    route(async (req, res) => {
      requireManager(req);
      const {
        heading = "Academic report card",
        accent = "#176455",
        principal = "",
        classTeacher = "",
      } = req.body;
      assert(
        typeof heading === "string" &&
          heading.trim() &&
          heading.length <= 100 &&
          /^#[0-9a-fA-F]{6}$/.test(accent) &&
          [principal, classTeacher].every(
            (v) => typeof v === "string" && v.length <= 100,
          ),
        400,
        "Provide a report heading, hex accent and sign-off names of at most 100 characters",
      );
      const row = await transact(req, async (tx) => {
        const row = await tx.put("reportSettings", {
          id: stableId("report-settings", req.school.id),
          schoolId: req.school.id,
          heading: heading.trim(),
          accent,
          principal,
          classTeacher,
        });
        await audit(tx, req.user, req.school.id, "report-settings.saved");
        return row;
      });
      res.json(row);
    }),
  );
  router.post(
    "/academics/years/:yearId/activate",
    route(async (req, res) => {
      requireManager(req);
      await transact(req, async (tx) => {
        const years = await scoped(tx, "academicYears", req.school.id);
        assert(
          years.some((y) => y.id === req.params.yearId),
          404,
          "Academic year not found",
        );
        for (const year of years)
          await tx.put("academicYears", {
            ...year,
            isCurrent: year.id === req.params.yearId,
          });
        await audit(tx, req.user, req.school.id, "academic-year.activated");
      });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/academics/classes",
    route(async (req, res) => {
      requireManager(req);
      const { academicYearId, grade, section } = req.body;
      assert(
        text(grade, 50) && text(section, 30),
        400,
        "Grade and section required",
      );
      const row = await transact(req, async (tx) => {
        assert(
          (await scoped(tx, "academicYears", req.school.id)).some(
            (y) => y.id === academicYearId,
          ),
          400,
          "Choose a school academic year",
        );
        const rows = await scoped(tx, "classes", req.school.id);
        assert(
          !rows.some(
            (c) =>
              c.academicYearId === academicYearId &&
              c.grade?.toLowerCase() === grade.trim().toLowerCase() &&
              c.section?.toLowerCase() === section.trim().toLowerCase(),
          ),
          409,
          "Grade and section already exist in this year",
        );
        const row = {
          id: id(),
          schoolId: req.school.id,
          academicYearId,
          grade: grade.trim(),
          section: section.trim(),
          name: `${grade.trim()} · ${section.trim()}`,
        };
        await tx.put("classes", row);
        await audit(tx, req.user, req.school.id, "class.created");
        return row;
      });
      res.status(201).json(row);
    }),
  );
  router.post(
    "/academics/subjects",
    route(async (req, res) => {
      requireManager(req);
      const { name, classId, teacherIds = [] } = req.body;
      assert(
        text(name) && Array.isArray(teacherIds),
        400,
        "Subject name and teacher assignments required",
      );
      const row = await transact(req, async (tx) => {
        await classFor(tx, req, classId);
        const users = await tx.all("users");
        assert(
          teacherIds.every((tid) =>
            users.some(
              (u) =>
                u.id === tid &&
                u.role === "teacher" &&
                u.schoolIds.includes(req.school.id) &&
                u.classIds.includes(classId),
            ),
          ),
          400,
          "Teachers must belong to this school and class",
        );
        assert(
          !(await scoped(tx, "subjects", req.school.id)).some(
            (s) =>
              s.classId === classId &&
              s.name.toLowerCase() === name.trim().toLowerCase(),
          ),
          409,
          "Subject already exists for this class",
        );
        const row = {
          id: id(),
          schoolId: req.school.id,
          classId,
          name: name.trim(),
          teacherIds: [...new Set(teacherIds)],
        };
        await tx.put("subjects", row);
        await audit(tx, req.user, req.school.id, "subject.created");
        return row;
      });
      res.status(201).json(row);
    }),
  );
  router.post(
    "/exams",
    route(async (req, res) => {
      requireManager(req);
      const {
        name,
        academicYearId,
        classId,
        startDate,
        endDate,
        subjects,
        gradingBands,
      } = req.body;
      assert(
        text(name) &&
          dateValid(startDate) &&
          dateValid(endDate) &&
          startDate <= endDate,
        400,
        "Enter valid exam name and dates",
      );
      assert(
        objectRows(subjects) &&
          subjects.length > 0 &&
          subjects.length <= 30 &&
          new Set(subjects.map((s) => s.subjectId)).size === subjects.length,
        400,
        "Choose between one and thirty unique subjects",
      );
      assert(
        subjects.every(
          (s) =>
            Number.isFinite(s.maxScore) &&
            s.maxScore > 0 &&
            s.maxScore <= 10000 &&
            Number.isFinite(s.weight) &&
            s.weight > 0 &&
            s.weight <= 100 &&
            Number.isFinite(s.passPercent) &&
            s.passPercent >= 0 &&
            s.passPercent <= 100,
        ),
        400,
        "Invalid subject maximum, weight, or pass percentage",
      );
      assert(
        objectRows(gradingBands) &&
          gradingBands.length > 0 &&
          gradingBands.length <= 12 &&
          gradingBands.every(
            (b) =>
              text(b.label, 12) &&
              Number.isFinite(b.minPercent) &&
              b.minPercent >= 0 &&
              b.minPercent <= 100,
          ) &&
          gradingBands.some((b) => b.minPercent === 0) &&
          new Set(gradingBands.map((b) => b.minPercent)).size ===
            gradingBands.length,
        400,
        "Provide unique grade thresholds including zero",
      );
      const row = await transact(req, async (tx) => {
        const cls = await classFor(tx, req, classId),
          year = (await scoped(tx, "academicYears", req.school.id)).find(
            (y) => y.id === academicYearId,
          );
        assert(
          year && (!cls.academicYearId || cls.academicYearId === year.id),
          400,
          "Class and academic year do not match",
        );
        assert(
          startDate >= year.startDate && endDate <= year.endDate,
          400,
          "Exam dates must be inside the academic year",
        );
        const available = await scoped(tx, "subjects", req.school.id);
        assert(
          subjects.every((s) =>
            available.some(
              (a) => a.id === s.subjectId && a.classId === classId,
            ),
          ),
          400,
          "Subjects must belong to the exam class",
        );
        assert(
          !(await scoped(tx, "exams", req.school.id)).some(
            (e) =>
              e.classId === classId &&
              e.academicYearId === academicYearId &&
              e.name.toLowerCase() === name.trim().toLowerCase(),
          ),
          409,
          "Exam already exists in this class and year",
        );
        const row = {
          id: id(),
          schoolId: req.school.id,
          name: name.trim(),
          academicYearId,
          classId,
          startDate,
          endDate,
          subjects: subjects.map((s) => ({
            subjectId: s.subjectId,
            maxScore: s.maxScore,
            weight: s.weight,
            passPercent: s.passPercent,
          })),
          gradingBands: gradingBands
            .map((b) => ({ label: b.label.trim(), minPercent: b.minPercent }))
            .sort((a, b) => b.minPercent - a.minPercent),
          status: "draft",
          version: 0,
        };
        await tx.put("exams", row);
        await audit(tx, req.user, req.school.id, "exam.created");
        return row;
      });
      res.status(201).json(row);
    }),
  );
  router.post(
    "/academics/subjects/:subjectId/assign",
    route(async (req, res) => {
      requireManager(req);
      const { teacherIds } = req.body;
      assert(Array.isArray(teacherIds), 400, "Provide teacher assignments");
      const row = await transact(req, async (tx) => {
        const subject = (await scoped(tx, "subjects", req.school.id)).find(
          (s) => s.id === req.params.subjectId,
        );
        assert(subject, 404, "Subject not found");
        await classFor(tx, req, subject.classId);
        const users = await tx.all("users");
        assert(
          teacherIds.every((tid) =>
            users.some(
              (u) =>
                u.id === tid &&
                u.role === "teacher" &&
                u.schoolIds.includes(req.school.id) &&
                u.classIds.includes(subject.classId),
            ),
          ),
          400,
          "Teachers must belong to this school and class",
        );
        const row = { ...subject, teacherIds: [...new Set(teacherIds)] };
        await tx.put("subjects", row);
        await audit(tx, req.user, req.school.id, "subject.assignments-updated");
        return row;
      });
      res.json(row);
    }),
  );
  router.post(
    "/exams/:examId/marks/batch",
    route(async (req, res) => {
      requireTeacher(req);
      const { subjectId, entries } = req.body;
      assert(
        objectRows(entries) &&
          entries.length > 0 &&
          entries.length <= 200 &&
          new Set(entries.map((e) => e.studentId)).size === entries.length,
        400,
        "Enter one to 200 unique student records",
      );
      const result = await transact(req, async (tx) => {
        const exam = await examFor(tx, req, req.params.examId);
        assert(
          exam.status === "draft",
          409,
          "Published exams are locked. Management must reopen the exam before editing.",
        );
        const spec = exam.subjects.find((s) => s.subjectId === subjectId),
          subject = (await scoped(tx, "subjects", req.school.id)).find(
            (s) => s.id === subjectId,
          );
        assert(spec && subject, 400, "Subject is not part of this exam");
        assert(
          management(req.user) || subject.teacherIds.includes(req.user.id),
          403,
          "You are not assigned to this subject",
        );
        const users = await tx.all("users");
        assert(
          entries.every(
            (e) =>
              users.some(
                (u) =>
                  u.id === e.studentId &&
                  u.role === "student" &&
                  u.schoolIds.includes(req.school.id) &&
                  u.classIds.includes(exam.classId),
              ) &&
              Number.isFinite(e.score) &&
              e.score >= 0 &&
              e.score <= spec.maxScore,
          ),
          400,
          "Every entry needs an enrolled student and a valid score",
        );
        const now = new Date().toISOString();
        for (const entry of entries)
          await tx.put("marks", {
            id: stableId("exam-mark", exam.id, subjectId, entry.studentId),
            schoolId: req.school.id,
            classId: exam.classId,
            examId: exam.id,
            subjectId,
            exam: exam.name,
            subject: subject.name,
            studentId: entry.studentId,
            score: entry.score,
            maxScore: spec.maxScore,
            updatedAt: now,
          });
        await audit(tx, req.user, req.school.id, "exam-marks.batch-saved");
        return { saved: entries.length };
      });
      res.json(result);
    }),
  );
  router.post(
    "/attendance/batch",
    route(async (req, res) => {
      requireTeacher(req);
      const { classId, date, entries, sessionId = null } = req.body;
      assert(
        dateValid(date) &&
          objectRows(entries) &&
          entries.length > 0 &&
          entries.length <= 200 &&
          new Set(entries.map((e) => e.studentId)).size === entries.length,
        400,
        "Enter a valid date and one to 200 unique records",
      );
      const result = await transact(req, async (tx) => {
        await classFor(tx, req, classId);
        await requireAttendanceDay(tx, req.school.id, date);
        await attendanceSession(tx, req.school.id, sessionId);
        const users = await tx.all("users"),
          existing = await scoped(tx, "attendance", req.school.id);
        assert(
          entries.every(
            (e) =>
              ["present", "absent", "late", "excused"].includes(e.status) &&
              users.some(
                (u) =>
                  u.id === e.studentId &&
                  u.role === "student" &&
                  u.schoolIds.includes(req.school.id) &&
                  u.classIds.includes(classId),
              ),
          ),
          400,
          "Every entry needs an enrolled student and valid attendance status",
        );
        for (const entry of entries) {
          const old = existing.find(
            (a) =>
              a.classId === classId &&
              a.studentId === entry.studentId &&
              a.date === date &&
              (a.sessionId || null) === sessionId,
          );
          requireAttendanceCorrection(old, entry.status);
          if (old) continue;
          await tx.put("attendance", {
            id:
              old?.id ||
              stableId(
                "attendance",
                req.school.id,
                classId,
                date,
                entry.studentId,
                ...(sessionId ? [sessionId] : []),
              ),
            schoolId: req.school.id,
            classId,
            date,
            sessionId,
            studentId: entry.studentId,
            status: entry.status,
            updatedAt: new Date().toISOString(),
          });
        }
        await audit(tx, req.user, req.school.id, "attendance.batch-saved");
        return { saved: entries.length };
      });
      res.json(result);
    }),
  );
  router.post(
    "/exams/:examId/publish",
    route(async (req, res) => {
      requireManager(req);
      const result = await transact(req, async (tx) => {
        const exam = await examFor(tx, req, req.params.examId);
        assert(exam.status === "draft", 409, "Exam is already published");
        const roster = (await tx.all("users")).filter(
          (u) =>
            u.role === "student" &&
            u.schoolIds.includes(req.school.id) &&
            u.classIds.includes(exam.classId),
        );
        assert(roster.length > 0, 409, "Enroll students before publishing");
        const marks = (await scoped(tx, "marks", req.school.id)).filter(
            (m) => m.examId === exam.id,
          ),
          subjects = await scoped(tx, "subjects", req.school.id),
          cls = await classFor(tx, req, exam.classId),
          year = (await scoped(tx, "academicYears", req.school.id)).find(
            (y) => y.id === exam.academicYearId,
          );
        assert(
          roster.every((u) =>
            exam.subjects.every((s) =>
              marks.some(
                (m) =>
                  m.studentId === u.id &&
                  m.subjectId === s.subjectId &&
                  Number.isFinite(m.score) &&
                  m.score >= 0 &&
                  m.score <= s.maxScore,
              ),
            ),
          ),
          409,
          "Every enrolled student needs marks for every exam subject before publication",
        );
        const publishedAt = new Date().toISOString(),
          version = exam.version + 1;
        for (const student of roster) {
          const rows = exam.subjects.map((spec) => {
            const mark = marks.find(
              (m) =>
                m.studentId === student.id && m.subjectId === spec.subjectId,
            );
            const percent = (mark.score / spec.maxScore) * 100;
            return {
              subjectId: spec.subjectId,
              name: subjects.find((s) => s.id === spec.subjectId).name,
              score: mark.score,
              maxScore: spec.maxScore,
              weight: spec.weight,
              passPercent: spec.passPercent,
              percent,
              passed: percent >= spec.passPercent,
            };
          });
          const percentage =
              rows.reduce((sum, r) => sum + r.percent * r.weight, 0) /
              rows.reduce((sum, r) => sum + r.weight, 0),
            passed = rows.every((r) => r.passed),
            grade = exam.gradingBands.find(
              (b) => percentage >= b.minPercent,
            ).label;
          await tx.put("reports", {
            id: id(),
            schoolId: req.school.id,
            classId: exam.classId,
            studentId: student.id,
            examId: exam.id,
            version,
            studentName: student.name,
            schoolName: req.school.name,
            schoolCity: req.school.city,
            className: cls.name,
            academicYear: year.name,
            examName: exam.name,
            rows,
            totalScore: rows.reduce((sum, r) => sum + r.score, 0),
            totalMax: rows.reduce((sum, r) => sum + r.maxScore, 0),
            percentage,
            grade,
            passed,
            publishedAt,
            publishedBy: req.user.name,
            reportStyle:
              (await scoped(tx, "reportSettings", req.school.id))[0] || {},
          });
        }
        await tx.put("exams", {
          ...exam,
          status: "published",
          version,
          publishedAt,
          publishedBy: req.user.id,
        });
        await audit(tx, req.user, req.school.id, "exam.published");
        return { published: roster.length, version };
      });
      res.json(result);
    }),
  );
  router.post(
    "/exams/:examId/reopen",
    route(async (req, res) => {
      requireManager(req);
      assert(text(req.body.reason, 500), 400, "Provide a reason for reopening");
      await transact(req, async (tx) => {
        const exam = await examFor(tx, req, req.params.examId);
        assert(exam.status === "published", 409, "Exam is already a draft");
        await tx.put("exams", {
          ...exam,
          status: "draft",
          reopenedAt: new Date().toISOString(),
          reopenReason: req.body.reason.trim(),
        });
        await audit(tx, req.user, req.school.id, "exam.reopened");
      });
      res.json({ ok: true });
    }),
  );
  router.get(
    "/reports/:examId/:studentId",
    route(async (req, res) => {
      assert(
        management(req.user) || ["teacher", "student"].includes(req.user.role),
        403,
        "Report access denied",
      );
      const exam = await examFor(store, req, req.params.examId);
      assert(
        exam.status === "published",
        403,
        "Results have not been published",
      );
      assert(
        req.user.role !== "student" || req.params.studentId === req.user.id,
        403,
        "You can view only your own report",
      );
      const report = (await scoped(store, "reports", req.school.id)).find(
        (r) =>
          r.examId === exam.id &&
          r.studentId === req.params.studentId &&
          r.version === exam.version,
      );
      assert(report, 404, "Report not found");
      res.json(report);
    }),
  );
  router.get(
    "/reports/:examId/:studentId/history",
    route(async (req, res) => {
      requireManager(req);
      const exam = await examFor(store, req, req.params.examId);
      const reports = (await scoped(store, "reports", req.school.id))
        .filter(
          (r) => r.examId === exam.id && r.studentId === req.params.studentId,
        )
        .sort((a, b) => b.version - a.version);
      res.json({
        reports: reports.map((r) => ({
          ...r,
          archived: exam.status !== "published" || r.version !== exam.version,
        })),
      });
    }),
  );
  router.get(
    "/reports/:examId/:studentId/pdf",
    route(async (req, res) => {
      assert(
        management(req.user) || ["teacher", "student"].includes(req.user.role),
        403,
        "Report access denied",
      );
      const exam = await examFor(store, req, req.params.examId);
      const version =
        req.query.version === undefined
          ? exam.version
          : Number(req.query.version);
      assert(
        Number.isInteger(version) && version > 0,
        400,
        "Choose a report version",
      );
      assert(
        (management(req.user) ||
          (exam.status === "published" && version === exam.version)) &&
          (req.user.role !== "student" || req.params.studentId === req.user.id),
        403,
        "Only an approved accessible report can be exported",
      );
      const r = (await scoped(store, "reports", req.school.id)).find(
        (r) =>
          r.examId === exam.id &&
          r.studentId === req.params.studentId &&
          r.version === version,
      );
      assert(r, 404, "Report not found");
      const b = await reportPdf(r);
      res.json({
        filename: `report-${r.version}.pdf`,
        base64: b.toString("base64"),
      });
    }),
  );
  return router;
}
