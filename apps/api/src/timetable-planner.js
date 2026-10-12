import { Router } from "express";
import ExcelJS from "exceljs";
import multer from "multer";
import { randomInt } from "node:crypto";
import { id } from "./domain.js";
import { route, manage, fail, audit } from "./operations-common.js";
import { boundedZip } from "./calendar-workbook.js";
import { brandWorkbook } from "./document-brand.js";
import { schoolLogo } from "./school-media.js";
import { defaultSettings } from "./family-social.js";
export const minutes = (v) =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
    ? Number(v.slice(0, 2)) * 60 + Number(v.slice(3))
    : NaN;
const clock = (n) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export function lessonSlots(config) {
  const {
    start,
    end,
    assemblyMinutes = 0,
    lunchCount = 1,
    lunchMinutes = 30,
    periodMinutes = 40,
  } = config;
  if (
    !Number.isFinite(minutes(start)) ||
    !Number.isFinite(minutes(end)) ||
    minutes(end) <= minutes(start) ||
    ![assemblyMinutes, lunchCount, lunchMinutes, periodMinutes].every(
      Number.isInteger,
    ) ||
    assemblyMinutes < 0 ||
    assemblyMinutes > 90 ||
    lunchCount < 0 ||
    lunchCount > 3 ||
    lunchMinutes < 0 ||
    lunchMinutes > 90 ||
    periodMinutes < 10 ||
    periodMinutes > 120 ||
    (lunchCount && lunchMinutes < 1)
  )
    fail(
      400,
      "Check school timings, assembly, lunch breaks and period duration",
    );
  const count = Math.floor(
    (minutes(end) -
      minutes(start) -
      assemblyMinutes -
      lunchCount * lunchMinutes) /
      periodMinutes,
  );
  if (count < 1 || count > 16 || lunchCount >= count)
    fail(400, "School timings must fit 1–16 periods and the selected breaks");
  const breaks = new Set(
    Array.from({ length: lunchCount }, (_, i) =>
      Math.floor((count * (i + 1)) / (lunchCount + 1)),
    ),
  );
  let cursor = minutes(start) + assemblyMinutes;
  const slots = [];
  for (let i = 0; i < count; i++) {
    if (breaks.has(i)) cursor += lunchMinutes;
    slots.push({ start: clock(cursor), end: clock(cursor + periodMinutes) });
    cursor += periodMinutes;
  }
  return slots;
}
const overlap = (a, b) =>
  a.day === b.day &&
  a.academicYearId === b.academicYearId &&
  minutes(a.start) < minutes(b.end) &&
  minutes(b.start) < minutes(a.end) &&
  (a.classId === b.classId ||
    a.teacherId === b.teacherId ||
    (a.room && b.room && a.room.toLowerCase() === b.room.toLowerCase()));
async function context(tx, school) {
  return {
    classes: await tx.all("classes", school.id),
    subjects: await tx.all("subjects", school.id),
    users: await tx.all("users"),
    existing: (await tx.all("timetable", school.id)).filter(
      (e) => !e.cancelled,
    ),
  };
}
function validatedRow(raw, ctx, school) {
  const { classId, subjectId, teacherId, day, start, end, room = "" } = raw;
  const cls = ctx.classes.find((c) => c.id === classId && c.academicYearId);
  const subject = ctx.subjects.find(
    (s) => s.id === subjectId && s.classId === classId,
  );
  const teacher = ctx.users.find(
    (u) =>
      u.id === teacherId &&
      u.role === "teacher" &&
      u.active !== false &&
      u.schoolIds.includes(school.id) &&
      u.classIds.includes(classId),
  );
  if (
    !cls ||
    !subject ||
    !teacher ||
    !subject.teacherIds.includes(teacherId) ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 7 ||
    !Number.isFinite(minutes(start)) ||
    !Number.isFinite(minutes(end)) ||
    minutes(end) <= minutes(start) ||
    typeof room !== "string" ||
    room.length > 80
  )
    fail(
      400,
      "Each period needs a valid class, subject, assigned active teacher, weekday and times",
    );
  return {
    classId,
    subjectId,
    teacherId,
    day,
    start,
    end,
    room: room.trim(),
    academicYearId: cls.academicYearId,
  };
}
export function createTimetablePlannerRouter(store) {
  const r = Router({ mergeParams: true });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024, files: 1, fields: 1 },
  }).single("file");
  r.post(
    "/timetable-plan/generate",
    route(async (req, res) => {
      manage(req);
      const { classIds, subjectIds, weekdays, config } = req.body;
      if (
        !Array.isArray(classIds) ||
        !classIds.length ||
        classIds.length > 30 ||
        new Set(classIds).size !== classIds.length ||
        !Array.isArray(subjectIds) ||
        !subjectIds.length ||
        !Array.isArray(weekdays) ||
        !weekdays.length ||
        new Set(weekdays).size !== weekdays.length ||
        weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)
      )
        fail(400, "Select classes, subjects and distinct weekdays");
      const slots = lessonSlots(config || {});
      if (classIds.length * slots.length * weekdays.length > 2000)
        fail(400, "Plan at most 2000 periods at once");
      const ctx = await context(store, req.school);
      const planned = [];
      let steps = 0;
      const classes = classIds.map((cid) =>
        ctx.classes.find((c) => c.id === cid && c.academicYearId),
      );
      if (classes.some((c) => !c))
        fail(400, "Choose this school’s year-linked classes");
      const choices = new Map(
        classes.map((c) => [
          c.id,
          ctx.subjects
            .filter((s) => s.classId === c.id && subjectIds.includes(s.id))
            .flatMap((s) =>
              s.teacherIds.map((t) => ({
                classId: c.id,
                subjectId: s.id,
                teacherId: t,
                academicYearId: c.academicYearId,
                room: "",
              })),
            )
            .filter((p) =>
              ctx.users.some(
                (u) =>
                  u.id === p.teacherId &&
                  u.role === "teacher" &&
                  u.active !== false &&
                  u.schoolIds.includes(req.school.id) &&
                  u.classIds.includes(c.id),
              ),
            ),
        ]),
      );
      if (classes.some((c) => !choices.get(c.id).length))
        fail(
          400,
          "Every selected class needs a selected subject with an active assigned teacher",
        );
      for (const day of weekdays)
        for (const slot of slots) {
          const ordered = [...classes].sort(
            (a, b) => choices.get(a.id).length - choices.get(b.id).length,
          );
          const local = [];
          function search(index) {
            if (index === ordered.length) return true;
            if (++steps > 100000)
              fail(
                409,
                "Planner reached its search limit; reduce classes or add available teachers",
              );
            const candidates = [...choices.get(ordered[index].id)];
            for (let i = candidates.length - 1; i > 0; i--) {
              const j = randomInt(i + 1);
              [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
            // Prefer less-used subjects, randomizing ties. All candidates remain available.
            candidates.sort(
              (a, b) =>
                planned.filter(
                  (p) => p.classId === a.classId && p.subjectId === a.subjectId,
                ).length -
                planned.filter(
                  (p) => p.classId === b.classId && p.subjectId === b.subjectId,
                ).length,
            );
            for (const choice of candidates) {
              const row = { ...choice, day, ...slot };
              if (
                [...ctx.existing, ...planned, ...local].some((e) =>
                  overlap(row, e),
                )
              )
                continue;
              local.push(row);
              if (search(index + 1)) return true;
              local.pop();
            }
            return false;
          }
          if (!search(0))
            fail(
              409,
              `Not enough available assigned teachers for day ${day} at ${slot.start}. No periods were saved. Review existing bookings or teacher assignments.`,
            );
          planned.push(...local);
        }
      res.json({ rows: planned, config, weekdays });
    }),
  );
  r.post(
    "/timetable-plan/apply",
    route(async (req, res) => {
      manage(req);
      const { rows, config } = req.body;
      if (!Array.isArray(rows) || !rows.length || rows.length > 2000)
        fail(400, "Review 1–2000 timetable periods");
      if (config) lessonSlots(config);
      const result = await store.transaction(req.school.id, async (tx) => {
        if (
          (await tx.all("substitutions", req.school.id)).some(
            (s) =>
              !s.cancelled && s.date >= new Date().toISOString().slice(0, 10),
          )
        )
          fail(
            409,
            "Review future substitutions before changing weekly schedules",
          );
        if (rows.some((p) => !p || typeof p.teacherId !== "string"))
          fail(400, "Every period needs a teacher");
        await tx.lockUsers([...new Set(rows.map((p) => p.teacherId))].sort());
        const ctx = await context(tx, req.school);
        const clean = rows.map((p) => validatedRow(p, ctx, req.school));
        const checked = [...ctx.existing];
        for (const row of clean) {
          if (checked.some((e) => overlap(row, e)))
            fail(
              409,
              "Timetable overlaps an existing class, teacher or room booking. No changes saved.",
            );
          checked.push(row);
        }
        for (const row of clean)
          await tx.put("timetable", {
            ...row,
            id: id(),
            schoolId: req.school.id,
            cancelled: false,
          });
        if (config) {
          const settings = (await tx.all("schoolSettings", req.school.id))[0];
          await tx.put("schoolSettings", {
            ...defaultSettings,
            ...settings,
            id: settings?.id || id(),
            schoolId: req.school.id,
            timetablePlanning: config,
            version: (settings?.version || 0) + 1,
          });
        }
        await audit(tx, req, "timetable.batch-created", {
          count: clean.length,
        });
        return { created: clean.length };
      });
      res.json(result);
    }),
  );
  r.post(
    "/timetable-plan/template",
    route(async (req, res) => {
      manage(req);
      const { classId, config, weekdays = [1, 2, 3, 4, 5] } = req.body;
      const slots = lessonSlots(config || {});
      const ctx = await context(store, req.school);
      const cls = ctx.classes.find((c) => c.id === classId && c.academicYearId);
      if (
        !cls ||
        !Array.isArray(weekdays) ||
        weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7) ||
        weekdays.length > 7
      )
        fail(400, "Choose a class and weekdays");
      const book = new ExcelJS.Workbook(),
        sheet = book.addWorksheet("Timetable");
      sheet.addRow(["Day", "Start", "End", "Subject", "Teacher email", "Room"]);
      for (const day of weekdays)
        for (const slot of slots)
          sheet.addRow([String(day), slot.start, slot.end, "", "", ""]);
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((c) => {
        c.width = 28;
        c.numFmt = "@";
      });
      const meta = book.addWorksheet("Class");
      meta.addRow(["School ID", "Class ID", "Class name"]);
      meta.addRow([req.school.id, cls.id, cls.name]);
      const lookup = book.addWorksheet("Assignments");
      lookup.addRow(["Subject", "Teacher name", "Teacher email", "Category"]);
      for (const s of ctx.subjects.filter((s) => s.classId === classId))
        for (const tid of s.teacherIds) {
          const t = ctx.users.find((u) => u.id === tid && u.active !== false);
          if (t)
            lookup.addRow([s.name, t.name, t.email, s.category || "academic"]);
        }
      lookup.columns.forEach((c) => (c.width = 30));
      brandWorkbook(
        book,
        req.school.name,
        await schoolLogo(store, req.school.id),
      );
      res.json({
        filename: `class-timetable-${cls.id}.xlsx`,
        base64: Buffer.from(await book.xlsx.writeBuffer()).toString("base64"),
      });
    }),
  );
  r.post(
    "/timetable-plan/preview",
    upload,
    route(async (req, res) => {
      manage(req);
      if (!req.file) fail(400, "Choose the completed .xlsx timetable");
      boundedZip(req.file.buffer);
      const book = new ExcelJS.Workbook();
      try {
        await book.xlsx.load(req.file.buffer);
      } catch {
        fail(400, "Upload a valid workbook");
      }
      const meta = book.getWorksheet("Class");
      const sheet = book.getWorksheet("Timetable");
      if (
        !sheet ||
        sheet.rowCount > 501 ||
        !meta ||
        meta.getCell("A2").value !== req.school.id ||
        !["Day", "Start", "End", "Subject", "Teacher email", "Room"].every(
          (h, i) => sheet.getRow(1).getCell(i + 1).value === h,
        )
      )
        fail(400, "Use this school’s unchanged timetable template");
      const classId = meta.getCell("B2").value;
      const ctx = await context(store, req.school);
      const rows = [];
      for (let n = 2; n <= sheet.rowCount; n++) {
        const cells = [1, 2, 3, 4, 5, 6].map(
          (i) => sheet.getRow(n).getCell(i).value ?? "",
        );
        if (cells.every((v) => v === "")) continue;
        if (cells.some((v) => typeof v !== "string" && typeof v !== "number"))
          fail(400, `Row ${n}: use plain text, no formulas`);
        const [d, start, end, subject, email, room] = cells.map(String);
        const subjects = ctx.subjects.filter(
          (s) => s.classId === classId && s.name === subject.trim(),
        );
        const teacher = ctx.users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
        );
        if (subjects.length !== 1 || !teacher)
          fail(
            400,
            `Row ${n}: copy a subject and teacher email from Assignments`,
          );
        const row = validatedRow(
          {
            classId,
            subjectId: subjects[0].id,
            teacherId: teacher.id,
            day: Number(d),
            start,
            end,
            room,
          },
          ctx,
          req.school,
        );
        if ([...ctx.existing, ...rows].some((e) => overlap(row, e)))
          fail(409, `Row ${n}: overlaps a class, teacher or room booking`);
        rows.push(row);
      }
      if (!rows.length) fail(400, "Fill at least one period");
      res.json({ rows });
    }),
  );
  return r;
}
