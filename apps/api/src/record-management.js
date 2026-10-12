import { Router } from "express";
import { route, manage, fail, audit, text } from "./operations-common.js";
import { assignEnrollmentNumber } from "./enrollment-numbers.js";
export function createRecordManagementRouter(store) {
  const r = Router({ mergeParams: true });
  r.post(
    "/enrollment-numbers/assign",
    route(async (req, res) => {
      manage(req);
      const result = await store.transaction(req.school.id, async (tx) => {
        const users = (await tx.all("users")).filter(
          (u) =>
            u.schoolIds.includes(req.school.id) &&
            ["student", "teacher"].includes(u.role),
        );
        await tx.lockUsers(users.map((u) => u.id).sort());
        for (const u of users)
          await assignEnrollmentNumber(tx, req.school, u, { convert: true });
        await audit(tx, req, "enrollment-numbers.assigned", {
          count: users.length,
        });
        return { updated: users.length };
      });
      res.json(result);
    }),
  );
  r.get(
    "/guardian-records",
    route(async (req, res) => {
      manage(req);
      res.json({ guardians: await store.all("guardians", req.school.id) });
    }),
  );
  r.post(
    "/guardian-records/:guardianId",
    route(async (req, res) => {
      manage(req);
      await store.transaction(req.school.id, async (tx) => {
        const g = (await tx.all("guardians", req.school.id)).find(
          (g) => g.id === req.params.guardianId,
        );
        if (!g) fail(404, "Guardian not found");
        const {
          name = g.name,
          email = g.email,
          phone = g.phone,
          relationship = g.relationship,
          active = true,
        } = req.body;
        if (
          !text(name) ||
          !text(relationship, 60) ||
          typeof email !== "string" ||
          email.length > 200 ||
          (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
          typeof phone !== "string" ||
          phone.length > 40 ||
          (!phone.trim() && !email.trim()) ||
          typeof active !== "boolean"
        )
          fail(400, "Check guardian details");
        await tx.put("guardians", {
          ...g,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          relationship: relationship.trim(),
          active,
        });
        if (!active) {
          for (const kind of ["studentGuardians", "parentLinks"])
            for (const link of await tx.all(kind, req.school.id))
              if (link.guardianId === g.id && link.active)
                await tx.put(kind, {
                  ...link,
                  active: false,
                  endedAt: new Date().toISOString(),
                });
        }
        await audit(
          tx,
          req,
          active ? "guardian.updated" : "guardian.archived",
          { guardianId: g.id },
        );
      });
      res.json({ ok: true });
    }),
  );
  return r;
}
