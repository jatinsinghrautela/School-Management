import { schoolLogo } from "./school-media.js";
import { brandWorkbook } from "./document-brand.js";
import { Router } from "express";
import ExcelJS from "exceljs";
import multer from "multer";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { id, managers, canSeeClass, publicUser } from "./domain.js";
import { boundedZip as validateArchive } from "./calendar-workbook.js";
import { holidaysOn } from "./calendar.js";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export function createDataToolsRouter(store) {
  const router = Router({ mergeParams: true }),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024, files: 1, fields: 0 },
    }).single("file");
  const route = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e.status)
        res.status(e.status).json({ error: e.message, errors: e.errors });
      else next(e);
    }
  };
  const management = (req) => {
    if (!managers.includes(req.user.role) || req.session?.support)
      fail(403, "A normal school management session is required");
  };
  const scope = (rows, req) =>
    rows.filter(
      (r) =>
        r.schoolId === req.school.id &&
        (!r.classId || canSeeClass(req.user, r.classId)),
    );
  const roster = (rows, req) =>
    rows.filter(
      (u) =>
        u.schoolIds.includes(req.school.id) &&
        (managers.includes(req.user.role) ||
          u.id === req.user.id ||
          (req.user.role === "teacher" &&
            u.role === "student" &&
            u.classIds.some((c) => canSeeClass(req.user, c)))),
    );
  async function workbookResponse(req, res, book, filename) {
    brandWorkbook(
      book,
      req.school.name,
      await schoolLogo(store, req.school.id),
    );
    const b = await book.xlsx.writeBuffer();
    res.json({ filename, base64: Buffer.from(b).toString("base64") });
  }
  router.get(
    "/directory",
    route(async (req, res) => {
      const page = Number(req.query.page || 1),
        limit = Number(req.query.limit || 20),
        q = req.query.q || "";
      if (
        !Number.isInteger(page) ||
        page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        typeof q !== "string" ||
        q.length > 200
      )
        fail(400, "Choose a valid search and page");
      const rows = roster(await store.all("users"), req)
        .filter((u) =>
          `${u.name} ${u.email} ${u.role}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json({
        total: rows.length,
        page,
        limit,
        users: rows.slice((page - 1) * limit, page * limit).map(publicUser),
      });
    }),
  );
  router.get(
    "/exports/:kind",
    route(async (req, res) => {
      const kind = req.params.kind;
      if (!["attendance", "directory", "results"].includes(kind))
        fail(404, "Export not found");
      if (kind === "directory") management(req);
      if (!["student", "teacher", ...managers].includes(req.user.role))
        fail(403, "Export access denied");
      const book = new ExcelJS.Workbook(),
        sheet = book.addWorksheet(kind),
        users = await store.all("users");
      if (kind === "directory") {
        sheet.addRow(["Name", "Email", "Role", "Active"]);
        roster(users, req).forEach((u) =>
          sheet.addRow([u.name, u.email, u.role, u.active !== false]),
        );
      }
      if (kind === "attendance") {
        sheet.addRow([
          "Student",
          "Date",
          "Session",
          "Status",
          "Class",
          "School day",
        ]);
        const sessions = await store.all("attendanceSessions");
        const classes = await store.all("classes"),
          calendar = await store.all("calendar");
        scope(await store.all("attendance"), req)
          .filter(
            (r) => req.user.role !== "student" || r.studentId === req.user.id,
          )
          .forEach((r) =>
            sheet.addRow([
              users.find((u) => u.id === r.studentId)?.name || "Student",
              r.date,
              sessions.find((s) => s.id === r.sessionId)?.name || "Daily",
              r.status,
              classes.find((c) => c.id === r.classId)?.name || "Class",
              holidaysOn(calendar, req.school.id, r.date).length === 0,
            ]),
          );
      }
      if (kind === "results") {
        sheet.addRow([
          "Student",
          "Exam",
          "Version",
          "Percentage",
          "Grade",
          "Passed",
        ]);
        const exams = await store.all("exams");
        (req.user.role === "student"
          ? (await store.all("reports")).filter(
              (r) =>
                r.schoolId === req.school.id && r.studentId === req.user.id,
            )
          : scope(await store.all("reports"), req)
        )
          .filter(
            (r) =>
              (req.user.role !== "student" || r.studentId === req.user.id) &&
              exams.some(
                (e) =>
                  e.id === r.examId &&
                  e.status === "published" &&
                  e.version === r.version,
              ),
          )
          .forEach((r) =>
            sheet.addRow([
              r.studentName,
              r.examName,
              r.version,
              r.percentage,
              r.grade,
              r.passed,
            ]),
          );
      }
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.columns.forEach((c) => (c.width = 26));
      await workbookResponse(req, res, book, `${kind}.xlsx`);
    }),
  );
  router.get(
    "/people-import/template",
    route(async (req, res) => {
      management(req);
      const book = new ExcelJS.Workbook(),
        sheet = book.addWorksheet("People"),
        lookup = book.addWorksheet("Classes"),
        years = await store.all("academicYears");
      sheet.addRow(["Name", "Email", "Role", "Class"]);
      sheet.addRow(["", "", "student", ""]);
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((c) => (c.width = 35));
      lookup.addRow(["Class choice"]);
      scope(await store.all("classes"), req).forEach((c) =>
        lookup.addRow([
          `${c.name} | ${years.find((y) => y.id === c.academicYearId)?.name || "Legacy"}`,
        ]),
      );
      for (let row = 2; row <= 201; row++)
        sheet.getCell(`C${row}`).dataValidation = {
          type: "list",
          formulae: ['"student,teacher,staff"'],
        };
      await workbookResponse(req, res, book, "people-import.xlsx");
    }),
  );
  router.post(
    "/people-import/preview",
    upload,
    route(async (req, res) => {
      management(req);
      if (!req.file) fail(400, "Choose the completed .xlsx template");
      validateArchive(req.file.buffer);
      const book = new ExcelJS.Workbook();
      try {
        await book.xlsx.load(req.file.buffer);
      } catch {
        fail(400, "Upload a valid Excel workbook");
      }
      const sheet = book.getWorksheet("People");
      if (!sheet || sheet.rowCount > 201)
        fail(400, "Use the People sheet with at most 200 users");
      if (
        ["Name", "Email", "Role", "Class"].some(
          (h, i) => sheet.getRow(1).getCell(i + 1).value !== h,
        )
      )
        fail(400, "Keep the template columns");
      const classes = scope(await store.all("classes"), req),
        years = await store.all("academicYears"),
        users = await store.all("users"),
        errors = [],
        entries = [],
        seen = new Set();
      if (!classes.length)
        fail(
          400,
          "This school has no classes yet. Create an academic year and its classes/sections in Academics, then download a fresh people template and use its Classes sheet choices.",
        );
      for (let n = 2; n <= sheet.rowCount; n++) {
        const cells = [1, 2, 3, 4].map(
          (i) => sheet.getRow(n).getCell(i).value ?? "",
        );
        if (cells.every((v) => v === "")) continue;
        if (cells.some((v) => typeof v !== "string")) {
          errors.push(`Row ${n}: use plain text, no formulas`);
          continue;
        }
        const [name, email, role, label] = cells.map((v) => v.trim());
        if (!name && !email && role === "student" && !label) continue;
        const cls = classes.filter(
          (c) =>
            `${c.name} | ${years.find((y) => y.id === c.academicYearId)?.name || "Legacy"}` ===
            label,
        );
        const issues = [];
        if (!name || name.length > 200)
          issues.push("name is required and must be at most 200 characters");
        if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          issues.push("enter a valid email");
        if (!["student", "teacher", "staff"].includes(role))
          issues.push("role must be student, teacher or staff");
        if ((label || role === "student") && cls.length !== 1)
          issues.push(
            "class choice does not match this school's classes; copy the exact value from a newly downloaded template's Classes sheet",
          );
        if (seen.has(email.toLowerCase()))
          issues.push("email is repeated in this workbook");
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
          issues.push("email already belongs to an account");
        if (issues.length) errors.push(`Row ${n}: ${issues.join("; ")}`);
        else
          entries.push({
            name,
            email: email.toLowerCase(),
            role,
            classIds: cls.length ? [cls[0].id] : [],
          });
        seen.add(email.toLowerCase());
      }
      if (errors.length)
        throw Object.assign(
          new Error("Fix the spreadsheet rows before importing"),
          { status: 400, errors: errors.slice(0, 30) },
        );
      if (!entries.length) fail(400, "Add at least one user");
      const row = await store.put("peopleImports", {
        id: id(),
        schoolId: req.school.id,
        actorId: req.user.id,
        authVersion: req.user.authVersion || 0,
        entries,
        used: false,
        expiresAt: Date.now() + 900000,
      });
      res.json({ previewId: row.id, entries, expiresAt: row.expiresAt });
    }),
  );
  router.post(
    "/people-import/apply",
    route(async (req, res) => {
      management(req);
      const p = (await store.all("peopleImports")).find(
        (p) =>
          p.id === req.body.previewId &&
          p.schoolId === req.school.id &&
          p.actorId === req.user.id,
      );
      if (
        !p ||
        p.used ||
        p.expiresAt <= Date.now() ||
        p.authVersion !== (req.user.authVersion || 0)
      )
        fail(409, "Import preview expired or unavailable");
      const passwords = p.entries.map(() =>
        randomBytes(18).toString("base64url"),
      );
      const hashes = await Promise.all(
        passwords.map((password) => bcrypt.hash(password, 12)),
      );
      const credentials = new ExcelJS.Workbook();
      const sheet = credentials.addWorksheet("Login credentials");
      sheet.addRow([
        "Name",
        "Email",
        "Role",
        "Temporary password",
        "First login",
      ]);
      p.entries.forEach((entry, index) =>
        sheet.addRow([
          entry.name,
          entry.email,
          entry.role,
          passwords[index],
          "Change password before using the workspace",
        ]),
      );
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.columns.forEach((column) => (column.width = 36));
      sheet.getColumn(5).width = 52;
      brandWorkbook(
        credentials,
        req.school.name,
        await schoolLogo(store, req.school.id),
      );
      // Serialize before committing accounts; plaintext credentials never enter the store.
      const credentialBuffer = await credentials.xlsx.writeBuffer();
      const result = await store.transaction(req.school.id, async (tx) => {
        const current = (await tx.all("peopleImports")).find(
            (i) => i.id === p.id,
          ),
          users = await tx.all("users"),
          classes = await tx.all("classes");
        if (
          current.used ||
          current.expiresAt <= Date.now() ||
          p.entries.some(
            (e) =>
              users.some((u) => u.email.toLowerCase() === e.email) ||
              e.classIds.some(
                (c) =>
                  !classes.some(
                    (r) => r.id === c && r.schoolId === req.school.id,
                  ),
              ),
          )
        )
          fail(409, "Users or classes changed; upload again");
        for (let i = 0; i < p.entries.length; i++) {
          const user = await tx.put("users", {
            id: id(),
            ...p.entries[i],
            orgId: req.school.orgId || null,
            schoolIds: [req.school.id],
            passwordHash: hashes[i],
            passwordChangeRequired: true,
            authVersion: 0,
            active: true,
          });
          if (user.role === "student")
            for (const classId of user.classIds) {
              const cls = classes.find((c) => c.id === classId);
              await tx.put("enrollments", {
                id: id(),
                schoolId: req.school.id,
                studentId: user.id,
                classId,
                className: cls.name,
                academicYearId: cls.academicYearId,
                status: "active",
                startedOn: new Date().toISOString().slice(0, 10),
              });
            }
        }
        await tx.put("peopleImports", { ...current, entries: [], used: true });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          schoolId: req.school.id,
          action: "users.imported",
          count: p.entries.length,
          createdAt: new Date().toISOString(),
        });
        return { created: p.entries.length };
      });
      res.set("Cache-Control", "no-store");
      res.json({
        ...result,
        credentials: {
          filename: `people-login-credentials-${p.id}.xlsx`,
          base64: Buffer.from(credentialBuffer).toString("base64"),
        },
      });
    }),
  );
  return router;
}
