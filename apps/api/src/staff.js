import { Router } from "express";
import { id, managers, canAccessSchool } from "./domain.js";
import { notify } from "./operations-common.js";
import { validDate } from "./calendar.js";
const employed = [...managers, "teacher", "staff"];
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const reason = (v) =>
  typeof v === "string" && v.trim().length >= 5 && v.length <= 500;
export function createStaffRouter(store) {
  const router = Router({ mergeParams: true });
  const route = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e.status) res.status(e.status).json({ error: e.message });
      else next(e);
    }
  };
  const access = (req) => {
    if (!employed.includes(req.user.role))
      fail(403, "Staff workspace access denied");
  };
  const write = (req) => {
    access(req);
    if (req.session.support)
      fail(403, "Use a normal school session to change employment records");
  };
  const manage = (req) => {
    write(req);
    if (!managers.includes(req.user.role))
      fail(403, "School management access required");
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
  async function colleague(tx, req, userId) {
    await tx.lockUsers([userId]);
    const user = (await tx.all("users")).find(
      (u) =>
        u.id === userId &&
        employed.includes(u.role) &&
        canAccessSchool(u, req.school),
    );
    if (!user) fail(404, "School employee not found");
    return user;
  }
  router.get(
    "/staff-workspace",
    route(async (req, res) => {
      access(req);
      const result = await store.transaction(req.school.id, async (tx) => {
        const management = managers.includes(req.user.role);
        const people = (await tx.all("users")).filter(
          (u) =>
            employed.includes(u.role) &&
            canAccessSchool(u, req.school) &&
            (management || u.id === req.user.id),
        );
        const ids = new Set(people.map((u) => u.id));
        return {
          people: people.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            active: u.active !== false,
          })),
          profiles: (await tx.all("staffProfiles", req.school.id)).filter((p) =>
            ids.has(p.userId),
          ),
          requests: (await tx.all("leaveRequests", req.school.id))
            .filter((r) => management || r.userId === req.user.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        };
      });
      res.json(result);
    }),
  );
  router.post(
    "/staff-profiles/:userId",
    route(async (req, res) => {
      manage(req);
      const { employeeNumber, jobTitle, department, joinDate } = req.body;
      if (
        ![employeeNumber, jobTitle, department].every(
          (v) =>
            typeof v === "string" && v.trim().length > 0 && v.length <= 120,
        ) ||
        !validDate(joinDate)
      )
        fail(
          400,
          "Enter an employee number, job title, department and valid joining date",
        );
      const result = await store.transaction(req.school.id, async (tx) => {
        const user = await colleague(tx, req, req.params.userId);
        const profiles = await tx.all("staffProfiles", req.school.id);
        if (
          profiles.some(
            (p) =>
              p.userId !== user.id &&
              p.employeeNumber.toLowerCase() ===
                employeeNumber.trim().toLowerCase(),
          )
        )
          fail(409, "Employee number is already in use at this school");
        const previous = profiles.find((p) => p.userId === user.id);
        const row = {
          id: previous?.id || id(),
          schoolId: req.school.id,
          userId: user.id,
          employeeNumber: employeeNumber.trim(),
          jobTitle: jobTitle.trim(),
          department: department.trim(),
          joinDate,
          updatedAt: new Date().toISOString(),
          updatedBy: req.user.id,
        };
        await tx.put("staffProfiles", row);
        await audit(tx, req, "staff.profile-updated", {
          targetId: user.id,
          previous: previous || null,
          profile: row,
        });
        return row;
      });
      res.json(result);
    }),
  );
  router.post(
    "/leave-requests",
    route(async (req, res) => {
      write(req);
      const { startDate, endDate, type, requestKey } = req.body;
      if (
        !validDate(startDate) ||
        !validDate(endDate) ||
        endDate < startDate ||
        !["personal", "sick", "annual", "other"].includes(type) ||
        !reason(req.body.reason) ||
        typeof requestKey !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(requestKey)
      )
        fail(
          400,
          "Enter valid leave dates, type, reason (5–500 characters) and request key",
        );
      if ((Date.parse(endDate) - Date.parse(startDate)) / 86400000 > 365)
        fail(400, "A request can span at most 366 calendar days");
      const row = await store.transaction(req.school.id, async (tx) => {
        const user = await colleague(tx, req, req.user.id);
        if (user.active === false)
          fail(409, "This employee account is inactive");
        const rows = await tx.all("leaveRequests", req.school.id);
        const previous = rows.find((r) => r.requestKey === requestKey);
        if (previous) {
          if (
            previous.userId !== user.id ||
            previous.startDate !== startDate ||
            previous.endDate !== endDate ||
            previous.type !== type ||
            previous.reason !== req.body.reason.trim()
          )
            fail(
              409,
              "Request key has already been used for different details",
            );
          return previous;
        }
        if (
          rows.some(
            (r) =>
              r.userId === user.id &&
              ["pending", "approved"].includes(r.status) &&
              r.startDate <= endDate &&
              r.endDate >= startDate,
          )
        )
          fail(
            409,
            "These dates overlap an existing pending or approved request",
          );
        const row = {
          id: id(),
          schoolId: req.school.id,
          userId: user.id,
          employeeName: user.name,
          employeeRole: user.role,
          startDate,
          endDate,
          type,
          reason: req.body.reason.trim(),
          requestKey,
          status: "pending",
          createdAt: new Date().toISOString(),
          history: [],
        };
        await tx.put("leaveRequests", row);
        await audit(tx, req, "leave.requested", { requestId: row.id });
        return row;
      });
      res.status(201).json(row);
    }),
  );
  router.post(
    "/leave-requests/:requestId/decision",
    route(async (req, res) => {
      write(req);
      const { decision } = req.body;
      if (
        !["approved", "rejected", "cancelled"].includes(decision) ||
        !reason(req.body.reason)
      )
        fail(
          400,
          "Choose a valid decision and give a reason (5–500 characters)",
        );
      const row = await store.transaction(req.school.id, async (tx) => {
        const rows = await tx.all("leaveRequests", req.school.id);
        const row = rows.find((r) => r.id === req.params.requestId);
        if (!row) fail(404, "Leave request not found");
        const management = managers.includes(req.user.role),
          own = row.userId === req.user.id;
        if (decision === "cancelled") {
          if (
            !(own && row.status === "pending") &&
            !(management && !own && row.status === "approved")
          )
            fail(
              403,
              "Only your pending request or another employee’s approved request can be cancelled",
            );
        } else {
          if (!management || own)
            fail(403, "A different school leader must review this request");
          if (row.status !== "pending")
            fail(409, "This request has already been decided");
        }
        if (decision === "approved") {
          const user = await colleague(tx, req, row.userId);
          if (user.active === false)
            fail(409, "Inactive employee requests cannot be approved");
        }
        if (
          decision === "approved" &&
          rows.some(
            (r) =>
              r.id !== row.id &&
              r.userId === row.userId &&
              r.status === "approved" &&
              r.startDate <= row.endDate &&
              r.endDate >= row.startDate,
          )
        )
          fail(409, "Approved leave overlaps these dates");
        const entry = {
          from: row.status,
          to: decision,
          reason: req.body.reason.trim(),
          actorId: req.user.id,
          actorName: req.user.name,
          at: new Date().toISOString(),
        };
        const updated = {
          ...row,
          status: decision,
          history: [...row.history, entry],
        };
        await tx.put("leaveRequests", updated);
        await notify(
          tx,
          req,
          row.userId,
          "Leave request updated",
          `${row.startDate} to ${row.endDate}: ${decision}. ${entry.reason}`,
        );
        await audit(tx, req, `leave.${decision}`, {
          requestId: row.id,
          ...entry,
        });
        return updated;
      });
      res.json(row);
    }),
  );
  return router;
}
