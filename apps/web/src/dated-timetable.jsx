import React, { useState, useEffect } from "react";
export function DatedTimetable({ data, api, schoolId, manager }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [view, setView] = useState(null),
    [period, setPeriod] = useState(""),
    [teacher, setTeacher] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setView(await api(`/schools/${schoolId}/timetable-date?date=${date}`));
  }
  useEffect(() => {
    let active = true;
    setView(null);
    setPeriod("");
    setError("");
    api(`/schools/${schoolId}/timetable-date?date=${date}`)
      .then((v) => {
        if (active) setView(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [date, schoolId]);
  const selected = view?.entries.find((e) => e.id === period);
  async function save(e, cancel = false) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        `/schools/${schoolId}${cancel ? `/substitutions/${selected.substitution.id}/cancel` : "/substitutions"}`,
        cancel
          ? { reason }
          : { date, entryId: period, teacherId: teacher, reason },
      );
      setReason("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel record-grid">
      <div className="panel-heading">
        <div>
          <h3>Daily timetable and substitutions</h3>
          <p>
            School holidays close the daily schedule. Weekly periods remain
            available below.
          </p>
        </div>
      </div>
      <div className="register-controls">
        <label>
          Date
          <input
            type="date"
            aria-label="Daily timetable date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <div className="alert" role="status">
          {error}
        </div>
      )}
      {view?.holidays.length > 0 && (
        <div className="alert">School closed: {view.holidays.join("; ")}</div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Period</th>
              <th>Subject</th>
              <th>Teacher</th>
              <th>Room</th>
            </tr>
          </thead>
          <tbody>
            {view?.entries.map((e) => (
              <tr key={e.id}>
                <td>{e.className}</td>
                <td>
                  {e.start} – {e.end}
                </td>
                <td>{e.subjectName}</td>
                <td>
                  {e.teacherName}
                  {e.substitution ? " · substitute" : ""}
                </td>
                <td>{e.room || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view && !view.entries.length && !view.holidays.length && (
        <p className="calendar-form">No periods on this date.</p>
      )}
      {manager && view?.entries.length > 0 && (
        <details className="calendar-form">
          <summary>Manage a date-specific substitution</summary>
          <form className="calendar-form" onSubmit={save}>
            <label>
              Period
              <select
                aria-label="Substitution period"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="">Choose period</option>
                {view.entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.className} · {e.start} · {e.subjectName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Substitute teacher
              <select
                aria-label="Substitute teacher"
                required
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              >
                <option value="">Choose assigned teacher</option>
                {data.users
                  .filter(
                    (u) =>
                      u.role === "teacher" &&
                      u.active !== false &&
                      u.classIds.includes(selected?.classId) &&
                      u.id !== selected?.teacherId,
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Reason
              <input
                aria-label="Substitution reason"
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              className="primary"
              disabled={busy || !selected || !!selected.substitution}
            >
              Save substitution
            </button>
            {selected?.substitution && (
              <button
                type="button"
                className="secondary"
                disabled={busy || reason.trim().length < 5}
                onClick={(e) => save(e, true)}
              >
                Cancel substitution with reason
              </button>
            )}
          </form>
        </details>
      )}
    </section>
  );
}
