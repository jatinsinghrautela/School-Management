import { Router } from "express";
import { id, managers, canAccessSchool } from "./domain.js";
import { validDate } from "./calendar.js";
import {
  route,
  manage,
  normal,
  fail,
  text,
  reason,
  key,
  audit,
  member,
  children,
  notify,
  escape,
  printable,
} from "./operations-common.js";
const number = (v, min = 0, max = 100000) =>
  Number.isSafeInteger(v) && v >= min && v <= max;
export function createOperationsRouter(store) {
  const r = Router({ mergeParams: true });
  const scoped = (tx, req, k) => tx.all(k, req.school.id);
  async function found(tx, req, k, rowId) {
    const row = (await scoped(tx, req, k)).find((x) => x.id === rowId);
    if (!row) fail(404, "Record not found");
    return row;
  }
  const staffRoles = [...managers, "teacher", "staff"];
  const access = (req) => {
    if (![...staffRoles, "student", "parent"].includes(req.user.role))
      fail(403, "School account required");
  };
  r.get(
    "/operations",
    route(async (req, res) => {
      access(req);
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const management = managers.includes(req.user.role),
            kidIds = new Set((await children(tx, req)).map((u) => u.id));
          const assignments = (
            await scoped(tx, req, "transportAssignments")
          ).filter((x) => management || kidIds.has(x.studentId));
          const routeIds = new Set(
            assignments.filter((x) => x.active).map((x) => x.routeId),
          );
          const loansAll = await scoped(tx, req, "libraryLoans");
          return {
            books: (await scoped(tx, req, "libraryBooks")).map((b) => ({
              ...b,
              available:
                b.copies -
                loansAll.filter((l) => l.bookId === b.id && l.status === "open")
                  .length,
            })),
            loans: (await scoped(tx, req, "libraryLoans")).filter(
              (x) =>
                management || x.userId === req.user.id || kidIds.has(x.userId),
            ),
            routes: (await scoped(tx, req, "transportRoutes")).filter(
              (x) => management || routeIds.has(x.id),
            ),
            assignments,
            assets: (await scoped(tx, req, "assets")).filter(
              (x) => management || x.custodianId === req.user.id,
            ),
            tickets: (await scoped(tx, req, "tickets")).filter(
              (x) => management || x.userId === req.user.id,
            ),
            visitors: management ? await scoped(tx, req, "visitors") : [],
            documents: (await scoped(tx, req, "documentRequests")).filter(
              (x) =>
                management ||
                (x.userId === req.user.id && kidIds.has(x.studentId)),
            ),
            people: management
              ? (await tx.all("users"))
                  .filter(
                    (u) =>
                      u.role !== "owner" &&
                      u.schoolIds.includes(req.school.id) &&
                      canAccessSchool(u, req.school),
                  )
                  .map((u) => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    active: u.active !== false,
                  }))
              : [],
            children: (await children(tx, req)).map((u) => ({
              id: u.id,
              name: u.name,
            })),
          };
        }),
      );
    }),
  );
  r.post(
    "/library/books",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !text(b.code, 60) ||
        !text(b.title) ||
        !text(b.author) ||
        !number(b.copies, 1, 10000) ||
        typeof b.active !== "boolean"
      )
        fail(
          400,
          "Enter a code, title, author, 1–10000 copies and active status",
        );
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = b.id ? await found(tx, req, "libraryBooks", b.id) : null;
          if (old && b.version !== old.version)
            fail(409, "Book changed; reload before editing");
          if (
            (await scoped(tx, req, "libraryBooks")).some(
              (x) =>
                x.id !== old?.id &&
                x.code.toLowerCase() === b.code.trim().toLowerCase(),
            )
          )
            fail(409, "Book code already exists");
          const loans = (await scoped(tx, req, "libraryLoans")).filter(
            (x) => x.bookId === old?.id && x.status === "open",
          ).length;
          if (b.copies < loans || (!b.active && loans))
            fail(
              409,
              "Return active loans before retiring a book or reducing copies below loans",
            );
          const row = {
            id: old?.id || id(),
            schoolId: req.school.id,
            code: b.code.trim(),
            title: b.title.trim(),
            author: b.author.trim(),
            copies: b.copies,
            active: b.active,
            version: (old?.version || 0) + 1,
          };
          await tx.put("libraryBooks", row);
          await audit(tx, req, "library.book-saved", {
            bookId: row.id,
            previous: old,
          });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/library/loans",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !validDate(b.dueDate) ||
        b.dueDate < new Date().toISOString().slice(0, 10) ||
        !key(b.requestKey)
      )
        fail(400, "Choose a current/future due date and request key");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const rows = await scoped(tx, req, "libraryLoans"),
            previous = rows.find((x) => x.requestKey === b.requestKey);
          if (previous) {
            if (
              previous.bookId !== b.bookId ||
              previous.userId !== b.userId ||
              previous.dueDate !== b.dueDate
            )
              fail(409, "Request key was used for different loan details");
            return previous;
          }
          const book = await found(tx, req, "libraryBooks", b.bookId),
            user = await member(tx, req, b.userId, [...staffRoles, "student"]);
          if (
            !book.active ||
            rows.filter((x) => x.bookId === book.id && x.status === "open")
              .length >= book.copies
          )
            fail(409, "No copy is available");
          if (
            rows.some(
              (x) =>
                x.bookId === book.id &&
                x.userId === user.id &&
                x.status === "open",
            )
          )
            fail(409, "This employee/student already has this book");
          const row = {
            id: id(),
            schoolId: req.school.id,
            bookId: book.id,
            userId: user.id,
            borrowerName: user.name,
            bookTitle: book.title,
            dueDate: b.dueDate,
            borrowedAt: new Date().toISOString(),
            status: "open",
            requestKey: b.requestKey,
          };
          await tx.put("libraryLoans", row);
          await audit(tx, req, "library.borrowed", { loanId: row.id });
          await notify(
            tx,
            req,
            user.id,
            "Library loan",
            `${book.title} is due on ${b.dueDate}.`,
          );
          return row;
        }),
      );
    }),
  );
  r.post(
    "/library/loans/:loanId/return",
    route(async (req, res) => {
      manage(req);
      if (!reason(req.body.reason))
        fail(400, "Give a return condition/reason (5–500 characters)");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = await found(tx, req, "libraryLoans", req.params.loanId);
          if (old.status !== "open")
            fail(409, "Book has already been returned");
          const row = {
            ...old,
            status: "returned",
            returnedAt: new Date().toISOString(),
            returnedBy: req.user.id,
            returnNote: req.body.reason.trim(),
          };
          await tx.put("libraryLoans", row);
          await audit(tx, req, "library.returned", {
            loanId: row.id,
            reason: row.returnNote,
          });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/transport/routes",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !text(b.code, 60) ||
        !text(b.name) ||
        !text(b.vehicle, 60) ||
        !number(b.capacity, 1, 500) ||
        !Array.isArray(b.stops) ||
        !b.stops.length ||
        b.stops.length > 40 ||
        !b.stops.every((s) => text(s, 120)) ||
        new Set(b.stops.map((s) => s.trim().toLowerCase())).size !==
          b.stops.length ||
        typeof b.active !== "boolean"
      )
        fail(
          400,
          "Enter a route code, name, vehicle, capacity and unique stop names",
        );
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = b.id
            ? await found(tx, req, "transportRoutes", b.id)
            : null;
          if (old && b.version !== old.version)
            fail(409, "Route changed; reload before editing");
          if (
            (await scoped(tx, req, "transportRoutes")).some(
              (x) =>
                x.id !== old?.id &&
                x.code.toLowerCase() === b.code.trim().toLowerCase(),
            )
          )
            fail(409, "Route code already exists");
          const stops = b.stops.map((s) => s.trim()),
            assigned = (await scoped(tx, req, "transportAssignments")).filter(
              (x) => x.routeId === old?.id && x.active,
            );
          if (
            assigned.length > b.capacity ||
            (!b.active && assigned.length) ||
            assigned.some((x) => !stops.includes(x.pickupStop))
          )
            fail(
              409,
              "Release affected assignments before retiring stops/routes or reducing capacity",
            );
          const row = {
            id: old?.id || id(),
            schoolId: req.school.id,
            code: b.code.trim(),
            name: b.name.trim(),
            vehicle: b.vehicle.trim(),
            capacity: b.capacity,
            stops,
            active: b.active,
            version: (old?.version || 0) + 1,
          };
          await tx.put("transportRoutes", row);
          await audit(tx, req, "transport.route-saved", {
            routeId: row.id,
            previous: old,
          });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/transport/assignments",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const route = await found(tx, req, "transportRoutes", b.routeId),
            student = await member(tx, req, b.studentId, ["student"]),
            rows = await scoped(tx, req, "transportAssignments");
          if (!route.active || !route.stops.includes(b.pickupStop))
            fail(400, "Select an active route and one of its stops");
          const old = rows.find((x) => x.studentId === student.id && x.active);
          if (old) {
            if (old.routeId === route.id && old.pickupStop === b.pickupStop)
              return old;
            fail(409, "Release the current assignment before changing routes");
          }
          if (
            rows.filter((x) => x.routeId === route.id && x.active).length >=
            route.capacity
          )
            fail(409, "Route is at capacity");
          const row = {
            id: id(),
            schoolId: req.school.id,
            routeId: route.id,
            studentId: student.id,
            studentName: student.name,
            pickupStop: b.pickupStop,
            active: true,
            createdAt: new Date().toISOString(),
          };
          await tx.put("transportAssignments", row);
          await audit(tx, req, "transport.assigned", { assignmentId: row.id });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/transport/assignments/:assignmentId/release",
    route(async (req, res) => {
      manage(req);
      if (!reason(req.body.reason)) fail(400, "Give a release reason");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = await found(
            tx,
            req,
            "transportAssignments",
            req.params.assignmentId,
          );
          if (!old.active) fail(409, "Assignment was already released");
          const row = {
            ...old,
            active: false,
            endedAt: new Date().toISOString(),
            endReason: req.body.reason.trim(),
          };
          await tx.put("transportAssignments", row);
          await audit(tx, req, "transport.released", {
            assignmentId: row.id,
            reason: row.endReason,
          });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/assets",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !text(b.code, 60) ||
        !text(b.name) ||
        !text(b.category, 80) ||
        !number(b.quantity, 1) ||
        !["available", "in-use", "maintenance", "retired"].includes(b.status) ||
        !reason(b.reason)
      )
        fail(
          400,
          "Enter asset details, positive quantity, status and change reason",
        );
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = b.id ? await found(tx, req, "assets", b.id) : null;
          if (old && old.version !== b.version)
            fail(409, "Asset changed; reload before editing");
          if (
            (await scoped(tx, req, "assets")).some(
              (x) =>
                x.id !== old?.id &&
                x.code.toLowerCase() === b.code.trim().toLowerCase(),
            )
          )
            fail(409, "Asset code already exists");
          const custodian = b.custodianId
            ? await member(tx, req, b.custodianId, staffRoles)
            : null;
          if (b.status === "in-use" && !custodian)
            fail(400, "In-use assets need an employee custodian");
          const row = {
            id: old?.id || id(),
            schoolId: req.school.id,
            code: b.code.trim(),
            name: b.name.trim(),
            category: b.category.trim(),
            quantity: b.quantity,
            status: b.status,
            custodianId: custodian?.id || null,
            custodianName: custodian?.name || "",
            version: (old?.version || 0) + 1,
            history: [
              ...(old?.history || []),
              {
                at: new Date().toISOString(),
                actorId: req.user.id,
                reason: b.reason.trim(),
                quantity: b.quantity,
                status: b.status,
                custodianId: custodian?.id || null,
              },
            ],
          };
          await tx.put("assets", row);
          await audit(tx, req, "asset.saved", {
            assetId: row.id,
            previous: old,
            reason: b.reason.trim(),
          });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/tickets",
    route(async (req, res) => {
      access(req);
      normal(req);
      const b = req.body;
      if (
        !text(b.subject) ||
        !text(b.description, 2000) ||
        !["technical", "facilities", "other"].includes(b.category) ||
        !key(b.requestKey)
      )
        fail(400, "Enter a subject, description, category and request key");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const rows = await scoped(tx, req, "tickets"),
            old = rows.find((x) => x.requestKey === b.requestKey);
          if (old) {
            if (
              old.userId !== req.user.id ||
              old.subject !== b.subject.trim() ||
              old.description !== b.description.trim() ||
              old.category !== b.category
            )
              fail(409, "Request key was used for different ticket details");
            return old;
          }
          const row = {
            id: id(),
            schoolId: req.school.id,
            userId: req.user.id,
            requesterName: req.user.name,
            subject: b.subject.trim(),
            description: b.description.trim(),
            category: b.category,
            status: "open",
            version: 1,
            requestKey: b.requestKey,
            createdAt: new Date().toISOString(),
            history: [],
          };
          await tx.put("tickets", row);
          await audit(tx, req, "ticket.created", { ticketId: row.id });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/tickets/:ticketId/status",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !["open", "in-progress", "resolved", "closed"].includes(b.status) ||
        !reason(b.reason)
      )
        fail(400, "Choose a status and explain the update");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = await found(tx, req, "tickets", req.params.ticketId);
          if (old.version !== b.version)
            fail(409, "Ticket changed; reload before updating");
          if (old.status === b.status)
            fail(409, "Ticket already has this status");
          const event = {
            status: b.status,
            reason: b.reason.trim(),
            at: new Date().toISOString(),
            actorName: req.user.name,
          };
          const row = {
            ...old,
            status: b.status,
            version: old.version + 1,
            history: [...old.history, event],
          };
          await tx.put("tickets", row);
          await audit(tx, req, "ticket.status-changed", {
            ticketId: row.id,
            ...event,
          });
          await notify(
            tx,
            req,
            row.userId,
            "Support ticket updated",
            `${row.subject}: ${b.status}. ${event.reason}`,
          );
          return row;
        }),
      );
    }),
  );
  r.post(
    "/visitors",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (!text(b.name) || !text(b.purpose, 500) || !key(b.requestKey))
        fail(400, "Enter visitor name, purpose and request key");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = (await scoped(tx, req, "visitors")).find(
            (x) => x.requestKey === b.requestKey,
          );
          if (old) {
            if (
              old.name !== b.name.trim() ||
              old.purpose !== b.purpose.trim() ||
              old.hostId !== b.hostId
            )
              fail(409, "Request key was used for different visitor details");
            return old;
          }
          const host = await member(tx, req, b.hostId, staffRoles);
          const row = {
            id: id(),
            schoolId: req.school.id,
            hostId: host.id,
            hostName: host.name,
            name: b.name.trim(),
            purpose: b.purpose.trim(),
            requestKey: b.requestKey,
            status: "checked-in",
            checkedInAt: new Date().toISOString(),
            checkedInBy: req.user.id,
          };
          await tx.put("visitors", row);
          await audit(tx, req, "visitor.checked-in", { visitorId: row.id });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/visitors/:visitorId/checkout",
    route(async (req, res) => {
      manage(req);
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = await found(tx, req, "visitors", req.params.visitorId);
          if (old.status !== "checked-in")
            fail(409, "Visitor already checked out");
          const row = {
            ...old,
            status: "checked-out",
            checkedOutAt: new Date().toISOString(),
            checkedOutBy: req.user.id,
          };
          await tx.put("visitors", row);
          await audit(tx, req, "visitor.checked-out", { visitorId: row.id });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/document-requests",
    route(async (req, res) => {
      access(req);
      normal(req);
      const b = req.body;
      if (
        !["bonafide", "transfer", "certificate", "other"].includes(b.type) ||
        !text(b.details, 1000) ||
        !key(b.requestKey)
      )
        fail(400, "Choose a document type and explain the request");
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const kids = await children(tx, req);
          if (
            !managers.includes(req.user.role) &&
            !kids.some((u) => u.id === b.studentId)
          )
            fail(403, "Choose your own or linked child record");
          const student = await member(tx, req, b.studentId, ["student"]);
          const old = (await scoped(tx, req, "documentRequests")).find(
            (x) => x.requestKey === b.requestKey,
          );
          if (old) {
            if (
              old.userId !== req.user.id ||
              old.studentId !== b.studentId ||
              old.type !== b.type ||
              old.details !== b.details.trim()
            )
              fail(409, "Request key was used for different document details");
            return old;
          }
          const row = {
            id: id(),
            schoolId: req.school.id,
            userId: req.user.id,
            studentId: student.id,
            studentName: student.name,
            type: b.type,
            details: b.details.trim(),
            requestKey: b.requestKey,
            status: "requested",
            version: 1,
            createdAt: new Date().toISOString(),
            history: [],
          };
          await tx.put("documentRequests", row);
          await audit(tx, req, "document.requested", { requestId: row.id });
          return row;
        }),
      );
    }),
  );
  r.post(
    "/document-requests/:documentId/decision",
    route(async (req, res) => {
      manage(req);
      const b = req.body;
      if (
        !["ready", "rejected", "collected", "cancelled"].includes(b.status) ||
        !reason(b.reason) ||
        (b.status === "ready" &&
          (!text(b.content, 10000) || !text(b.reference, 120)))
      )
        fail(
          400,
          "Provide a reason; ready documents also need a reference and school-approved text",
        );
      res.json(
        await store.transaction(req.school.id, async (tx) => {
          const old = await found(
            tx,
            req,
            "documentRequests",
            req.params.documentId,
          );
          if (old.version !== b.version)
            fail(409, "Document request changed; reload before deciding");
          const allowed = {
            requested: ["ready", "rejected", "cancelled"],
            ready: ["collected", "cancelled"],
          };
          if (!allowed[old.status]?.includes(b.status))
            fail(409, "This document transition is not allowed");
          const event = {
            status: b.status,
            reason: b.reason.trim(),
            actorName: req.user.name,
            at: new Date().toISOString(),
          };
          const row = {
            ...old,
            status: b.status,
            version: old.version + 1,
            history: [...old.history, event],
            ...(b.status === "ready"
              ? {
                  content: b.content.trim(),
                  reference: b.reference.trim(),
                  issuedBy: req.user.name,
                  issuedAt: event.at,
                }
              : {}),
          };
          await tx.put("documentRequests", row);
          await audit(tx, req, "document.status-changed", {
            requestId: row.id,
            ...event,
          });
          await notify(
            tx,
            req,
            row.userId,
            "Document request updated",
            `${row.type} for ${row.studentName}: ${row.status}.`,
            "document",
            row.id,
          );
          return row;
        }),
      );
    }),
  );
  r.get(
    "/document-requests/:documentId/download",
    route(async (req, res) => {
      access(req);
      const row = await found(
          store,
          req,
          "documentRequests",
          req.params.documentId,
        ),
        kidIds = new Set((await children(store, req)).map((u) => u.id));
      if (
        !managers.includes(req.user.role) &&
        (row.userId !== req.user.id || !kidIds.has(row.studentId))
      )
        fail(404, "Document not found");
      if (!["ready", "collected"].includes(row.status))
        fail(409, "Document is not available");
      res.json({
        filename: `school-document-${row.id}.html`,
        html: printable(
          `${row.type} · ${row.reference}`,
          req.school.name,
          `<p>Student: ${escape(row.studentName)}</p><pre>${escape(row.content)}</pre><p>Issued by ${escape(row.issuedBy)} · ${escape(row.issuedAt)}</p><p>This is school-provided text. Printed names are not cryptographic signatures.</p>`,
        ),
      });
    }),
  );
  return r;
}
