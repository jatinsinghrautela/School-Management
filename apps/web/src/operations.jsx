import { LogoUpload } from "./school-media.jsx";
import React, { useEffect, useRef, useState, useId } from "react";
const f = (name, label, type = "text", options = null) => ({
  name,
  label,
  type,
  options,
});
const options = (rows) => rows.map((x) => [x.id, x.name || x.title]);
const choices = (values) => values.map((x) => [x, x]);
function Form({ title, fields, initial = {}, onSubmit, busy, label = "Save" }) {
  const formId = useId();
  const [values, setValues] = useState(() => ({ ...initial }));
  const fieldOptions = (field) =>
    typeof field.options === "function" ? field.options(values) : field.options;
  return (
    <details className="operation-form" open={!!initial.id}>
      <summary>{title}</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const body = { ...values, ...Object.fromEntries(new FormData(form)) };
          for (const field of fields) {
            if (field.type === "multi")
              body[field.name] = new FormData(form).getAll(field.name);
            if (field.type === "number")
              body[field.name] = Number(body[field.name]);
            if (field.type === "boolean")
              body[field.name] =
                body[field.name] === true || body[field.name] === "true";
          }
          if (await onSubmit(body)) {
            setValues({ ...initial });
            form.reset();
          }
        }}
      >
        {fields.map((field) => (
          <div
            key={field.name}
            className={
              field.type === "textarea" || field.type === "multi"
                ? "operation-wide"
                : ""
            }
          >
            <label htmlFor={`${formId}-${field.name}`}>{field.label}</label>
            {field.type === "multi" ? (
              <span className="operation-checkboxes">
                {fieldOptions(field).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      name={field.name}
                      value={value}
                      checked={(values[field.name] || []).includes(value)}
                      onChange={(e) =>
                        setValues((old) => ({
                          ...old,
                          [field.name]: e.target.checked
                            ? [...(old[field.name] || []), value]
                            : (old[field.name] || []).filter(
                                (v) => v !== value,
                              ),
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </span>
            ) : field.type === "textarea" ? (
              <textarea
                id={`${formId}-${field.name}`}
                name={field.name}
                required={!field.optional}
                maxLength={field.max || 2000}
                value={values[field.name] || ""}
                onChange={(e) =>
                  setValues({ ...values, [field.name]: e.target.value })
                }
              />
            ) : ["select", "boolean"].includes(field.type) ? (
              <select
                id={`${formId}-${field.name}`}
                name={field.name}
                required={!field.optional}
                value={String(values[field.name] ?? "")}
                onChange={(e) =>
                  setValues({
                    ...values,
                    [field.name]: e.target.value,
                    ...(field.name === "routeId" ? { pickupStop: "" } : {}),
                  })
                }
              >
                <option value="">Choose…</option>
                {(field.type === "boolean"
                  ? [
                      ["true", "Yes"],
                      ["false", "No"],
                    ]
                  : fieldOptions(field) || []
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${formId}-${field.name}`}
                name={field.name}
                type={field.type}
                required={!field.optional}
                min={field.type === "number" ? 1 : undefined}
                maxLength={field.max || 200}
                value={
                  field.type === "date" ? undefined : (values[field.name] ?? "")
                }
                defaultValue={
                  field.type === "date" ? initial[field.name] : undefined
                }
                onChange={(e) =>
                  setValues({ ...values, [field.name]: e.target.value })
                }
              />
            )}
          </div>
        ))}
        <div className="operation-wide">
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : label}
          </button>
        </div>
      </form>
    </details>
  );
}
function List({ title, rows, render }) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1);
  const filtered = rows.filter((x) =>
      JSON.stringify(x).toLowerCase().includes(query.toLowerCase()),
    ),
    pages = Math.max(1, Math.ceil(filtered.length / 10)),
    current = Math.min(page, pages);
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>{title}</h2>
      </div>
      <div className="operations-body">
        <label>
          Search
          <input
            value={query}
            placeholder={`Search ${title.toLowerCase()}`}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {!filtered.length && <p>No records yet.</p>}
        {filtered.slice((current - 1) * 10, current * 10).map((x) => (
          <article className="operation-record" key={x.id}>
            {render(x)}
          </article>
        ))}
        <div className="fee-pagination">
          <span>
            {filtered.length} records · {current} / {pages}
          </span>
          <button
            className="secondary"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <button
            className="secondary"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
export async function downloadArtifact(api, path) {
  const r = await api(path),
    blob = r.html
      ? new Blob([r.html], { type: "text/html;charset=utf-8" })
      : new Blob([Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0))], {
          type: r.mime || "application/octet-stream",
        }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = r.filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Operations({
  api,
  schoolId,
  page,
  manager,
  readOnly,
  refresh,
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(null),
    keys = useRef({});
  const writable = manager && !readOnly,
    base = `/schools/${schoolId}`;
  useEffect(() => {
    let active = true;
    api(base + "/operations")
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);
  async function act(path, body, slot) {
    setBusy(true);
    setError("");
    setMessage("");
    if (slot) {
      body.requestKey = keys.current[slot] || crypto.randomUUID();
      keys.current[slot] = body.requestKey;
    }
    try {
      const row = await api(base + path, body);
      setData(await api(base + "/operations"));
      if (slot) delete keys.current[slot];
      setEditing(null);
      setMessage("School records updated.");
      return row;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reloadRecords() {
    setBusy(true);
    setError("");
    try {
      setData(await api(base + "/operations"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(path) {
    try {
      await downloadArtifact(api, base + path);
    } catch (e) {
      setError(e.message);
    }
  }
  const form = (
    title,
    fields,
    path,
    initial = {},
    transform = (x) => x,
    slot,
  ) => (
    <Form
      key={`${title}:${initial.id || "new"}:${initial.version || 0}`}
      title={title}
      fields={fields}
      initial={initial}
      busy={busy}
      onSubmit={(body) => act(path, transform(body), slot)}
    />
  );
  const history = (row) => (
    <details>
      <summary>Update history</summary>
      {row.history?.map((h, i) => (
        <p key={i}>
          {h.status || h.to || ""} · {h.reason} · {h.actorName || ""} · {h.at}
        </p>
      ))}
    </details>
  );
  if (!data)
    return (
      <section className="panel">
        <div className="operations-body">
          <p>{error || "Loading school operations…"}</p>
        </div>
      </section>
    );
  const people = data.people.filter((p) => p.active),
    students = people.filter((p) => p.role === "student"),
    employees = people.filter((p) => !["student", "parent"].includes(p.role));
  const bookFields = [
    f("code", "Book code"),
    f("title", "Title"),
    f("author", "Author"),
    f("copies", "Copies", "number"),
    f("active", "Available for lending", "boolean"),
  ];
  const routeFields = [
    f("code", "Route code"),
    f("name", "Route name"),
    f("vehicle", "Vehicle label / registration"),
    f("capacity", "Seat capacity", "number"),
    f("stops", "Stop names (one per line)", "textarea"),
    f("active", "Active route", "boolean"),
  ];
  const assetFields = [
    f("code", "Asset code"),
    f("name", "Name"),
    f("category", "Category"),
    f("quantity", "Quantity", "number"),
    f(
      "status",
      "Status",
      "select",
      choices(["available", "in-use", "maintenance", "retired"]),
    ),
    {
      ...f("custodianId", "Employee custodian", "select", [
        ["", "No custodian"],
        ...options(employees),
      ]),
      optional: true,
    },
    f("reason", "Reason for this record/change", "textarea"),
  ];
  const studentOptions = options(manager ? students : data.children);
  return (
    <div className="operations-stack">
      <div className="operation-feedback" aria-live="polite">
        <button className="secondary" disabled={busy} onClick={reloadRecords}>
          Refresh records
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && <p>{message}</p>}
        {readOnly && (
          <p>Support session: these school records are read-only.</p>
        )}
      </div>
      {page === "Library" && (
        <>
          {writable && (
            <section className="panel">
              <div className="operations-body">
                {form(
                  editing?.kind === "book" ? "Edit book" : "Add catalog book",
                  bookFields,
                  "/library/books",
                  editing?.kind === "book"
                    ? editing.row
                    : { copies: 1, active: true },
                )}
                {form(
                  "Lend a book",
                  [
                    f(
                      "bookId",
                      "Available book",
                      "select",
                      options(
                        data.books.filter((b) => b.active && b.available > 0),
                      ),
                    ),
                    f(
                      "userId",
                      "Borrower",
                      "select",
                      options(people.filter((p) => p.role !== "parent")),
                    ),
                    f("dueDate", "Due date", "date"),
                  ],
                  "/library/loans",
                  {},
                  (x) => x,
                  "loan",
                )}
              </div>
            </section>
          )}
          <List
            title="Library catalog"
            rows={data.books}
            render={(b) => (
              <>
                <div className="operation-heading">
                  <h3>{b.title}</h3>
                  <span className="badge">
                    {b.active ? `${b.available} available` : "Retired"}
                  </span>
                </div>
                <p>
                  {b.code} · {b.author} · {b.copies} total copies
                </p>
                {writable && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditing({ kind: "book", row: b });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit book
                  </button>
                )}
              </>
            )}
          />
          <List
            title={manager ? "Lending register" : "My family / account loans"}
            rows={data.loans}
            render={(l) => (
              <>
                <div className="operation-heading">
                  <h3>{l.bookTitle}</h3>
                  <span className="badge">{l.status}</span>
                </div>
                <p>
                  {l.borrowerName} · Due {l.dueDate}
                  {l.status === "open" &&
                  l.dueDate < new Date().toISOString().slice(0, 10)
                    ? " · Overdue"
                    : ""}
                </p>
                {l.returnNote && <p>Return condition: {l.returnNote}</p>}
                {writable &&
                  l.status === "open" &&
                  form(
                    "Record return",
                    [f("reason", "Return condition / reason", "textarea")],
                    `/library/loans/${l.id}/return`,
                  )}
              </>
            )}
          />
        </>
      )}
      {page === "Transport" && (
        <>
          {writable && (
            <section className="panel">
              <div className="operations-body">
                {form(
                  editing?.kind === "route"
                    ? "Edit route"
                    : "Add transport route",
                  routeFields,
                  "/transport/routes",
                  editing?.kind === "route"
                    ? { ...editing.row, stops: editing.row.stops.join("\n") }
                    : { capacity: 30, active: true },
                  (x) => ({
                    ...x,
                    stops: (x.stops || "")
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }),
                )}
                {form(
                  "Assign a student",
                  [
                    f(
                      "routeId",
                      "Route",
                      "select",
                      options(data.routes.filter((r) => r.active)),
                    ),
                    f("studentId", "Student", "select", options(students)),
                    f("pickupStop", "Pickup stop", "select", (v) =>
                      (
                        data.routes.find((r) => r.id === v.routeId)?.stops || []
                      ).map((s) => [s, s]),
                    ),
                  ],
                  "/transport/assignments",
                )}
              </div>
            </section>
          )}
          <List
            title="Transport routes"
            rows={data.routes}
            render={(r) => (
              <>
                <div className="operation-heading">
                  <h3>{r.name}</h3>
                  <span className="badge">
                    {r.active ? "Active" : "Retired"}
                  </span>
                </div>
                <p>
                  {r.code} · {r.vehicle} · {r.capacity} seats
                </p>
                <p>{r.stops.join(" → ")}</p>
                {writable && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditing({ kind: "route", row: r });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit route
                  </button>
                )}
              </>
            )}
          />
          <List
            title="Student transport assignments"
            rows={data.assignments}
            render={(a) => (
              <>
                <h3>{a.studentName}</h3>
                <p>
                  {data.routes.find((r) => r.id === a.routeId)?.name ||
                    "Historical route"}{" "}
                  · {a.pickupStop} · {a.active ? "Assigned" : "Released"}
                </p>
                {a.endReason && <p>{a.endReason}</p>}
                {writable &&
                  a.active &&
                  form(
                    "Release assignment",
                    [f("reason", "Release reason", "textarea")],
                    `/transport/assignments/${a.id}/release`,
                  )}
              </>
            )}
          />
        </>
      )}
      {page === "Operations" && (
        <>
          {writable && (
            <section className="panel">
              <div className="operations-body">
                {form(
                  editing?.kind === "asset" ? "Edit asset" : "Register asset",
                  assetFields,
                  "/assets",
                  editing?.kind === "asset"
                    ? editing.row
                    : { quantity: 1, status: "available", custodianId: "" },
                )}
                {form(
                  "Check in a visitor",
                  [
                    f("name", "Visitor name"),
                    f("purpose", "Visit purpose", "textarea"),
                    f("hostId", "Employee host", "select", options(employees)),
                  ],
                  "/visitors",
                  {},
                  (x) => x,
                  "visitor",
                )}
              </div>
            </section>
          )}
          {(manager || data.assets.length > 0) && (
            <List
              title="Inventory & assets"
              rows={data.assets}
              render={(a) => (
                <>
                  <div className="operation-heading">
                    <h3>{a.name}</h3>
                    <span className="badge">{a.status}</span>
                  </div>
                  <p>
                    {a.code} · {a.category} · Quantity {a.quantity} ·{" "}
                    {a.custodianName || "No custodian"}
                  </p>
                  {history(a)}
                  {writable && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditing({ kind: "asset", row: a });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit asset
                    </button>
                  )}
                </>
              )}
            />
          )}
          {manager && (
            <List
              title="Visitor register"
              rows={data.visitors}
              render={(v) => (
                <>
                  <div className="operation-heading">
                    <h3>{v.name}</h3>
                    <span className="badge">{v.status}</span>
                  </div>
                  <p>
                    {v.purpose} · Host {v.hostName}
                  </p>
                  <p>
                    In: {v.checkedInAt}
                    {v.checkedOutAt ? ` · Out: ${v.checkedOutAt}` : ""}
                  </p>
                  {writable && v.status === "checked-in" && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => act(`/visitors/${v.id}/checkout`, {})}
                    >
                      Check out
                    </button>
                  )}
                </>
              )}
            />
          )}
          {!readOnly && (
            <section className="panel">
              <div className="operations-body">
                <p>
                  School support tickets are reviewed by school leadership. Use
                  your school’s emergency contact for urgent safety concerns.
                </p>
                {form(
                  "Create support ticket",
                  [
                    f("subject", "Subject"),
                    f(
                      "category",
                      "Category",
                      "select",
                      choices(["technical", "facilities", "other"]),
                    ),
                    f("description", "Description", "textarea"),
                  ],
                  "/tickets",
                  {},
                  (x) => x,
                  "ticket",
                )}
                {studentOptions.length > 0 &&
                  form(
                    "Request a school document",
                    [
                      f("studentId", "Student", "select", studentOptions),
                      f(
                        "type",
                        "Document type",
                        "select",
                        choices([
                          "bonafide",
                          "transfer",
                          "certificate",
                          "other",
                        ]),
                      ),
                      f("details", "Request details", "textarea"),
                    ],
                    "/document-requests",
                    {},
                    (x) => x,
                    "document",
                  )}
              </div>
            </section>
          )}
          <List
            title="Support tickets"
            rows={data.tickets}
            render={(t) => (
              <>
                <div className="operation-heading">
                  <h3>{t.subject}</h3>
                  <span className="badge">{t.status}</span>
                </div>
                <p>
                  {t.requesterName} · {t.category}
                </p>
                <p>{t.description}</p>
                {history(t)}
                {writable &&
                  form(
                    "Update ticket",
                    [
                      f(
                        "status",
                        "Status",
                        "select",
                        choices(["open", "in-progress", "resolved", "closed"]),
                      ),
                      f("reason", "Update / resolution reason", "textarea"),
                    ],
                    `/tickets/${t.id}/status`,
                    { version: t.version, status: t.status },
                  )}
              </>
            )}
          />
          <List
            title="Certificate & document requests"
            rows={data.documents}
            render={(d) => (
              <>
                <div className="operation-heading">
                  <h3>
                    {d.type} · {d.studentName}
                  </h3>
                  <span className="badge">{d.status}</span>
                </div>
                <p>{d.details}</p>
                {history(d)}
                {["ready", "collected"].includes(d.status) && (
                  <button
                    className="secondary"
                    onClick={() =>
                      download(`/document-requests/${d.id}/download`)
                    }
                  >
                    Download printable document
                  </button>
                )}
                {writable &&
                  ["requested", "ready"].includes(d.status) &&
                  form(
                    "Review document request",
                    [
                      f(
                        "status",
                        "Decision",
                        "select",
                        choices(
                          d.status === "requested"
                            ? ["ready", "rejected", "cancelled"]
                            : ["collected", "cancelled"],
                        ),
                      ),
                      f("reason", "Decision reason", "textarea"),
                      {
                        ...f(
                          "reference",
                          "Reference number (required for Ready)",
                        ),
                        optional: true,
                      },
                      {
                        ...f(
                          "content",
                          "School-approved document text (required for Ready)",
                          "textarea",
                        ),
                        optional: true,
                        max: 10000,
                      },
                    ],
                    `/document-requests/${d.id}/decision`,
                    { version: d.version },
                  )}
              </>
            )}
          />
        </>
      )}
    </div>
  );
}
export function Inbox({ api, schoolId, readOnly, role, settings }) {
  const [items, setItems] = useState([]),
    [receipts, setReceipts] = useState([]),
    [messaging, setMessaging] = useState({ peers: [], messages: [] }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    keys = useRef({}),
    base = `/schools/${schoolId}`;
  const canMessage = [
    "teacher",
    "parent",
    "director",
    "admin",
    "principal",
  ].includes(role);
  async function load() {
    const a = await api(base + "/inbox");
    setItems(a.items);
    setReceipts(a.noticeReceipts || []);
    if (canMessage) setMessaging(await api(base + "/messages"));
  }
  useEffect(() => {
    let active = true;
    api(base + "/inbox")
      .then((r) => {
        if (active) {
          setItems(r.items);
          setReceipts(r.noticeReceipts || []);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (canMessage)
      api(base + "/messages")
        .then((r) => {
          if (active) setMessaging(r);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [schoolId]);
  async function mark(item) {
    setBusy(true);
    setError("");
    try {
      await api(base + "/inbox/read", { id: item.id });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function send(body) {
    setBusy(true);
    setError("");
    const [toId, studentId] = (body.peer || "").split("|"),
      requestKey = keys.current.message || crypto.randomUUID();
    keys.current.message = requestKey;
    try {
      await api(base + "/messages", {
        toId,
        studentId,
        body: body.body,
        requestKey,
      });
      await load();
      delete keys.current.message;
      return true;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="operations-stack">
      <div className="operation-feedback">
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="secondary"
          disabled={busy}
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh inbox
        </button>
        <p>
          {items.filter((i) => !i.readAt).length} unread · Messages stay inside
          this school workspace.
        </p>
      </div>
      <List
        title="Notification inbox"
        rows={items}
        render={(i) => (
          <>
            <div className="operation-heading">
              <h3>{i.title}</h3>
              <span className="badge">{i.readAt ? "Read" : "Unread"}</span>
            </div>
            <p>{i.body}</p>
            <small>
              {new Date(i.createdAt).toLocaleString(
                settings?.locale || "en-IN",
                { timeZone: settings?.timeZone || "Asia/Kolkata" },
              )}
            </small>
            {!i.readAt && !readOnly && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => mark(i)}
              >
                Mark read
              </button>
            )}
          </>
        )}
      />
      {receipts.length > 0 && (
        <List
          title="Notice read receipts"
          rows={receipts}
          render={(r) => (
            <>
              <h3>{r.title}</h3>
              <p>
                {r.readerName} · {r.readAt}
              </p>
            </>
          )}
        />
      )}
      {canMessage && (
        <section className="panel">
          <div className="panel-title">
            <h2>Teacher & guardian messaging</h2>
          </div>
          <div className="operations-body">
            <p>
              Messages require a current guardian link and a teacher assigned to
              the child’s class. Leadership cannot browse private conversations.
            </p>
            {!messaging.peers.length && (
              <p>No eligible teacher/guardian contacts are linked yet.</p>
            )}
            {!readOnly && messaging.peers.length > 0 && (
              <Form
                title="Write a message"
                fields={[
                  f(
                    "peer",
                    "Recipient and child",
                    "select",
                    messaging.peers.map((p) => [
                      `${p.userId}|${p.studentId}`,
                      `${p.name} · ${p.studentName}`,
                    ]),
                  ),
                  f("body", "Message", "textarea"),
                ]}
                busy={busy}
                onSubmit={send}
                label="Send message"
              />
            )}
          </div>
        </section>
      )}
      {canMessage && (
        <List
          title="My conversations"
          rows={messaging.messages}
          render={(m) => (
            <>
              <h3>
                {m.fromName} → {m.toName}
              </h3>
              <p>
                About {m.studentName} · {m.createdAt}
              </p>
              <p>{m.body}</p>
              <small>{m.readAt ? `Read ${m.readAt}` : "Not read yet"}</small>
            </>
          )}
        />
      )}
    </div>
  );
}
export function Family({
  api,
  schoolId,
  manager,
  readOnly,
  refresh,
  settings,
}) {
  const [data, setData] = useState(null),
    [childId, setChildId] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    base = `/schools/${schoolId}`;
  const hi = settings?.locale === "hi-IN",
    label = (en, hindi) => (hi ? hindi : en);
  const endpoint = manager
    ? "/parent-accounts"
    : `/family${childId ? `?childId=${encodeURIComponent(childId)}` : ""}`;
  useEffect(() => {
    let active = true;
    api(base + endpoint)
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [schoolId, childId]);
  async function act(path, body) {
    setBusy(true);
    setError("");
    try {
      const r = await api(base + path, body);
      setData(await api(base + endpoint));
      if (refresh) await refresh();
      setMessage(r.message || "Guardian access updated.");
      return true;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reloadFamily() {
    setBusy(true);
    setError("");
    try {
      setData(await api(base + endpoint));
    } catch (e) {
      setData(null);
      setError(e.message);
      if (childId) setChildId("");
    } finally {
      setBusy(false);
    }
  }
  async function download(path) {
    try {
      await downloadArtifact(api, base + path);
    } catch (e) {
      setError(e.message);
    }
  }
  const money = (n, c) =>
    new Intl.NumberFormat(settings?.locale || "en-IN", {
      style: "currency",
      currency: c,
    }).format(n / 100);
  if (!data)
    return (
      <section className="panel">
        <div className="operations-body">
          <p>{error || "Loading family records…"}</p>
        </div>
      </section>
    );
  return (
    <div className="operations-stack">
      <div className="operation-feedback" aria-live="polite">
        <button className="secondary" disabled={busy} onClick={reloadFamily}>
          Refresh family view
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && <p>{message}</p>}
      </div>
      {manager ? (
        <>
          <section className="panel">
            <div className="panel-title">
              <h2>Parent accounts & verified child links</h2>
            </div>
            <div className="operations-body">
              <p>
                First add guardian contacts in People → Student records. Verify
                the adult’s identity and authority before linking a login. No
                public sign-up or email-based auto-linking.
              </p>
              {!readOnly && (
                <Form
                  title="Onboard / link a parent"
                  fields={[
                    f("name", "Parent display name"),
                    f("email", "Login email", "email"),
                    f(
                      "guardianIds",
                      "Verified guardian contacts",
                      "multi",
                      data.guardians.map((g) => [
                        g.id,
                        `${g.name} · ${g.studentNames?.join(", ") || "Student"} · ${g.relationship}`,
                      ]),
                    ),
                    f(
                      "authorized",
                      "Identity and authorization verified",
                      "boolean",
                    ),
                  ]}
                  busy={busy}
                  onSubmit={(b) =>
                    act("/parent-accounts", {
                      ...b,
                      authorized: b.authorized === true,
                    })
                  }
                />
              )}
            </div>
          </section>
          <List
            title="Parent access links"
            rows={data.links}
            render={(l) => (
              <>
                <h3>
                  {data.parents.find((p) => p.id === l.userId)?.name ||
                    "Parent"}
                </h3>
                <p>
                  {data.guardians.find((g) => g.id === l.guardianId)?.name ||
                    "Historical guardian contact"}{" "}
                  ·{" "}
                  {data.guardians
                    .find((g) => g.id === l.guardianId)
                    ?.studentNames?.join(", ") ||
                    "Historical child association"}{" "}
                  · {l.active ? "Active" : "Revoked"}
                </p>
                {l.endReason && <p>{l.endReason}</p>}
                {!readOnly && l.active && (
                  <Form
                    title="Revoke guardian access"
                    fields={[f("reason", "Revocation reason", "textarea")]}
                    busy={busy}
                    onSubmit={(b) => act(`/parent-links/${l.id}/revoke`, b)}
                  />
                )}
              </>
            )}
          />
        </>
      ) : (
        <>
          <section className="panel">
            <div className="panel-title">
              <h2>{label("My children", "मेरे बच्चे")}</h2>
            </div>
            <div className="operations-body">
              {!data.children.length ? (
                <p>
                  No active child links. Contact school leadership to verify and
                  link your account.
                </p>
              ) : (
                <label>
                  {label("Choose child", "बच्चा चुनें")}
                  <select
                    value={childId || data.child?.id || ""}
                    onChange={(e) => {
                      setChildId(e.target.value);
                      setData(null);
                    }}
                  >
                    {data.children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.classes.join(", ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>
          {data.child && (
            <>
              <List
                title={label("Attendance", "उपस्थिति")}
                rows={data.child.attendance}
                render={(a) => (
                  <>
                    <h3>
                      {a.date} · {a.status}
                    </h3>
                    <p>
                      {a.excludedFromAttendance
                        ? "School holiday; excluded from attendance totals"
                        : "Recorded attendance"}
                      {a.sessionId ? " · Session attendance" : " · Daily"}
                    </p>
                  </>
                )}
              />
              <List
                title={label("Published results", "प्रकाशित परिणाम")}
                rows={data.child.reports}
                render={(r) => (
                  <>
                    <h3>{r.examName}</h3>
                    <p>
                      {r.grade} · {r.percentage.toFixed(2)}% ·{" "}
                      {r.passed ? "Passed" : "Review needed"}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => download(`/family/reports/${r.id}`)}
                    >
                      Download printable report
                    </button>
                  </>
                )}
              />
              <List
                title={label("Fees & balances", "शुल्क और शेष राशि")}
                rows={data.child.fees}
                render={(c) => (
                  <>
                    <h3>{c.name}</h3>
                    <p>
                      Due {c.dueDate} · Original{" "}
                      {money(c.amountMinor, c.currency)} · Paid{" "}
                      {money(c.paidMinor, c.currency)} · Concession{" "}
                      {money(c.concessionMinor, c.currency)}
                    </p>
                    <strong>
                      {label("Outstanding", "बकाया")}:{" "}
                      {money(c.outstandingMinor, c.currency)}
                    </strong>
                  </>
                )}
              />
              <List
                title={label(
                  "Class learning resources",
                  "कक्षा की अध्ययन सामग्री",
                )}
                rows={data.child.resources}
                render={(r) => (
                  <>
                    <h3>{r.title}</h3>
                    <p>
                      {r.type} · {r.description}
                    </p>
                    {r.dueDate && <p>Due {r.dueDate}</p>}
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        Open resource link
                      </a>
                    )}
                    {r.hasAttachment && (
                      <button
                        className="secondary"
                        onClick={() =>
                          download(`/family/resources/${r.id}/download`)
                        }
                      >
                        Download class attachment
                      </button>
                    )}
                  </>
                )}
              />
              <List
                title={label("Weekly timetable", "साप्ताहिक समय-सारणी")}
                rows={data.child.timetable}
                render={(t) => (
                  <>
                    <h3>
                      {
                        [
                          "",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                          "Sunday",
                        ][t.day]
                      }{" "}
                      · {t.start}–{t.end}
                    </h3>
                    <p>
                      {t.subjectName || t.subjectId} ·{" "}
                      {t.room || "Room not set"}
                    </p>
                  </>
                )}
              />
              <List
                title={label("School notices", "विद्यालय की सूचनाएँ")}
                rows={data.child.notices}
                render={(n) => (
                  <>
                    <h3>{n.title}</h3>
                    <p>{n.body}</p>
                  </>
                )}
              />
              <List
                title={label("Calendar", "कैलेंडर")}
                rows={data.child.calendar}
                render={(e) => (
                  <>
                    <h3>{e.title}</h3>
                    <p>
                      {e.startDate}–{e.endDate} · {e.kind}
                    </p>
                  </>
                )}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
export function SchoolSettings({
  api,
  schoolId,
  schoolName,
  readOnly,
  refresh,
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    base = `/schools/${schoolId}`;
  useEffect(() => {
    let active = true;
    api(base + "/school-settings")
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);
  async function save(body) {
    setBusy(true);
    setError("");
    try {
      const r = await api(base + "/school-settings", {
        ...body,
        accent: "#11796f",
      });
      setData({ ...r, ...(await api(base + "/school-settings")) });
      await refresh();
      setMessage("School appearance and regional settings saved.");
      return true;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel operations-panel">
      <div className="panel-title">
        <h2>School appearance & regional settings</h2>
      </div>
      <div className="operations-body">
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <p>
          Academic years, subjects, terms and grading are configured in
          Academics. Holidays and weekend rules are configured in Calendar.
          Report headings and sign-offs are configured in Results.
        </p>
        {data && (
          <div className="school-brand-preview">
            <span
              className="school-monogram"
              style={{ borderColor: "#11796f" }}
            >
              {(data.displayName || "School")
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <div>
              <h3>{data.displayName || "School identity"}</h3>
              <p>
                {data.locale} · {data.timeZone}
              </p>
              <small>Original generated monogram</small>
            </div>
          </div>
        )}
        {data && (
          <LogoUpload
            api={api}
            schoolId={schoolId}
            settings={data}
            readOnly={readOnly}
            onSaved={async () => {
              setData(await api(base + "/school-settings"));
              await refresh();
              setMessage("School logo saved.");
            }}
          />
        )}
        <p>
          All schools use the same workspace appearance. Your school name and
          uploaded logo identify your school.
        </p>
        {data && !readOnly && (
          <Form
            key={data.version}
            title="Edit school settings"
            fields={[
              f("displayName", "School display name"),
              f("locale", "Regional format / parent labels", "select", [
                ["en-IN", "English · India"],
                ["en-GB", "English · UK"],
                ["en-US", "English · US"],
                ["hi-IN", "Hindi family labels · India"],
              ]),
              f(
                "timeZone",
                "Display timezone",
                "select",
                choices([
                  "Asia/Kolkata",
                  "Etc/UTC",
                  "Europe/London",
                  "America/New_York",
                ]),
              ),
            ]}
            initial={data}
            busy={busy}
            onSubmit={save}
          />
        )}
        <p>
          These settings change display formatting and family labels. Existing
          attendance dates, fee due dates and homework deadlines retain their
          original date semantics.
        </p>
      </div>
    </section>
  );
}
