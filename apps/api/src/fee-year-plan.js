import { Router } from "express";
import { id } from "./domain.js";
import { route, manage, fail, audit, text, key } from "./operations-common.js";
export function createFeeYearPlanRouter(store) {
  const r = Router({ mergeParams: true });
  r.post(
    "/fee-year-plan",
    route(async (req, res) => {
      manage(req);
      const {
        classId,
        name,
        amountMinor,
        currency = "INR",
        months,
        dueDay,
        requestKey,
        assign = false,
      } = req.body;
      if (
        !text(name, 70) ||
        !Number.isSafeInteger(amountMinor) ||
        amountMinor < 1 ||
        amountMinor > 1000000000 ||
        !["INR", "USD", "EUR", "GBP"].includes(currency) ||
        !Array.isArray(months) ||
        !months.length ||
        months.length > 24 ||
        new Set(months).size !== months.length ||
        months.some(
          (m) => typeof m !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m),
        ) ||
        !Number.isInteger(dueDay) ||
        dueDay < 1 ||
        dueDay > 31 ||
        !key(requestKey) ||
        typeof assign !== "boolean"
      )
        fail(
          400,
          "Choose distinct months, a due day from 1–31, class and valid monthly amount",
        );
      const signature = JSON.stringify({
        classId,
        name,
        amountMinor,
        currency,
        months: [...months].sort(),
        dueDay,
        assign,
      });
      const result = await store.transaction(req.school.id, async (tx) => {
        const existing = await tx.all("feeSchedules", req.school.id);
        const previous = existing.filter(
          (s) => s.planRequestKey === requestKey,
        );
        if (previous.length) {
          if (previous[0].planSignature !== signature)
            fail(409, "This request key was used for a different plan");
          return { created: previous.length, repeated: true };
        }
        const cls = (await tx.all("classes", req.school.id)).find(
          (c) => c.id === classId,
        );
        const year = (await tx.all("academicYears", req.school.id)).find(
          (y) => y.id === cls?.academicYearId,
        );
        if (!year) fail(400, "Choose a year-linked class");
        const dueDates = months.map((m) => {
          const [y, month] = m.split("-").map(Number);
          const day = Math.min(
            dueDay,
            new Date(Date.UTC(y, month, 0)).getUTCDate(),
          );
          const date = `${m}-${String(day).padStart(2, "0")}`;
          if (date < year.startDate || date > year.endDate)
            fail(400, `Due date ${date} is outside this class's academic year`);
          return date;
        });
        const users = (await tx.all("users")).filter(
          (u) =>
            u.role === "student" &&
            u.active !== false &&
            u.schoolIds.includes(req.school.id) &&
            u.classIds.includes(classId),
        );
        if (assign) await tx.lockUsers(users.map((u) => u.id).sort());
        if (assign) {
          const current = await tx.all("users");
          if (
            users.some(
              (u) =>
                !current.some(
                  (v) =>
                    v.id === u.id &&
                    v.active !== false &&
                    v.classIds.includes(classId) &&
                    v.schoolIds.includes(req.school.id),
                ),
            )
          )
            fail(409, "Student enrollment changed; review the plan again");
        }
        let charges = 0;
        for (const date of dueDates) {
          const title = `${name.trim()} (${date.slice(0, 7)})`;
          if (
            existing.some(
              (s) =>
                s.classId === classId &&
                s.name.toLowerCase() === title.toLowerCase(),
            )
          )
            fail(
              409,
              `Schedule ${title} already exists; existing fees were not changed`,
            );
          const schedule = await tx.put("feeSchedules", {
            id: id(),
            schoolId: req.school.id,
            classId,
            academicYearId: year.id,
            name: title,
            className: cls.name,
            amountMinor,
            currency,
            dueDate: date,
            planRequestKey: requestKey,
            planSignature: signature,
            createdAt: new Date().toISOString(),
          });
          if (assign)
            for (const u of users) {
              await tx.put("feeCharges", {
                ...schedule,
                id: id(),
                scheduleId: schedule.id,
                studentId: u.id,
                studentName: u.name,
              });
              charges++;
            }
        }
        await audit(tx, req, "fee.year-planned", {
          schedules: months.length,
          charges,
        });
        return { created: months.length, charges };
      });
      res.json(result);
    }),
  );
  return r;
}
