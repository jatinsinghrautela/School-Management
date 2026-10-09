import { id, managers, canAccessSchool } from "./domain.js";
export const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export const text = (v, n = 200) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= n;
export const reason = (v) => text(v, 500) && v.trim().length >= 5;
export const key = (v) => typeof v === "string" && /^[a-f0-9-]{36}$/i.test(v);
export const normal = (req) => {
  if (req.session.support)
    fail(403, "Use a normal account session for this action");
};
export const manage = (req) => {
  normal(req);
  if (!managers.includes(req.user.role))
    fail(403, "School management access required");
};
export const route = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    if (e.status) res.status(e.status).json({ error: e.message });
    else next(e);
  }
};
export const audit = (tx, req, action, extra = {}) =>
  tx.put("audit", {
    id: id(),
    schoolId: req.school.id,
    actorId: req.user.id,
    action,
    ...extra,
    createdAt: new Date().toISOString(),
  });
export async function member(tx, req, userId, roles = null) {
  await tx.lockUsers([userId]);
  const u = (await tx.all("users")).find(
    (u) =>
      u.id === userId &&
      u.active !== false &&
      canAccessSchool(u, req.school) &&
      (!roles || roles.includes(u.role)),
  );
  if (!u) fail(404, "Active school account not found");
  return u;
}
export async function children(tx, req) {
  if (req.user.role === "student")
    return [(await tx.all("users")).find((u) => u.id === req.user.id)].filter(
      Boolean,
    );
  if (req.user.role !== "parent") return [];
  const gs = new Set(
    (await tx.all("parentLinks", req.school.id))
      .filter((l) => l.userId === req.user.id && l.active)
      .map((l) => l.guardianId),
  );
  const kids = new Set(
    (await tx.all("studentGuardians", req.school.id))
      .filter((l) => l.active && gs.has(l.guardianId))
      .map((l) => l.studentId),
  );
  return (await tx.all("users")).filter(
    (u) =>
      kids.has(u.id) &&
      u.role === "student" &&
      u.active !== false &&
      canAccessSchool(u, req.school),
  );
}
export async function notify(
  tx,
  req,
  userId,
  title,
  body,
  sourceKind = "operation",
  sourceId = null,
) {
  return tx.put("notifications", {
    id: id(),
    schoolId: req.school.id,
    userId,
    title,
    body,
    sourceKind,
    sourceId,
    createdAt: new Date().toISOString(),
  });
}
export const escape = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function printable(title, school, body) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(title)}</title><style>body{font:16px system-ui;color:#16332f;max-width:760px;margin:40px auto;padding:24px;line-height:1.6}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #cadbd6;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}@media print{body{margin:0}}</style><h1>${escape(school)}</h1><h2>${escape(title)}</h2>${body}</html>`;
}
