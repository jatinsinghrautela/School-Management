import { createCalendarRouter, visibleCalendar } from "./calendar.js";
import { createCalendarImportRouter } from "./calendar-import.js";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import multer from "multer";
import { tokenRepository } from "./tokens.js";
import { createTimetableRouter } from "./timetable.js";
import { createHomeworkRouter } from "./homework.js";
import {
  createAcademicRouter,
  academicWorkspace,
  dateValid,
} from "./academics.js";
import {
  id,
  managers,
  roles,
  canAccessSchool,
  canSeeClass,
  publicUser,
  visibleNotice,
} from "./domain.js";
const hash = (t) => createHash("sha256").update(t).digest("hex");
export function createApp(store) {
  const app = express(),
    sessions = tokenRepository(store, "session"),
    resets = tokenRepository(store, "reset");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "style-src": ["'self'"],
          "font-src": ["'self'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use((req, res, next) => {
    if (
      ["POST", "PUT", "PATCH"].includes(req.method) &&
      !req.is("multipart/form-data") &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return res.status(400).json({ error: "A JSON object is required" });
    next();
  });
  const fail = (res, status, message) =>
    res.status(status).json({ error: message });
  const valid = (v, max = 200) =>
    typeof v === "string" && v.trim().length > 0 && v.length <= max;
  const audit = async (user, action, schoolId) =>
    store.put("audit", {
      id: id(),
      actorId: user.id,
      action,
      schoolId,
      createdAt: new Date().toISOString(),
    });
  const auth = async (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const session = await sessions.get(hash(token || ""));
    if (!session || session.expires < Date.now()) {
      if (session) await sessions.delete(hash(token));
      return fail(res, 401, "Please sign in again");
    }
    req.user = (await store.all("users")).find((u) => u.id === session.userId);
    if (!req.user || req.user.active === false)
      return fail(res, 401, "Account unavailable");
    if ((session.userVersion || 0) !== (req.user.authVersion || 0))
      return fail(res, 401, "Please sign in again");
    if (
      req.user.passwordChangeRequired &&
      !session.support &&
      !["/api/me", "/api/auth/change-password", "/api/auth/logout"].includes(
        req.path,
      )
    )
      return fail(
        res,
        403,
        "Change your temporary password before using the workspace",
      );
    req.session = session;
    if (session.support) {
      const parent = await sessions.get(session.support.parentKey);
      const parentUser = (await store.all("users")).find(
        (u) => u.id === parent?.userId,
      );
      if (
        !parent ||
        parent.expires < Date.now() ||
        !parentUser ||
        parentUser.active === false ||
        (parent.userVersion || 0) !== (parentUser.authVersion || 0)
      )
        return fail(res, 401, "Support session ended");
      if (
        req.method !== "GET" &&
        req.path !== "/api/support/end" &&
        req.path !== "/api/auth/logout"
      ) {
        if (
          req.path.startsWith("/api/auth/") ||
          req.path.startsWith("/api/users")
        )
          return fail(
            res,
            403,
            "Account security changes require the normal administrator session",
          );
        await store.put("audit", {
          id: id(),
          actorId: session.support.ownerId,
          targetUserId: req.user.id,
          action: "support.request",
          path: req.path,
          reason: session.support.reason,
          schoolId: req.user.schoolIds[0] || null,
          createdAt: new Date().toISOString(),
        });
      }
    }
    next();
  };
  const owner = (req, res, next) =>
    req.user.role === "owner"
      ? next()
      : fail(res, 403, "Platform owner access required");
  const manage = (req, res, next) =>
    managers.includes(req.user.role)
      ? next()
      : fail(res, 403, "School management access required");
  const teach = (req, res, next) =>
    ["teacher", ...managers].includes(req.user.role)
      ? next()
      : fail(res, 403, "Teaching access required");
  app.get("/api/health", (req, res) =>
    res.json({ status: "ok", mode: store.mode }),
  );
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 50,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!valid(email) || !valid(password, 200))
      return fail(res, 400, "Email and password required");
    const user = (await store.all("users")).find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (
      !user ||
      user.active === false ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      return fail(res, 401, "Invalid email or password");
    const token = randomBytes(32).toString("hex");
    await sessions.set(hash(token), {
      userId: user.id,
      userVersion: user.authVersion || 0,
      createdAt: new Date().toISOString(),
      device: (req.headers["user-agent"] || "Unknown device").slice(0, 160),
      expires: Date.now() + 8 * 60 * 60 * 1000,
    });
    res.json({ token, user: publicUser(user), mode: store.mode });
  });
  app.post("/api/auth/forgot-password", async (req, res) => {
    const user = (await store.all("users")).find(
      (u) => u.email === req.body.email,
    );
    let token;
    if (user && user.active !== false) {
      token = randomBytes(32).toString("hex");
      await resets.set(hash(token), {
        userId: user.id,
        expires: Date.now() + 15 * 60 * 1000,
      });
    }
    res.json({
      message:
        "If an account exists, a reset request has been created. Contact your administrator for assisted recovery.",
      ...(store.mode === "demo" && token ? { demoToken: token } : {}),
    });
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    const record = await resets.get(hash(req.body.token || ""));
    if (!record || record.expires < Date.now())
      return fail(res, 400, "Invalid or expired reset token");
    if (!valid(req.body.password, 200) || req.body.password.length < 12)
      return fail(res, 400, "Password must be at least 12 characters");
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    try {
      await store.userTransaction(record.userId, async (tx) => {
        const links = tokenRepository(tx, "reset"),
          logins = tokenRepository(tx, "session");
        const current = await links.get(hash(req.body.token));
        if (!current || current.expires < Date.now())
          throw Object.assign(new Error("Invalid or expired reset token"), {
            status: 400,
          });
        const user = (await tx.all("users")).find(
          (u) => u.id === record.userId,
        );
        if (!user || user.active === false)
          throw Object.assign(new Error("Account unavailable"), {
            status: 400,
          });
        await tx.put("users", {
          ...user,
          passwordHash,
          passwordChangeRequired: false,
          authVersion: (user.authVersion || 0) + 1,
        });
        for (const [key, row] of await links.entries())
          if (row.userId === user.id) await links.delete(key);
        for (const [key, row] of await logins.entries())
          if (row.userId === user.id) await logins.delete(key);
        await tx.put("audit", {
          id: id(),
          actorId: user.id,
          action: "user.password-reset",
          schoolId: user.schoolIds[0] || null,
          createdAt: new Date().toISOString(),
        });
      });
    } catch (e) {
      if (e.status) return fail(res, e.status, e.message);
      throw e;
    }
    res.json({ message: "Password updated. Please sign in." });
  });
  app.post("/api/auth/change-password", auth, async (req, res) => {
    const { currentPassword, password } = req.body;
    if (
      !valid(currentPassword, 200) ||
      !valid(password, 200) ||
      password.length < 12 ||
      password === currentPassword
    )
      return fail(
        res,
        400,
        "Choose a different password of at least 12 characters",
      );
    try {
      await store.userTransaction(req.user.id, async (tx) => {
        const user = (await tx.all("users")).find((u) => u.id === req.user.id);
        if (
          !user ||
          user.active === false ||
          (user.authVersion || 0) !== (req.session.userVersion || 0) ||
          !(await bcrypt.compare(currentPassword, user.passwordHash))
        )
          throw Object.assign(
            new Error("Current password is incorrect or session changed"),
            { status: 400 },
          );
        await tx.put("users", {
          ...user,
          passwordHash: await bcrypt.hash(password, 12),
          passwordChangeRequired: false,
          authVersion: (user.authVersion || 0) + 1,
        });
        for (const type of ["session", "reset"]) {
          const repo = tokenRepository(tx, type);
          for (const [key, row] of await repo.entries())
            if (row.userId === user.id) await repo.delete(key);
        }
        await tx.put("audit", {
          id: id(),
          actorId: user.id,
          action: "user.password-changed",
          schoolId: user.schoolIds[0] || null,
          createdAt: new Date().toISOString(),
        });
      });
      res.json({ message: "Password changed. Sign in again on all devices." });
    } catch (e) {
      if (e.status) return fail(res, e.status, e.message);
      throw e;
    }
  });
  app.post("/api/auth/logout", auth, async (req, res) => {
    await sessions.delete(
      hash(req.headers.authorization.replace(/^Bearer /, "")),
    );
    res.json({ ok: true });
  });
  app.get("/api/auth/sessions", auth, async (req, res) => {
    const current = hash(req.headers.authorization.replace(/^Bearer /, ""));
    res.json({
      sessions: (await sessions.entries())
        .filter(
          ([, s]) =>
            s.userId === req.user.id &&
            !s.support &&
            s.expires > Date.now() &&
            (s.userVersion || 0) === (req.user.authVersion || 0),
        )
        .map(([key, s]) => ({
          id: s.id,
          device: s.device || "Unknown device",
          createdAt: s.createdAt,
          expires: s.expires,
          current: key === current,
        })),
    });
  });
  app.post("/api/auth/revoke-others", auth, async (req, res) => {
    const current = hash(req.headers.authorization.replace(/^Bearer /, ""));
    let count = 0;
    for (const [key, s] of await sessions.entries())
      if (s.userId === req.user.id && key !== current) {
        await sessions.delete(key);
        count++;
      }
    await audit(
      req.user,
      "user.other-sessions-revoked",
      req.user.schoolIds[0] || null,
    );
    res.json({ ok: true, count });
  });
  app.post("/api/users/:userId/recovery", auth, async (req, res) => {
    const target = (await store.all("users")).find(
      (u) => u.id === req.params.userId,
    );
    if (!target) return fail(res, 404, "Account not found");
    if (target.active === false)
      return fail(res, 400, "Reactivate the account before issuing recovery");
    const schools = await store.all("schools");
    const permitted =
      req.user.role === "owner" ||
      (managers.includes(req.user.role) &&
        ["teacher", "student", "staff"].includes(target.role) &&
        (target.orgId || null) === (req.user.orgId || null) &&
        target.schoolIds.length > 0 &&
        target.schoolIds.every((sid) =>
          schools.some((s) => s.id === sid && canAccessSchool(req.user, s)),
        ));
    if (!permitted) return fail(res, 403, "You cannot recover this account");
    const token = randomBytes(32).toString("hex");
    await resets.set(hash(token), {
      userId: target.id,
      expires: Date.now() + 15 * 60 * 1000,
    });
    await audit(req.user, "user.recovery-issued", target.schoolIds[0] || null);
    res.json({
      token,
      message:
        "This token expires in 15 minutes. Share privately with the verified account holder.",
    });
  });
  app.get("/api/me", auth, async (req, res) =>
    res.json({
      user: publicUser(req.user),
      schools: (await store.all("schools")).filter((s) =>
        canAccessSchool(req.user, s),
      ),
      mode: store.mode,
      support: req.session.support
        ? {
            ownerId: req.session.support.ownerId,
            reason: req.session.support.reason,
            expires: req.session.expires,
          }
        : null,
    }),
  );
  app.post("/api/platform/support", auth, owner, async (req, res) => {
    const { userId, reason, acknowledge } = req.body;
    const target = (await store.all("users")).find((u) => u.id === userId);
    if (!target || target.role === "owner" || target.active === false)
      return fail(res, 400, "Select a school account");
    if (
      !valid(reason, 500) ||
      reason.trim().length < 10 ||
      acknowledge !== true
    )
      return fail(
        res,
        400,
        "Describe the support issue and acknowledge that changes affect real data",
      );
    const token = randomBytes(32).toString("hex");
    const expires = Date.now() + 30 * 60 * 1000;
    const support = {
      ownerId: req.user.id,
      parentKey: hash(req.headers.authorization.replace(/^Bearer /, "")),
      reason: reason.trim(),
    };
    await store.put("audit", {
      id: id(),
      actorId: req.user.id,
      targetUserId: target.id,
      action: "support.started",
      reason: support.reason,
      schoolId: target.schoolIds[0] || null,
      createdAt: new Date().toISOString(),
    });
    await sessions.set(hash(token), {
      userId: target.id,
      userVersion: target.authVersion || 0,
      expires,
      support,
    });
    res.json({ token, user: publicUser(target) });
  });
  app.post("/api/support/end", auth, async (req, res) => {
    if (!req.session.support)
      return fail(res, 400, "No support session active");
    await store.put("audit", {
      id: id(),
      actorId: req.session.support.ownerId,
      targetUserId: req.user.id,
      action: "support.ended",
      schoolId: req.user.schoolIds[0] || null,
      createdAt: new Date().toISOString(),
    });
    await sessions.delete(
      hash(req.headers.authorization.replace(/^Bearer /, "")),
    );
    res.json({ ok: true });
  });
  app.get("/api/platform", auth, owner, async (req, res) =>
    res.json({
      organizations: await store.all("organizations"),
      schools: await store.all("schools"),
      users: (await store.all("users")).map(publicUser),
      classes: await store.all("classes"),
      audit: (await store.all("audit")).slice(-20).reverse(),
    }),
  );
  app.post("/api/platform/organizations", auth, owner, async (req, res) => {
    if (!valid(req.body.name))
      return fail(res, 400, "Organization name required");
    const row = await store.put("organizations", {
      id: id(),
      name: req.body.name.trim(),
    });
    await audit(req.user, "organization.created", null);
    res.status(201).json(row);
  });
  app.post("/api/platform/schools", auth, owner, async (req, res) => {
    const { name, city, code, orgId } = req.body;
    if (
      ![name, city, code].every((v) => valid(v)) ||
      (orgId && !(await store.all("organizations")).some((o) => o.id === orgId))
    )
      return fail(
        res,
        400,
        "Valid school details and optional organization required",
      );
    const row = await store.put("schools", {
      id: id(),
      name,
      city,
      code,
      orgId: orgId || null,
    });
    await audit(req.user, "school.created", row.id);
    res.status(201).json(row);
  });
  app.post("/api/users/:userId/status", auth, async (req, res) => {
    const target = (await store.all("users")).find(
      (u) => u.id === req.params.userId,
    );
    if (!target) return fail(res, 404, "Account not found");
    if (typeof req.body.active !== "boolean")
      return fail(res, 400, "Choose an account status");
    if (target.id === req.user.id || target.role === "owner")
      return fail(
        res,
        403,
        "Owner and own-account status cannot be changed here",
      );
    const schools = await store.all("schools");
    const allowed =
      req.user.role === "owner" ||
      (managers.includes(req.user.role) &&
        ["teacher", "student", "staff"].includes(target.role) &&
        target.schoolIds.length > 0 &&
        target.schoolIds.every((sid) =>
          schools.some((s) => s.id === sid && canAccessSchool(req.user, s)),
        ));
    if (!allowed)
      return fail(res, 403, "You cannot change this account status");
    await store.transaction(target.schoolIds[0], async (tx) => {
      const current = (await tx.all("users")).find((u) => u.id === target.id);
      await tx.put("users", {
        ...current,
        active: req.body.active,
        authVersion: (current.authVersion || 0) + 1,
      });
      await tx.put("audit", {
        id: id(),
        actorId: req.user.id,
        targetUserId: target.id,
        action: req.body.active ? "user.reactivated" : "user.suspended",
        schoolId: target.schoolIds[0],
        createdAt: new Date().toISOString(),
      });
    });
    for (const [key, s] of await sessions.entries())
      if (s.userId === target.id) await sessions.delete(key);
    for (const [key, r] of await resets.entries())
      if (r.userId === target.id) await resets.delete(key);
    res.json({ ok: true });
  });
  app.post("/api/users/:userId/profile", auth, async (req, res) => {
    const target = (await store.all("users")).find(
      (u) => u.id === req.params.userId,
    );
    if (!target) return fail(res, 404, "Account not found");
    const schools = await store.all("schools");
    const allowed =
      target.role !== "owner" &&
      (req.user.role === "owner" ||
        (managers.includes(req.user.role) &&
          ["teacher", "student", "staff"].includes(target.role) &&
          target.schoolIds.length > 0 &&
          target.schoolIds.every((sid) =>
            schools.some((s) => s.id === sid && canAccessSchool(req.user, s)),
          )));
    if (!allowed) return fail(res, 403, "You cannot edit this account");
    const { name, phone = "" } = req.body;
    if (!valid(name) || typeof phone !== "string" || phone.length > 40)
      return fail(
        res,
        400,
        "Provide a name and a contact number of at most 40 characters",
      );
    const result = await store.transaction(target.schoolIds[0], async (tx) => {
      const current = (await tx.all("users")).find((u) => u.id === target.id);
      const updated = await tx.put("users", {
        ...current,
        name: name.trim(),
        phone: phone.trim(),
      });
      await tx.put("audit", {
        id: id(),
        actorId: req.user.id,
        targetUserId: target.id,
        action: "user.profile-updated",
        schoolId: target.schoolIds[0],
        createdAt: new Date().toISOString(),
      });
      return updated;
    });
    res.json(publicUser(result));
  });
  app.post("/api/users/:userId/access", auth, async (req, res) => {
    if (!(await store.all("users")).some((u) => u.id === req.params.userId))
      return fail(res, 404, "Account not found");
    const { role, schoolIds, classIds = [] } = req.body;
    if (
      !roles.includes(role) ||
      !Array.isArray(schoolIds) ||
      !schoolIds.length ||
      !Array.isArray(classIds)
    )
      return fail(
        res,
        400,
        "Choose a valid role, school access and class assignments",
      );
    try {
      await store.userTransaction(req.params.userId, async (tx) => {
        const target = (await tx.all("users")).find(
          (u) => u.id === req.params.userId,
        );
        const reject = (status, message) => {
          throw Object.assign(new Error(message), { status });
        };
        if (!target || target.role === "owner" || target.id === req.user.id)
          reject(403, "Owner and own access cannot be edited here");
        const schools = await tx.all("schools");
        if (
          req.user.role !== "owner" &&
          (!managers.includes(req.user.role) ||
            !["teacher", "student", "staff"].includes(target.role) ||
            !["teacher", "student", "staff"].includes(role) ||
            !target.schoolIds.every((sid) =>
              schools.some((s) => s.id === sid && canAccessSchool(req.user, s)),
            ))
        )
          reject(403, "You cannot edit this account’s access");
        const selected = schoolIds.map((sid) =>
          schools.find((s) => s.id === sid && canAccessSchool(req.user, s)),
        );
        if (
          selected.some((s) => !s) ||
          new Set(selected.map((s) => s.orgId || null)).size !== 1 ||
          (!selected[0].orgId && new Set(schoolIds).size !== 1)
        )
          reject(
            400,
            "Choose schools in one organization or a single independent school",
          );
        const classes = await tx.all("classes");
        if (
          classIds.some(
            (cid) =>
              !classes.some(
                (c) => c.id === cid && schoolIds.includes(c.schoolId),
              ),
          ) ||
          (["teacher", "student"].includes(role) && !classIds.length)
        )
          reject(400, "Assign valid classes to teachers and students");
        if (
          (await tx.all("subjects")).some(
            (s) =>
              s.teacherIds.includes(target.id) &&
              (role !== "teacher" || !classIds.includes(s.classId)),
          )
        )
          reject(
            409,
            "Remove teaching assignments before changing this access",
          );
        if (
          (await tx.all("timetable")).some(
            (s) =>
              !s.cancelled &&
              s.teacherId === target.id &&
              (role !== "teacher" || !classIds.includes(s.classId)),
          )
        )
          reject(409, "Cancel teaching periods before changing this access");
        for (const kind of ["attendance", "marks", "reports", "submissions"])
          if (
            (await tx.all(kind)).some(
              (r) =>
                r.studentId === target.id &&
                (!classIds.includes(r.classId) ||
                  !schoolIds.includes(r.schoolId)),
            )
          )
            reject(
              409,
              "Enrollment rollover is required before removing access with academic history",
            );
        await tx.put("users", {
          ...target,
          role,
          orgId: selected[0].orgId || null,
          schoolIds: [...new Set(schoolIds)],
          classIds: [...new Set(classIds)],
          authVersion: (target.authVersion || 0) + 1,
        });
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          targetUserId: target.id,
          action: "user.access-updated",
          schoolId: selected[0].id,
          createdAt: new Date().toISOString(),
        });
      });
      res.json({ ok: true });
    } catch (e) {
      if (e.status) return fail(res, e.status, e.message);
      throw e;
    }
  });
  app.post("/api/users", auth, async (req, res) => {
    const {
      name,
      email,
      password,
      role,
      orgId,
      schoolIds,
      classIds = [],
    } = req.body;
    if (req.user.role !== "owner" && !managers.includes(req.user.role))
      return fail(res, 403, "Management access required");
    if (
      !valid(name) ||
      !valid(email) ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !valid(password, 200) ||
      password.length < 12 ||
      !roles.includes(role) ||
      !Array.isArray(schoolIds) ||
      !schoolIds.length ||
      !Array.isArray(classIds)
    )
      return fail(
        res,
        400,
        "Valid user details and a 12-character password required",
      );
    if (
      req.user.role !== "owner" &&
      !["teacher", "student", "staff"].includes(role)
    )
      return fail(
        res,
        403,
        "Only the platform owner can create school leadership accounts",
      );
    const schools = await store.all("schools");
    if (
      schoolIds.some(
        (sid) =>
          !schools.some(
            (s) =>
              s.id === sid &&
              (s.orgId || null) === (orgId || null) &&
              canAccessSchool(req.user, s),
          ),
      )
    )
      return fail(res, 403, "Invalid school membership");
    const classes = await store.all("classes");
    if (!orgId && new Set(schoolIds).size !== 1)
      return fail(res, 400, "Independent school accounts belong to one school");
    if (
      classIds.some(
        (cid) =>
          !classes.some((c) => c.id === cid && schoolIds.includes(c.schoolId)),
      ) ||
      (["student", "teacher"].includes(role) && !classIds.length)
    )
      return fail(res, 400, "Assign valid classes to students and teachers");
    if (
      (await store.all("users")).some(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      )
    )
      return fail(res, 409, "Email already exists");
    const user = await store.put("users", {
      id: id(),
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      passwordChangeRequired: true,
      authVersion: 0,
      role,
      orgId: orgId || null,
      schoolIds: [...new Set(schoolIds)],
      classIds: [...new Set(classIds)],
    });
    await audit(req.user, "user.created", schoolIds[0]);
    res.status(201).json(publicUser(user));
  });
  app.use("/api/schools/:schoolId", auth, async (req, res, next) => {
    const school = (await store.all("schools")).find(
      (s) => s.id === req.params.schoolId,
    );
    if (!school || !canAccessSchool(req.user, school))
      return fail(res, 403, "School access denied");
    req.school = school;
    next();
  });
  app.get("/api/schools/:schoolId/workspace", async (req, res) => {
    const sid = req.params.schoolId,
      u = req.user;
    const scoped = async (k) =>
      (await store.all(k)).filter(
        (r) => r.schoolId === sid && (!r.classId || canSeeClass(u, r.classId)),
      );
    const users = (await store.all("users")).filter((r) =>
      r.schoolIds.includes(sid),
    );
    const academics = await academicWorkspace(store, u, sid);
    const publishedExams = new Set(
      academics.exams.filter((e) => e.status === "published").map((e) => e.id),
    );
    res.json({
      school: req.school,
      classes: (await scoped("classes")).filter((c) => canSeeClass(u, c.id)),
      users: users
        .filter((r) =>
          u.role === "student"
            ? r.id === u.id
            : u.role === "teacher"
              ? r.id === u.id ||
                (r.role === "student" &&
                  r.classIds.some((c) => u.classIds.includes(c)))
              : u.role === "staff"
                ? r.id === u.id
                : true,
        )
        .map(publicUser),
      attendance: (await scoped("attendance")).filter(
        (r) => u.role !== "student" || r.studentId === u.id,
      ),
      marks: (await scoped("marks")).filter(
        (r) =>
          u.role !== "student" ||
          (r.studentId === u.id && publishedExams.has(r.examId)),
      ),
      ...academics,
      timetable: (await scoped("timetable"))
        .filter((r) => !r.cancelled)
        .map((r) => ({
          ...r,
          teacherName:
            users.find((u) => u.id === r.teacherId)?.name || "Teacher",
        })),
      resources: await scoped("resources"),
      submissions: ["student", "teacher", ...managers].includes(u.role)
        ? (await scoped("submissions")).filter(
            (r) => u.role !== "student" || r.studentId === u.id,
          )
        : [],
      calendar: (await scoped("calendar")).filter(
        (e) => managers.includes(u.role) || visibleCalendar(u, e),
      ),
      notices: (await scoped("notices")).filter((n) => visibleNotice(u, n)),
    });
  });
  app.post("/api/schools/:schoolId/classes", manage, async (req, res) => {
    if (!valid(req.body.name)) return fail(res, 400, "Class name required");
    const row = await store.put("classes", {
      id: id(),
      schoolId: req.school.id,
      name: req.body.name,
    });
    await audit(req.user, "class.created", req.school.id);
    res.status(201).json(row);
  });
  const checkClass = async (req, res) => {
    const cls = (await store.all("classes")).find(
      (c) => c.id === req.body.classId && c.schoolId === req.school.id,
    );
    if (!cls || !canSeeClass(req.user, cls.id)) {
      fail(res, 403, "Class access denied");
      return false;
    }
    return true;
  };
  for (const kind of ["attendance", "marks"])
    app.post(`/api/schools/:schoolId/${kind}`, teach, async (req, res) => {
      if (!(await checkClass(req, res))) return;
      const b = req.body,
        student = (await store.all("users")).find(
          (u) =>
            u.id === b.studentId &&
            u.role === "student" &&
            u.schoolIds.includes(req.school.id) &&
            u.classIds.includes(b.classId),
        );
      if (!student) return fail(res, 400, "Invalid student");
      if (
        kind === "attendance" &&
        (!dateValid(b.date) ||
          !["present", "absent", "late", "excused"].includes(b.status))
      )
        return fail(res, 400, "Valid date and attendance status required");
      if (
        kind === "marks" &&
        (!valid(b.exam) ||
          !valid(b.subject) ||
          typeof b.score !== "number" ||
          typeof b.maxScore !== "number" ||
          !Number.isFinite(b.score) ||
          !Number.isFinite(b.maxScore) ||
          b.score < 0 ||
          b.maxScore <= 0 ||
          b.score > b.maxScore)
      )
        return fail(res, 400, "Valid exam, subject and score required");
      if (
        kind === "marks" &&
        (await store.all("exams")).some(
          (e) =>
            e.schoolId === req.school.id &&
            e.classId === b.classId &&
            e.name.toLowerCase() === b.exam.toLowerCase(),
        )
      )
        return fail(res, 409, "Use the configured exam register for this exam");
      const row = await store.transaction(req.school.id, async (tx) => {
        const rows = await tx.all(kind);
        const old = rows.find(
          (r) =>
            r.schoolId === req.school.id &&
            r.classId === b.classId &&
            r.studentId === b.studentId &&
            !r.examId &&
            (kind === "attendance"
              ? r.date === b.date
              : r.exam === b.exam && r.subject === b.subject),
        );
        const row = {
          id:
            old?.id ||
            (kind === "attendance"
              ? createHash("sha256")
                  .update(
                    JSON.stringify([
                      "attendance",
                      req.school.id,
                      b.classId,
                      b.date,
                      b.studentId,
                    ]),
                  )
                  .digest("hex")
                  .slice(0, 36)
              : id()),
          schoolId: req.school.id,
          classId: b.classId,
          studentId: b.studentId,
          ...(kind === "attendance"
            ? { date: b.date, status: b.status }
            : {
                exam: b.exam,
                subject: b.subject,
                score: b.score,
                maxScore: b.maxScore,
              }),
          updatedAt: new Date().toISOString(),
        };
        await tx.put(kind, row);
        await tx.put("audit", {
          id: id(),
          actorId: req.user.id,
          action: `${kind}.saved`,
          schoolId: req.school.id,
          createdAt: new Date().toISOString(),
        });
        return row;
      });
      res.json(row);
    });
  app.post("/api/schools/:schoolId/resources", teach, async (req, res) => {
    if (!(await checkClass(req, res))) return;
    const {
      classId,
      title,
      type,
      description = "",
      url = "",
      dueDate = "",
    } = req.body;
    if (
      !valid(title) ||
      !["homework", "syllabus", "timetable", "material"].includes(type) ||
      typeof description !== "string" ||
      description.length > 5000 ||
      typeof url !== "string" ||
      (url && !/^https:\/\//i.test(url)) ||
      typeof dueDate !== "string" ||
      (dueDate && !dateValid(dueDate))
    )
      return fail(res, 400, "Valid resource details and HTTPS link required");
    const row = await store.put("resources", {
      id: id(),
      schoolId: req.school.id,
      classId,
      title,
      type,
      description,
      url,
      dueDate,
      createdAt: new Date().toISOString(),
    });
    await audit(req.user, "resource.created", req.school.id);
    res.status(201).json(row);
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8, fieldSize: 6000 },
  });
  const uploadRoot = fileURLToPath(
    new URL("../data/uploads/", import.meta.url),
  );
  app.post(
    "/api/schools/:schoolId/uploads",
    teach,
    upload.single("file"),
    async (req, res) => {
      if (!(await checkClass(req, res))) return;
      const { classId, title, type, description = "", dueDate = "" } = req.body;
      if (
        !req.file ||
        !valid(title) ||
        !["homework", "syllabus", "timetable", "material"].includes(type) ||
        typeof description !== "string" ||
        description.length > 5000 ||
        typeof dueDate !== "string" ||
        (dueDate && !dateValid(dueDate))
      )
        return fail(res, 400, "Choose a file and valid resource details");
      const b = req.file.buffer;
      const pdf = b.subarray(0, 5).toString() === "%PDF-";
      const png = b
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpeg = b[0] === 255 && b[1] === 216 && b[2] === 255;
      if (!pdf && !png && !jpeg)
        return fail(res, 400, "Only PDF, PNG and JPEG files are supported");
      const fileId = id();
      const name =
        req.file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120) ||
        "resource";
      await mkdir(uploadRoot, { recursive: true });
      await writeFile(uploadRoot + fileId, b, { flag: "wx" });
      try {
        await store.put("files", {
          id: fileId,
          schoolId: req.school.id,
          classId,
          name,
          mime: pdf ? "application/pdf" : png ? "image/png" : "image/jpeg",
          size: b.length,
        });
        const row = await store.put("resources", {
          id: id(),
          schoolId: req.school.id,
          classId,
          title,
          type,
          description,
          dueDate,
          fileId,
          fileName: name,
          url: "",
          createdAt: new Date().toISOString(),
        });
        await audit(req.user, "resource.uploaded", req.school.id);
        res.status(201).json(row);
      } catch (e) {
        await unlink(uploadRoot + fileId).catch(() => {});
        throw e;
      }
    },
  );
  app.get("/api/schools/:schoolId/files/:fileId", async (req, res) => {
    const file = (await store.all("files")).find(
      (f) => f.id === req.params.fileId && f.schoolId === req.school.id,
    );
    if (!file || !canSeeClass(req.user, file.classId))
      return fail(res, 404, "File not found");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Type", file.mime);
    res.download(uploadRoot + file.id, file.name);
  });
  app.post("/api/schools/:schoolId/notices", manage, async (req, res) => {
    const { title, body, audience = "all", classId = null } = req.body;
    if (
      !valid(title) ||
      !valid(body, 5000) ||
      !["all", ...roles].includes(audience)
    )
      return fail(res, 400, "Valid notice details required");
    if (classId && !(await checkClass(req, res))) return;
    const row = await store.put("notices", {
      id: id(),
      schoolId: req.school.id,
      title,
      body,
      audience,
      classId,
      createdAt: new Date().toISOString(),
    });
    await audit(req.user, "notice.published", req.school.id);
    res.status(201).json(row);
  });
  app.use("/api/schools/:schoolId", createAcademicRouter(store));
  app.use("/api/schools/:schoolId", createTimetableRouter(store));
  app.use("/api/schools/:schoolId", createCalendarRouter(store));
  app.use("/api/schools/:schoolId", createCalendarImportRouter(store));
  app.use("/api/schools/:schoolId", createHomeworkRouter(store));
  app.use("/api", (req, res) => fail(res, 404, "API endpoint not found"));
  const webRoot = fileURLToPath(new URL("../../web/dist/", import.meta.url));
  if (existsSync(webRoot)) {
    app.use(express.static(webRoot));
    app.get(/^(?!\/api(?:\/|$)).*/, (req, res) =>
      res.sendFile(webRoot + "index.html"),
    );
  }
  app.use((err, req, res, next) => {
    console.error(err.message);
    if (res.headersSent) return next(err);
    const status =
      err instanceof multer.MulterError
        ? 400
        : [400, 413].includes(err.status)
          ? err.status
          : 500;
    res.status(status).json({
      error:
        err instanceof multer.MulterError
          ? "Upload rejected. Maximum one file, 5 MB."
          : status === 400
            ? "Invalid JSON request."
            : status === 413
              ? "Request exceeds the size limit."
              : "The request could not be completed.",
    });
  });
  return app;
}
