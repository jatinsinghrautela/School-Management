import React, { useState } from "react";
import { X, Plus } from "./glyphs.jsx";
import { CalendarExcel } from "./calendar-excel.jsx";
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export function Timetable({ data, schoolId, api, refresh, manager }) {
  const classes = data.classes.filter((c) => c.academicYearId);
  const [classId, setClassId] = useState(classes[0]?.id || ""),
    [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const entries = (data.timetable || [])
    .filter((e) => e.classId === classId)
    .sort((a, b) => a.start.localeCompare(b.start));
  const subjects = data.subjects.filter(
    (s) => s.classId === (form?.classId || classId),
  );
  const teachers = data.users.filter(
    (u) =>
      u.active !== false &&
      u.role === "teacher" &&
      data.subjects
        .find((s) => s.id === form?.subjectId)
        ?.teacherIds.includes(u.id),
  );
  function open(entry) {
    setError("");
    setForm(
      entry
        ? { ...entry, entryId: entry.id }
        : {
            classId,
            subjectId: subjects[0]?.id || "",
            teacherId: "",
            day: 1,
            start: "09:00",
            end: "09:45",
            room: "",
          },
    );
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/schools/${schoolId}/timetable`, form);
      setForm(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(entry) {
    setBusy(true);
    setError("");
    try {
      await api(`/schools/${schoolId}/timetable/${entry.id}/cancel`, {});
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="timetable-workspace">
      {manager && (
        <CalendarExcel schoolId={schoolId} api={api} refresh={refresh} />
      )}
      <div className="panel-heading">
        <div>
          <h3>Weekly class schedule</h3>
          <p>Recurring periods for each academic-year class.</p>
        </div>
        {manager && (
          <button
            className="primary"
            disabled={!classId}
            onClick={() => open()}
          >
            <Plus size={16} />
            Add period
          </button>
        )}
      </div>
      <label className="schedule-filter">
        Class
        <select
          aria-label="Timetable class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ·{" "}
              {data.academicYears.find((y) => y.id === c.academicYearId)?.name}
            </option>
          ))}
        </select>
      </label>
      {!classes.length && (
        <p>
          Create year-linked classes and assign subject teachers in Academics
          first.
        </p>
      )}
      {error && !form && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="week-grid">
        {days.map((day, index) => (
          <article className="panel day-column" key={day}>
            <h4>{day}</h4>
            {entries
              .filter((e) => e.day === index + 1)
              .map((e) => (
                <div className="schedule-period" key={e.id}>
                  <strong>
                    {e.start}–{e.end}
                  </strong>
                  <h4>
                    {data.subjects.find((s) => s.id === e.subjectId)?.name ||
                      "Subject"}
                  </h4>
                  <p>
                    {e.teacherName ||
                      data.users.find((u) => u.id === e.teacherId)?.name ||
                      "Teacher"}
                  </p>
                  <small>{e.room || "Room not specified"}</small>
                  {manager && (
                    <div className="schedule-actions">
                      <button className="secondary" onClick={() => open(e)}>
                        Edit
                      </button>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => cancel(e)}
                      >
                        Cancel period
                      </button>
                    </div>
                  )}
                </div>
              ))}
            {!entries.some((e) => e.day === index + 1) && (
              <p className="schedule-empty">No periods scheduled</p>
            )}
          </article>
        ))}
      </div>
      {form && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="period-title"
          >
            <div className="panel-heading">
              <h2 id="period-title">
                {form.entryId ? "Edit period" : "Schedule a period"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close timetable dialog"
                onClick={() => setForm(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={save}>
              <label>
                Subject
                <select
                  aria-label="Schedule subject"
                  required
                  value={form.subjectId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      subjectId: e.target.value,
                      teacherId: "",
                    })
                  }
                >
                  <option value="">Choose subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Teacher
                <select
                  aria-label="Schedule teacher"
                  required
                  value={form.teacherId}
                  onChange={(e) =>
                    setForm({ ...form, teacherId: e.target.value })
                  }
                >
                  <option value="">Choose assigned teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Weekday
                <select
                  aria-label="Schedule weekday"
                  value={form.day}
                  onChange={(e) =>
                    setForm({ ...form, day: Number(e.target.value) })
                  }
                >
                  {days.map((d, i) => (
                    <option value={i + 1} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              {["start", "end"].map((k) => (
                <label key={k}>
                  {k === "start" ? "Start time" : "End time"}
                  <input
                    aria-label={k === "start" ? "Start time" : "End time"}
                    type="time"
                    required
                    value={form[k]}
                    onInput={(e) => setForm({ ...form, [k]: e.target.value })}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Room (optional)
                <input
                  aria-label="Schedule room"
                  maxLength={80}
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : "Save period"}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
