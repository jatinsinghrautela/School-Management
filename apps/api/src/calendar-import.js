import { schoolLogo } from "./school-media.js";
import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { id, managers } from "./domain.js";
import {
  holidayCountries,
  holidayStates,
  holidayRegions,
} from "./public-holidays.js";
import {
  calendarWorkbook,
  preferences,
  readCalendarWorkbook,
  calendarDigest,
  importedId,
} from "./calendar-workbook.js";
const scoped = async (store, schoolId) =>
  (await store.all("calendar")).filter((e) => e.schoolId === schoolId);
const sameEntry = (old, row) =>
  old.title === row.title &&
  old.description === row.description &&
  old.kind === row.status.toLowerCase() &&
  old.startDate === row.date &&
  old.endDate === row.date &&
  old.audience === "all" &&
  !old.classId;
function changes(existing, rows, schoolId) {
  const result = {
    created: 0,
    updated: 0,
    cancelled: 0,
    unchanged: 0,
    holidays: 0,
    events: 0,
    working: 0,
  };
  for (const row of rows) {
    result[
      row.status === "Holiday"
        ? "holidays"
        : row.status === "Event"
          ? "events"
          : "working"
    ]++;
    const old = existing.find((e) => e.id === importedId(schoolId, row.date));
    if (row.status === "Working")
      result[old && !old.cancelled ? "cancelled" : "unchanged"]++;
    else if (!old || old.cancelled) result.created++;
    else result[sameEntry(old, row) ? "unchanged" : "updated"]++;
  }
  return result;
}
export function createCalendarImportRouter(store) {
  const router = Router({ mergeParams: true }),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024, files: 1, fields: 0 },
    }).single("file");
  router.use("/calendar-excel", (req, res, next) =>
    managers.includes(req.user.role)
      ? next()
      : res.status(403).json({ error: "School management access required" }),
  );
  router.use(
    "/calendar-excel",
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }),
  );
  router.get("/calendar-excel/locations", (req, res) => {
    const country = req.query.country || "",
      state = req.query.state || "";
    if (
      typeof country !== "string" ||
      typeof state !== "string" ||
      (country && !Object.hasOwn(holidayCountries(), country)) ||
      (state && !Object.hasOwn(holidayStates(country), state))
    )
      return res.status(400).json({ error: "Unsupported holiday location" });
    res.json({
      countries: holidayCountries(),
      states: country ? holidayStates(country) : {},
      regions: state ? holidayRegions(country, state) : {},
    });
  });
  const failure = (error, res, next) =>
    error.status
      ? res
          .status(error.status)
          .json({ error: error.message, errors: error.errors })
      : next(error);
  router.post("/calendar-excel/template", async (req, res, next) => {
    try {
      const prefs = preferences(req.body),
        buffer = await calendarWorkbook(
          req.school,
          prefs,
          await schoolLogo(store, req.school.id),
        );
      res.json({
        filename: `school-calendar-${prefs.year}.xlsx`,
        content: buffer.toString("base64"),
      });
    } catch (e) {
      failure(e, res, next);
    }
  });
  router.post(
    "/calendar-excel/preview",
    (req, res, next) =>
      upload(req, res, (e) =>
        e
          ? res
              .status(400)
              .json({ error: "Upload one .xlsx file, maximum 1 MB" })
          : next(),
      ),
    async (req, res, next) => {
      try {
        if (!req.file || !/\.xlsx$/i.test(req.file.originalname))
          return res
            .status(400)
            .json({ error: "Upload the downloaded .xlsx calendar template" });
        const input = await readCalendarWorkbook(
          req.file.buffer,
          req.school.id,
        );
        const existing = await scoped(store, req.school.id),
          summary = changes(existing, input.rows, req.school.id);
        const preview = await store.put("calendarImports", {
          id: id(),
          schoolId: req.school.id,
          actorId: req.user.id,
          authVersion: req.user.authVersion || 0,
          ...input,
          digest: calendarDigest(existing),
          expires: Date.now() + 15 * 60 * 1000,
          consumed: false,
        });
        res.json({
          previewId: preview.id,
          preferences: input.preferences,
          summary,
          rows: input.rows,
          expires: preview.expires,
        });
      } catch (e) {
        failure(e, res, next);
      }
    },
  );
  router.post("/calendar-excel/apply", async (req, res, next) => {
    try {
      const result = await store.transaction(req.school.id, async (tx) => {
        const preview = (await tx.all("calendarImports")).find(
          (p) =>
            p.id === req.body.previewId &&
            p.schoolId === req.school.id &&
            p.actorId === req.user.id &&
            p.authVersion === (req.user.authVersion || 0),
        );
        const reject = (message) => {
          throw Object.assign(new Error(message), { status: 409 });
        };
        if (!preview || preview.consumed || preview.expires <= Date.now())
          reject("Preview expired or already used. Upload the workbook again.");
        const existing = await scoped(tx, req.school.id);
        if (calendarDigest(existing) !== preview.digest)
          reject(
            "The calendar changed since preview. Upload again to review the latest changes.",
          );
        const summary = changes(existing, preview.rows, req.school.id);
        for (const row of preview.rows) {
          const key = importedId(req.school.id, row.date),
            old = existing.find((e) => e.id === key);
          if (row.status === "Working") {
            if (old && !old.cancelled)
              await tx.put("calendar", {
                ...old,
                cancelled: true,
                cancellationReason:
                  "Date marked Working in yearly Excel import",
                updatedAt: new Date().toISOString(),
              });
          } else if (!old || old.cancelled || !sameEntry(old, row)) {
            await tx.put("calendar", {
              id: key,
              schoolId: req.school.id,
              startDate: row.date,
              endDate: row.date,
              title: row.title,
              description: row.description,
              kind: row.status.toLowerCase(),
              audience: "all",
              classId: null,
              cancelled: false,
              source: "year-calendar-excel",
              importYear: preview.preferences.year,
              updatedAt: new Date().toISOString(),
            });
          }
        }
        await tx.put("calendarPolicies", {
          id: importedId(req.school.id, `policy-${preview.preferences.year}`),
          schoolId: req.school.id,
          ...preview.preferences,
          updatedAt: new Date().toISOString(),
        });
        // Retain the decision metadata; the large preview payload is no longer needed.
        await tx.put("calendarImports", {
          id: preview.id,
          schoolId: preview.schoolId,
          actorId: preview.actorId,
          consumed: true,
          expires: preview.expires,
          preferences: preview.preferences,
        });
        await tx.put("audit", {
          id: id(),
          schoolId: req.school.id,
          actorId: req.user.id,
          action: "calendar.year-imported",
          year: preview.preferences.year,
          summary,
          preferences: preview.preferences,
          createdAt: new Date().toISOString(),
        });
        return summary;
      });
      res.json(result);
    } catch (e) {
      failure(e, res, next);
    }
  });
  return router;
}
