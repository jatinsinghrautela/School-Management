import React, { useState } from "react";
export function AcademicLifecycle({ data, api, schoolId, refresh, manager }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null);
  async function act(path, body) {
    setBusy(true);
    setMessage("");
    try {
      const r = await api(`/schools/${schoolId}${path}`, body);
      await refresh();
      return r;
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function term(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (await act("/academics/terms", f)) {
      e.target.reset();
      setMessage("Term added.");
    }
  }
  async function reportSettings(e) {
    e.preventDefault();
    if (
      await act(
        "/academics/report-settings",
        Object.fromEntries(new FormData(e.currentTarget)),
      )
    )
      setMessage(
        "Report template saved. It will be included in new publications.",
      );
  }
  async function session(e) {
    e.preventDefault();
    if (
      await act("/attendance-sessions", {
        name: new FormData(e.currentTarget).get("name"),
      })
    ) {
      e.target.reset();
      setMessage("Attendance session added.");
    }
  }
  async function promote(e) {
    e.preventDefault();
    setPreview(null);
    setPreview(
      (await act(
        "/academics/promotions/preview",
        Object.fromEntries(new FormData(e.currentTarget)),
      )) || null,
    );
  }
  return (
    <section className="panel record-grid academic-lifecycle">
      <div className="panel-heading">
        <div>
          <h3>Terms, enrollment and attendance sessions</h3>
          <p>Keep academic history while moving students into a later year.</p>
        </div>
      </div>
      {message && (
        <div className="alert" role="status">
          {message}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Term</th>
              <th>Year</th>
              <th>Dates</th>
            </tr>
          </thead>
          <tbody>
            {(data.terms || []).map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>
                  {
                    data.academicYears.find((y) => y.id === t.academicYearId)
                      ?.name
                  }
                </td>
                <td>
                  {t.startDate} – {t.endDate}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {manager && (
        <details className="calendar-form">
          <summary>
            Manage terms, sessions and reports / promote a class
          </summary>
          <form onSubmit={reportSettings} className="calendar-form">
            <h4>School report template</h4>
            <label>
              Report heading
              <input
                name="heading"
                maxLength={100}
                defaultValue={
                  data.reportSettings?.heading || "Academic report card"
                }
                required
              />
            </label>
            <label>
              Accent
              <input
                name="accent"
                type="color"
                defaultValue={data.reportSettings?.accent || "#176455"}
              />
            </label>
            <label>
              Principal sign-off name
              <input
                name="principal"
                maxLength={100}
                defaultValue={data.reportSettings?.principal || ""}
              />
            </label>
            <label>
              Class teacher sign-off name
              <input
                name="classTeacher"
                maxLength={100}
                defaultValue={data.reportSettings?.classTeacher || ""}
              />
            </label>
            <p>
              Typed sign-off names are recorded in publication snapshots. They
              are not cryptographic signatures.
            </p>
            <button className="primary" disabled={busy}>
              Save report template
            </button>
          </form>
          <form onSubmit={term} className="calendar-form">
            <h4>Add term</h4>
            <label>
              Academic year
              <select
                name="academicYearId"
                aria-label="Term academic year"
                required
              >
                {data.academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Term name
              <input name="name" required maxLength={80} />
            </label>
            <label>
              Term start
              <input name="startDate" type="date" required />
            </label>
            <label>
              Term end
              <input name="endDate" type="date" required />
            </label>
            <button className="primary" disabled={busy}>
              Add term
            </button>
          </form>
          <form onSubmit={session} className="calendar-form">
            <h4>Attendance sessions</h4>
            <p>
              Daily remains available. Add morning, afternoon or school-specific
              sessions.
            </p>
            <label>
              Session name
              <input name="name" required maxLength={80} />
            </label>
            <button className="primary" disabled={busy}>
              Add attendance session
            </button>
          </form>
          {(data.attendanceSessions || []).map((s) => (
            <p key={s.id}>
              {s.name} · {s.active ? "Active" : "Inactive"}{" "}
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  act("/attendance-sessions", {
                    sessionId: s.id,
                    name: s.name,
                    active: !s.active,
                  })
                }
              >
                {s.active ? "Deactivate" : "Activate"}
              </button>
            </p>
          ))}
          <form onSubmit={promote} className="calendar-form">
            <h4>Year promotion</h4>
            <p>
              The destination year must have started. Review every student
              before applying; students will sign in again after promotion.
            </p>
            <label>
              Source class
              <select name="fromClassId" required>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ·{" "}
                    {
                      data.academicYears.find((y) => y.id === c.academicYearId)
                        ?.name
                    }
                  </option>
                ))}
              </select>
            </label>
            <label>
              Destination class
              <select name="toClassId" required>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ·{" "}
                    {
                      data.academicYears.find((y) => y.id === c.academicYearId)
                        ?.name
                    }
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" disabled={busy}>
              Preview promotion
            </button>
          </form>
          {preview && (
            <div className="calendar-form">
              <h4>
                {preview.from} → {preview.to}
              </h4>
              <p>
                {preview.students.length} students. Preview expires in 15
                minutes.
              </p>
              <ul>
                {preview.students.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  const r = await act("/academics/promotions/apply", {
                    previewId: preview.previewId,
                  });
                  if (r) {
                    setPreview(null);
                    setMessage(
                      `${r.promoted} students promoted. Enrollment history retained.`,
                    );
                  }
                }}
              >
                Apply reviewed promotion
              </button>
              <button className="secondary" onClick={() => setPreview(null)}>
                Discard preview
              </button>
            </div>
          )}
        </details>
      )}
      <details className="calendar-form">
        <summary>Enrollment history</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class / year</th>
                <th>State</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {(data.enrollments || []).map((e) => (
                <tr key={e.id}>
                  <td>
                    {data.users.find((u) => u.id === e.studentId)?.name ||
                      "Student"}
                  </td>
                  <td>
                    {data.classes.find((c) => c.id === e.classId)?.name ||
                      e.className ||
                      e.classId}{" "}
                    ·{" "}
                    {
                      data.academicYears.find((y) => y.id === e.academicYearId)
                        ?.name
                    }
                  </td>
                  <td>{e.status}</td>
                  <td>
                    {e.startedOn || "Previously enrolled"} –{" "}
                    {e.endedOn || "current"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
