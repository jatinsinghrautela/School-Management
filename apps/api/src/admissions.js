import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { id, managers, publicUser } from "./domain.js";
import { validDate } from "./calendar.js";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const text = (v, n = 200) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= n;
const email = (v) => text(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function details(body) {
  const {
    birthDate = "",
    admissionNumber = "",
    address = "",
    guardians = [],
  } = body;
  if (
    typeof birthDate !== "string" ||
    (birthDate &&
      (!validDate(birthDate) ||
        birthDate > new Date().toISOString().slice(0, 10))) ||
    typeof admissionNumber !== "string" ||
    admissionNumber.length > 60 ||
    typeof address !== "string" ||
    address.length > 500 ||
    !Array.isArray(guardians) ||
    guardians.length > 3
  )
    fail(
      400,
      "Check birth date, admission number, address and up to three guardians",
    );
  if (guardians.length && body.guardianConsent !== true)
    fail(400, "Confirm authorization to store guardian contact details");
  const contacts = guardians.map((g) => {
    if (
      !g ||
      !text(g.name) ||
      !text(g.relationship, 60) ||
      typeof g.phone !== "string" ||
      g.phone.length > 40 ||
      typeof g.email !== "string" ||
      (g.email && !email(g.email)) ||
      (!g.phone.trim() && !g.email.trim())
    )
      fail(
        400,
        "Each guardian needs a name, relationship and valid contact method",
      );
    return {
      name: g.name.trim(),
      relationship: g.relationship.trim(),
      phone: g.phone.trim(),
      email: g.email.trim().toLowerCase(),
    };
  });
  return {
    birthDate: birthDate || null,
    admissionNumber: admissionNumber.trim() || null,
    address: address.trim(),
    guardians: contacts,
  };
}
export function createAdmissionsRouter(store) {
  const router = Router({ mergeParams: true });
  const route = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e.status) res.status(e.status).json({ error: e.message });
      else next(e);
    }
  };
  const manage = (req) => {
    if (!managers.includes(req.user.role) || req.session.support)
      fail(403, "A normal school management session is required");
  };
  const audit = (tx, req, action, extra = {}) =>
    tx.put("audit", {
      id: id(),
      schoolId: req.school.id,
      actorId: req.user.id,
      action,
      ...extra,
      createdAt: new Date().toISOString(),
    });
  async function saveProfile(tx, req, studentId, data) {
    const existing = (await tx.all("studentProfiles", req.school.id)).find(
      (p) => p.studentId === studentId,
    );
    if (
      data.admissionNumber &&
      (await tx.all("studentProfiles", req.school.id)).some(
        (p) =>
          p.studentId !== studentId &&
          p.admissionNumber?.toLowerCase() ===
            data.admissionNumber.toLowerCase(),
      )
    )
      fail(409, "Admission number already belongs to another student");
    const { guardians, birthDate, admissionNumber, address } = data,
      fields = { birthDate, admissionNumber, address };
    const profile = await tx.put("studentProfiles", {
      ...existing,
      ...fields,
      id: existing?.id || id(),
      schoolId: req.school.id,
      studentId,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id,
    });
    const oldLinks = (await tx.all("studentGuardians", req.school.id)).filter(
      (l) => l.studentId === studentId && l.active,
    );
    const oldGuardians = await tx.all("guardians", req.school.id),
      retained = new Set();
    for (const contact of guardians) {
      const oldLink = oldLinks.find(
        (l) =>
          !retained.has(l.id) &&
          oldGuardians.some(
            (g) =>
              g.id === l.guardianId &&
              ["name", "relationship", "phone", "email"].every(
                (k) => g[k] === contact[k],
              ),
          ),
      );
      if (oldLink) {
        retained.add(oldLink.id);
        continue;
      }
      const guardian = await tx.put("guardians", {
        ...contact,
        id: id(),
        schoolId: req.school.id,
        consentRecordedBy: req.user.id,
        consentRecordedAt: new Date().toISOString(),
      });
      await tx.put("studentGuardians", {
        id: id(),
        schoolId: req.school.id,
        studentId,
        guardianId: guardian.id,
        active: true,
        createdAt: new Date().toISOString(),
      });
    }
    for (const link of oldLinks)
      if (!retained.has(link.id))
        await tx.put("studentGuardians", {
          ...link,
          active: false,
          endedAt: new Date().toISOString(),
        });
    return profile;
  }
  router.get(
    "/student-records",
    route(async (req, res) => {
      if (![...managers, "student"].includes(req.user.role))
        fail(403, "Student records access denied");
      const management = managers.includes(req.user.role);
      const students = (await store.all("users"))
        .filter(
          (u) =>
            u.role === "student" &&
            u.schoolIds.includes(req.school.id) &&
            (management || u.id === req.user.id),
        )
        .map(publicUser);
      const ids = new Set(students.map((u) => u.id));
      const links = (await store.all("studentGuardians", req.school.id)).filter(
        (l) => ids.has(l.studentId) && l.active,
      );
      const guardianIds = new Set(links.map((l) => l.guardianId));
      res.json({
        students,
        profiles: (await store.all("studentProfiles", req.school.id)).filter(
          (p) => ids.has(p.studentId),
        ),
        guardianLinks: links,
        guardians: (await store.all("guardians", req.school.id)).filter((g) =>
          guardianIds.has(g.id),
        ),
        enrollments: (await store.all("enrollments", req.school.id)).filter(
          (e) => ids.has(e.studentId),
        ),
        admissions: management
          ? await store.all("admissions", req.school.id)
          : [],
      });
    }),
  );
  router.post(
    "/students/:studentId/profile",
    route(async (req, res) => {
      manage(req);
      const data = details(req.body);
      const profile = await store.transaction(req.school.id, async (tx) => {
        await tx.lockUsers([req.params.studentId]);
        const student = (await tx.all("users")).find(
          (u) =>
            u.id === req.params.studentId &&
            u.role === "student" &&
            u.schoolIds.includes(req.school.id),
        );
        if (!student) fail(404, "Student not found");
        const result = await saveProfile(tx, req, student.id, data);
        await audit(tx, req, "student.profile-updated", {
          studentId: student.id,
        });
        return result;
      });
      res.json(profile);
    }),
  );
  router.post(
    "/admissions",
    route(async (req, res) => {
      manage(req);
      const { studentName, loginEmail, classId } = req.body;
      const data = details(req.body);
      if (!text(studentName) || !email(loginEmail))
        fail(400, "Provide the student's name and unique login email");
      const row = await store.transaction(req.school.id, async (tx) => {
        const cls = (await tx.all("classes", req.school.id)).find(
          (c) => c.id === classId,
        );
        if (!cls) fail(400, "Choose a class in this school");
        if (
          (await tx.all("admissions", req.school.id)).some(
            (a) =>
              a.loginEmail === loginEmail.toLowerCase() &&
              ["submitted", "reviewing", "admitted"].includes(a.status),
          ) ||
          (await tx.all("users")).some(
            (u) => u.email.toLowerCase() === loginEmail.toLowerCase(),
          )
        )
          fail(409, "An active application or account already uses this email");
        const applicationId = id(),
          now = new Date().toISOString();
        const result = await tx.put("admissions", {
          id: applicationId,
          schoolId: req.school.id,
          applicationNumber: `ADM-${now.slice(0, 10).replaceAll("-", "")}-${applicationId.slice(0, 8).toUpperCase()}`,
          studentName: studentName.trim(),
          loginEmail: loginEmail.toLowerCase(),
          classId,
          className: cls.name,
          ...data,
          status: "submitted",
          createdAt: now,
          history: [{ status: "submitted", actorId: req.user.id, at: now }],
        });
        await audit(tx, req, "admission.submitted", { applicationId });
        return result;
      });
      res.status(201).json(row);
    }),
  );
  router.post(
    "/admissions/:applicationId/decision",
    route(async (req, res) => {
      manage(req);
      const { status, reason = "" } = req.body;
      if (
        !["reviewing", "admitted", "rejected", "withdrawn"].includes(status) ||
        !text(reason, 500) ||
        reason.trim().length < 5
      )
        fail(400, "Choose a decision and a reason of 5–500 characters");
      const passwordHash =
        status === "admitted"
          ? await bcrypt.hash(randomBytes(32).toString("hex"), 12)
          : null;
      const result = await store.transaction(req.school.id, async (tx) => {
        const application = (await tx.all("admissions", req.school.id)).find(
          (a) => a.id === req.params.applicationId,
        );
        if (!application) fail(404, "Application not found");
        const allowed = {
          submitted: ["reviewing", "rejected", "withdrawn"],
          reviewing: ["admitted", "rejected", "withdrawn"],
        };
        if (!allowed[application.status]?.includes(status))
          fail(409, "Application changed or decision is not allowed");
        const now = new Date().toISOString();
        let studentId = null;
        if (status === "admitted") {
          const cls = (await tx.all("classes", req.school.id)).find(
              (c) => c.id === application.classId,
            ),
            year = (await tx.all("academicYears", req.school.id)).find(
              (y) => y.id === cls?.academicYearId,
            );
          if (!year || year.endDate < now.slice(0, 10))
            fail(
              409,
              "The selected class has no open academic year; submit a new application for a valid class",
            );
          if (
            (await tx.all("users")).some(
              (u) => u.email.toLowerCase() === application.loginEmail,
            )
          )
            fail(409, "Login email is already in use");
          studentId = id();
          await tx.put("users", {
            id: studentId,
            name: application.studentName,
            email: application.loginEmail,
            passwordHash,
            passwordChangeRequired: true,
            authVersion: 0,
            active: true,
            role: "student",
            orgId: req.school.orgId || null,
            schoolIds: [req.school.id],
            classIds: [cls.id],
          });
          await saveProfile(tx, req, studentId, application);
          await tx.put("enrollments", {
            id: id(),
            schoolId: req.school.id,
            studentId,
            classId: cls.id,
            className: cls.name,
            academicYearId: year.id,
            status: "active",
            startedOn: now.slice(0, 10),
            applicationId: application.id,
          });
        }
        const row = await tx.put("admissions", {
          ...application,
          status,
          ...(studentId ? { studentId } : {}),
          updatedAt: now,
          history: [
            ...application.history,
            { status, reason: reason.trim(), actorId: req.user.id, at: now },
          ],
        });
        await audit(tx, req, `admission.${status}`, {
          applicationId: application.id,
          studentId,
        });
        return row;
      });
      res.json(result);
    }),
  );
  return router;
}
