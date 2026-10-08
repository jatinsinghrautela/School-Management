import React, { useState } from "react";
import { X } from "./glyphs.jsx";
import { CalendarExcel } from "./calendar-excel.jsx";
const blank = (date) => ({
  title: "",
  description: "",
  startDate: date,
  endDate: date,
  kind: "event",
  audience: "all",
  classId: "",
});
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function SchoolCalendar({ data, schoolId, api, refresh, manager }) {
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [form, setForm] = useState(null),
    [cancel, setCancel] = useState(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [showCancelled, setShowCancelled] = useState(false);
  const start = `${month}-01`,
    last = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0,
    ).getDate(),
    end = `${month}-${last}`;
  const entries = (data.calendar || [])
    .filter(
      (e) =>
        (showCancelled || !e.cancelled) &&
        e.startDate <= end &&
        e.endDate >= start,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const offset = (new Date(`${start}T12:00:00`).getDay() + 6) % 7;
  function move(delta) {
    const d = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)) - 1 + delta,
      1,
    );
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `/schools/${schoolId}/calendar${cancel ? `/${cancel.id}/cancel` : ""}`,
        cancel
          ? { reason }
          : { ...form, entryId: form.id, classId: form.classId || null },
      );
      setForm(null);
      setCancel(null);
      setReason("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="school-calendar">
      {manager && (
        <CalendarExcel schoolId={schoolId} api={api} refresh={refresh} />
      )}
      <div className="calendar-toolbar">
        <div>
          <h2>School calendar</h2>
          <p>Events, holidays and moments to look forward to.</p>
        </div>
        {manager && (
          <button
            className="primary"
            onClick={() => {
              setError("");
              setForm(
                blank(month === localDate().slice(0, 7) ? localDate() : start),
              );
            }}
          >
            Add event or holiday
          </button>
        )}
      </div>
      <div className="calendar-toolbar">
        <button onClick={() => move(-1)} aria-label="Previous month">
          ←
        </button>
        <label>
          Month
          <input
            type="month"
            min="1900-01"
            max="9998-12"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
        <button onClick={() => move(1)} aria-label="Next month">
          →
        </button>
        {manager && (
          <label>
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />{" "}
            Show cancelled
          </label>
        )}
      </div>
      <div className="calendar-grid" aria-label="Monthly calendar">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="calendar-weekday">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`blank${i}`} className="calendar-day empty" />
        ))}
        {Array.from({ length: last }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`,
            events = entries.filter(
              (e) => !e.cancelled && e.startDate <= date && e.endDate >= date,
            );
          return (
            <div
              key={date}
              className={`calendar-day ${date === localDate() ? "today" : ""}`}
            >
              <strong>{i + 1}</strong>
              {events.slice(0, 2).map((e) => (
                <span
                  key={e.id}
                  className={`calendar-pill ${e.kind}`}
                  title={e.title}
                >
                  {e.title}
                </span>
              ))}
              {events.length > 2 && (
                <small>+{events.length - 2} more in agenda</small>
              )}
            </div>
          );
        })}
      </div>
      <h3>Monthly agenda</h3>
      {!entries.length && <p>No events or holidays in this month.</p>}
      <div className="calendar-agenda">
        {entries.map((e) => (
          <article key={e.id} className="calendar-entry">
            <div>
              {e.source === "year-calendar-excel" && (
                <p>
                  From yearly Excel upload · a later upload can replace this
                  entry
                </p>
              )}
              <span className={`calendar-pill ${e.kind}`}>
                {e.kind}
                {e.cancelled ? " · Cancelled" : ""}
              </span>
              <h3>{e.title}</h3>
              <p>
                {e.startDate}
                {e.endDate !== e.startDate ? ` → ${e.endDate}` : ""} ·{" "}
                {e.classId
                  ? data.classes.find((c) => c.id === e.classId)?.name
                  : "Whole school"}{" "}
                · {e.audience}
              </p>
              <p className="calendar-description">{e.description}</p>
              {e.cancelled && <p>Reason: {e.cancellationReason}</p>}
            </div>
            {manager && !e.cancelled && (
              <div>
                <button
                  onClick={() => {
                    setError("");
                    setForm({ ...e, classId: e.classId || "" });
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setError("");
                    setReason("");
                    setCancel(e);
                  }}
                >
                  Cancel event
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {(form || cancel) && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-title"
          >
            <header className="panel-heading">
              <h2 id="calendar-title">
                {cancel
                  ? "Cancel calendar entry"
                  : form.id
                    ? "Edit calendar entry"
                    : "New calendar entry"}
              </h2>
              <button
                aria-label="Close calendar dialog"
                onClick={() => {
                  setForm(null);
                  setCancel(null);
                }}
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={save} className="calendar-form">
              {cancel ? (
                <>
                  <p>
                    {cancel.title} will disappear from member calendars.
                    Management retains its cancellation record.
                  </p>
                  <label>
                    Cancellation reason
                    <textarea
                      required
                      minLength={5}
                      maxLength={500}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Title
                    <input
                      required
                      maxLength={120}
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={form.kind}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          kind: e.target.value,
                          ...(e.target.value === "holiday"
                            ? { audience: "all", classId: "" }
                            : {}),
                        })
                      }
                    >
                      <option value="event">Event</option>
                      <option value="holiday">School holiday</option>
                    </select>
                  </label>
                  <label>
                    Start date
                    <input
                      required
                      type="date"
                      value={form.startDate}
                      onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    End date
                    <input
                      required
                      type="date"
                      min={form.startDate}
                      value={form.endDate}
                      onChange={(e) =>
                        setForm({ ...form, endDate: e.target.value })
                      }
                    />
                  </label>
                  {form.kind === "event" && (
                    <>
                      <label>
                        Audience
                        <select
                          value={form.audience}
                          onChange={(e) =>
                            setForm({ ...form, audience: e.target.value })
                          }
                        >
                          {[
                            "all",
                            "student",
                            "teacher",
                            "staff",
                            "admin",
                            "principal",
                            "director",
                          ].map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Class
                        <select
                          value={form.classId}
                          onChange={(e) =>
                            setForm({ ...form, classId: e.target.value })
                          }
                        >
                          <option value="">Whole school</option>
                          {data.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                  <label>
                    Description
                    <textarea
                      maxLength={2000}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : cancel
                    ? "Confirm cancellation"
                    : "Save calendar entry"}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
