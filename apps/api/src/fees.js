import { schoolLogo, logoHeader } from "./school-media.js";
import { Router } from "express";
import { id, managers } from "./domain.js";
import { validDate } from "./calendar.js";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const money = (v) => Number.isSafeInteger(v) && v > 0 && v <= 1000000000;
const reason = (v) =>
  typeof v === "string" && v.trim().length >= 5 && v.length <= 500;
const key = (v) => typeof v === "string" && /^[a-f0-9-]{36}$/i.test(v);
export function feeBalance(charge, payments, concessions) {
  const paid = payments
      .filter((p) => p.chargeId === charge.id && !p.voided)
      .reduce((sum, p) => sum + p.amountMinor, 0),
    concession = concessions
      .filter((c) => c.chargeId === charge.id && !c.voided)
      .reduce((sum, c) => sum + c.amountMinor, 0);
  return {
    paidMinor: paid,
    concessionMinor: concession,
    outstandingMinor: charge.amountMinor - concession - paid,
  };
}
export function createFeesRouter(store) {
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
  const audit = (tx, req, action, extra) =>
    tx.put("audit", {
      id: id(),
      schoolId: req.school.id,
      actorId: req.user.id,
      action,
      ...extra,
      createdAt: new Date().toISOString(),
    });
  const charges = (tx, req) => tx.all("feeCharges", req.school.id);
  async function findCharge(tx, req, chargeId) {
    const c = (await charges(tx, req)).find((c) => c.id === chargeId);
    if (!c) fail(404, "Fee charge not found");
    return c;
  }
  router.get(
    "/fees",
    route(async (req, res) => {
      if (![...managers, "student"].includes(req.user.role))
        fail(403, "Fee access denied");
      const result = await store.transaction(req.school.id, async (tx) => {
        const visible = (await charges(tx, req)).filter(
            (c) =>
              managers.includes(req.user.role) || c.studentId === req.user.id,
          ),
          ids = new Set(visible.map((c) => c.id));
        const payments = (await tx.all("feePayments", req.school.id)).filter(
            (p) => ids.has(p.chargeId),
          ),
          concessions = (await tx.all("feeConcessions", req.school.id)).filter(
            (c) => ids.has(c.chargeId),
          );
        return {
          schedules: managers.includes(req.user.role)
            ? await tx.all("feeSchedules", req.school.id)
            : [],
          charges: visible.map((c) => ({
            ...c,
            ...feeBalance(c, payments, concessions),
          })),
          payments,
          concessions,
        };
      });
      res.json(result);
    }),
  );
  router.post(
    "/fee-schedules",
    route(async (req, res) => {
      manage(req);
      const {
        classId,
        name,
        amountMinor,
        currency = "INR",
        dueDate,
      } = req.body;
      if (
        typeof name !== "string" ||
        !name.trim() ||
        name.length > 120 ||
        !money(amountMinor) ||
        !["INR", "USD", "EUR", "GBP"].includes(currency) ||
        !validDate(dueDate)
      )
        fail(400, "Check schedule name, currency, amount and due date");
      const result = await store.transaction(req.school.id, async (tx) => {
        const cls = (await tx.all("classes", req.school.id)).find(
            (c) => c.id === classId,
          ),
          year = (await tx.all("academicYears", req.school.id)).find(
            (y) => y.id === cls?.academicYearId,
          );
        if (!year || dueDate < year.startDate || dueDate > year.endDate)
          fail(400, "Choose a class and due date within its academic year");
        if (
          (await tx.all("feeSchedules", req.school.id)).some(
            (s) =>
              s.classId === classId &&
              s.name.toLowerCase() === name.trim().toLowerCase(),
          )
        )
          fail(409, "A schedule with this name already exists for the class");
        const row = await tx.put("feeSchedules", {
          id: id(),
          schoolId: req.school.id,
          classId,
          academicYearId: year.id,
          name: name.trim(),
          className: cls.name,
          amountMinor,
          currency,
          dueDate,
          createdAt: new Date().toISOString(),
        });
        await audit(tx, req, "fee.schedule-created", { scheduleId: row.id });
        return row;
      });
      res.status(201).json(result);
    }),
  );
  router.post(
    "/fee-schedules/:scheduleId/assign",
    route(async (req, res) => {
      manage(req);
      const { studentIds } = req.body;
      if (
        !Array.isArray(studentIds) ||
        !studentIds.length ||
        studentIds.length > 200 ||
        studentIds.some((v) => typeof v !== "string") ||
        new Set(studentIds).size !== studentIds.length
      )
        fail(400, "Select 1–200 distinct students");
      const result = await store.transaction(req.school.id, async (tx) => {
        const s = (await tx.all("feeSchedules", req.school.id)).find(
          (s) => s.id === req.params.scheduleId,
        );
        if (!s) fail(404, "Schedule not found");
        await tx.lockUsers(studentIds);
        const users = await tx.all("users");
        const selected = studentIds.map((studentId) =>
          users.find(
            (u) =>
              u.id === studentId &&
              u.role === "student" &&
              u.active !== false &&
              u.schoolIds.includes(req.school.id) &&
              u.classIds.includes(s.classId),
          ),
        );
        if (selected.some((u) => !u))
          fail(
            400,
            "Every selected student must be active and enrolled in this class",
          );
        const existing = await charges(tx, req);
        let created = 0;
        for (const u of selected)
          if (
            !existing.some((c) => c.scheduleId === s.id && c.studentId === u.id)
          ) {
            await tx.put("feeCharges", {
              id: id(),
              schoolId: req.school.id,
              scheduleId: s.id,
              studentId: u.id,
              studentName: u.name,
              classId: s.classId,
              className: s.className,
              academicYearId: s.academicYearId,
              name: s.name,
              amountMinor: s.amountMinor,
              currency: s.currency,
              dueDate: s.dueDate,
              createdAt: new Date().toISOString(),
            });
            created++;
          }
        await audit(tx, req, "fee.assigned", {
          scheduleId: s.id,
          count: created,
        });
        return { created, alreadyAssigned: studentIds.length - created };
      });
      res.json(result);
    }),
  );
  for (const type of ["payments", "concessions"]) {
    const collection = type === "payments" ? "feePayments" : "feeConcessions";
    router.post(
      `/fee-charges/:chargeId/${type}`,
      route(async (req, res) => {
        manage(req);
        const {
          amountMinor,
          requestKey,
          paidOn,
          method,
          reference = "",
          reason: note,
        } = req.body;
        if (!money(amountMinor) || !key(requestKey))
          fail(400, "Provide a positive amount and a valid request key");
        if (
          type === "payments" &&
          (!validDate(paidOn) ||
            paidOn > new Date().toISOString().slice(0, 10) ||
            !["cash", "bank", "cheque"].includes(method) ||
            typeof reference !== "string" ||
            reference.length > 120 ||
            (method !== "cash" && !reference.trim()))
        )
          fail(400, "Check payment date, method and reference");
        if (type === "concessions" && !reason(note))
          fail(400, "Provide a concession reason of 5–500 characters");
        const result = await store.transaction(req.school.id, async (tx) => {
          const c = await findCharge(tx, req, req.params.chargeId),
            rows = await tx.all(collection, req.school.id),
            old = rows.find((r) => r.requestKey === requestKey);
          const fields =
            type === "payments"
              ? { paidOn, method, reference: reference.trim() }
              : { reason: note.trim() };
          if (old) {
            if (
              old.chargeId !== c.id ||
              old.amountMinor !== amountMinor ||
              Object.entries(fields).some(([k, v]) => old[k] !== v)
            )
              fail(409, "Request key already belongs to a different entry");
            return old;
          }
          const balance = feeBalance(
            c,
            await tx.all("feePayments", req.school.id),
            await tx.all("feeConcessions", req.school.id),
          );
          if (amountMinor > balance.outstandingMinor)
            fail(409, "Amount exceeds the outstanding balance");
          const rowId = id(),
            now = new Date().toISOString();
          const row = await tx.put(collection, {
            id: rowId,
            schoolId: req.school.id,
            chargeId: c.id,
            studentId: c.studentId,
            studentName: c.studentName,
            name: c.name,
            currency: c.currency,
            amountMinor,
            requestKey,
            ...fields,
            voided: false,
            createdBy: req.user.id,
            createdAt: now,
            ...(type === "payments"
              ? {
                  receiptNumber: `RCT-${now.slice(0, 10).replaceAll("-", "")}-${rowId.slice(0, 8).toUpperCase()}`,
                  schoolName: req.school.name,
                  schoolLogo: await schoolLogo(tx, req.school.id),
                }
              : {}),
          });
          await audit(tx, req, `fee.${type}-recorded`, {
            chargeId: c.id,
            entryId: row.id,
            amountMinor,
          });
          return row;
        });
        res.json(result);
      }),
    );
    router.post(
      `/fee-${type}/:entryId/void`,
      route(async (req, res) => {
        manage(req);
        if (!reason(req.body.reason))
          fail(400, "Provide a void reason of 5–500 characters");
        const result = await store.transaction(req.school.id, async (tx) => {
          const row = (await tx.all(collection, req.school.id)).find(
            (r) => r.id === req.params.entryId,
          );
          if (!row) fail(404, "Entry not found");
          if (row.voided) fail(409, "Entry is already voided");
          const result = await tx.put(collection, {
            ...row,
            voided: true,
            voidReason: req.body.reason.trim(),
            voidedBy: req.user.id,
            voidedAt: new Date().toISOString(),
          });
          await audit(tx, req, `fee.${type}-voided`, {
            entryId: row.id,
            reason: req.body.reason.trim(),
          });
          return result;
        });
        res.json(result);
      }),
    );
  }
  router.get(
    "/fee-payments/:paymentId/receipt",
    route(async (req, res) => {
      if (![...managers, "student"].includes(req.user.role))
        fail(403, "Receipt access denied");
      const p = (await store.all("feePayments", req.school.id)).find(
        (p) =>
          p.id === req.params.paymentId &&
          (managers.includes(req.user.role) || p.studentId === req.user.id),
      );
      if (!p) fail(404, "Receipt not found");
      const escape = (v) =>
        String(v ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        );
      const amount = new Intl.NumberFormat("en", {
        style: "currency",
        currency: p.currency,
      }).format(p.amountMinor / 100);
      const rows = [
        ["Receipt", p.receiptNumber],
        ["Student", p.studentName],
        ["Fee", p.name],
        ["Amount", amount],
        ["Payment date", p.paidOn],
        ["Method", p.method],
        ["Reference", p.reference || "—"],
        ["Recorded at", p.createdAt],
      ];
      res.json({
        filename: `${p.receiptNumber}.html`,
        html: `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(p.receiptNumber)}</title><style>body{font:16px system-ui;color:#173e34;max-width:720px;margin:40px auto;padding:24px;line-height:1.6}h1{font-size:26px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #d2e3da}th{width:35%}.void{color:#9b2525;font-weight:bold}@media print{body{margin:0}}</style>${logoHeader(p.schoolLogo || (await schoolLogo(store, req.school.id)))}<h1>${escape(p.schoolName)}</h1><h2>Manual payment receipt</h2>${p.voided ? `<p class="void">VOIDED — ${escape(p.voidReason)} (${escape(p.voidedAt)})</p>` : ""}<table>${rows.map(([k, v]) => `<tr><th>${escape(k)}</th><td>${escape(v)}</td></tr>`).join("")}</table><p>This records a manually entered payment. It does not verify a bank settlement or process a transfer.</p><p>Schoolglass Desk</p></html>`,
      });
    }),
  );
  return router;
}
