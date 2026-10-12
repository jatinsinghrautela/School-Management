import React, { useState } from "react";
import { downloadGenerated } from "./data-tools.jsx";
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export function TimetablePlanner({ data, schoolId, api, refresh }) {
  const classes = data.classes.filter((c) => c.academicYearId);
  const [classIds, setClassIds] = useState(classes.map((c) => c.id)),
    [subjectIds, setSubjectIds] = useState(data.subjects.map((s) => s.id)),
    [days, setDays] = useState([1, 2, 3, 4, 5]),
    [config, setConfig] = useState({
      start: "09:00",
      end: "15:00",
      assemblyMinutes: 15,
      lunchCount: 1,
      lunchMinutes: 30,
      periodMinutes: 40,
      ...data.schoolSettings?.timetablePlanning,
    }),
    [draft, setDraft] = useState(null),
    [file, setFile] = useState(null),
    [templateClass, setTemplateClass] = useState(classes[0]?.id || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const toggle = (list, id) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  async function run(path, body) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      return await api(`/schools/${schoolId}/timetable-plan/${path}`, body);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel planner-panel">
      <summary>Plan or import weekly timetables</summary>
      <p>
        Generate a reviewed draft across classes with available assigned
        teachers. Existing periods are preserved: conflicts block saving.
        Assembly and breaks reserve time outside teaching periods.
      </p>
      <div className="planner-grid">
        {Object.keys(config).map((k) => (
          <label key={k}>
            {
              {
                start: "School starts",
                end: "School ends",
                assemblyMinutes: "Assembly minutes",
                lunchCount: "Number of lunch breaks",
                lunchMinutes: "Minutes per lunch break",
                periodMinutes: "Minutes per period",
              }[k]
            }
            <input
              type={["start", "end"].includes(k) ? "time" : "number"}
              min="0"
              value={config[k]}
              onChange={(e) => {
                setConfig({
                  ...config,
                  [k]: ["start", "end"].includes(k)
                    ? e.target.value
                    : Number(e.target.value),
                });
                setDraft(null);
              }}
            />
          </label>
        ))}
      </div>
      <fieldset>
        <legend>Teaching days</legend>
        {weekdays.map((day, i) => (
          <label className="planner-choice" key={day}>
            <input
              type="checkbox"
              checked={days.includes(i + 1)}
              onChange={() => {
                setDays(toggle(days, i + 1));
                setDraft(null);
              }}
            />
            {day}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Classes and sections</legend>
        {classes.map((c) => (
          <label className="planner-choice" key={c.id}>
            <input
              type="checkbox"
              checked={classIds.includes(c.id)}
              onChange={() => {
                setClassIds(toggle(classIds, c.id));
                setDraft(null);
              }}
            />
            {c.name}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Subjects and activities</legend>
        {data.subjects
          .filter((s) => classIds.includes(s.classId))
          .map((s) => (
            <label className="planner-choice" key={s.id}>
              <input
                type="checkbox"
                checked={subjectIds.includes(s.id)}
                onChange={() => {
                  setSubjectIds(toggle(subjectIds, s.id));
                  setDraft(null);
                }}
              />
              {classes.find((c) => c.id === s.classId)?.name} · {s.name} (
              {s.category || "academic"})
            </label>
          ))}
      </fieldset>
      <button
        disabled={busy}
        className="primary"
        onClick={async () => {
          setDraft(null);
          const r = await run("generate", {
            classIds,
            subjectIds,
            weekdays: days,
            config,
          });
          if (r) setDraft(r);
        }}
      >
        Generate preview
      </button>
      <div className="planner-grid">
        <label>
          Class for Excel template
          <select
            value={templateClass}
            onChange={(e) => setTemplateClass(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          disabled={busy || !templateClass}
          onClick={async () => {
            const r = await run("template", {
              classId: templateClass,
              config,
              weekdays: days,
            });
            if (r) downloadGenerated(r);
          }}
        >
          Download class timetable Excel
        </button>
        <label>
          Filled timetable
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setDraft(null);
            }}
          />
        </label>
        <button
          disabled={busy || !file}
          className="secondary"
          onClick={async () => {
            setDraft(null);
            const body = new FormData();
            body.append("file", file);
            const r = await run("preview", body);
            if (r) setDraft(r);
          }}
        >
          Upload and preview timetable
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {draft && (
        <>
          <p>
            {draft.rows.length} periods. Review teacher assignments before
            saving.
          </p>
          <div className="table-wrap planner-preview">
            <table>
              <thead>
                <tr>
                  {["Class", "Day", "Time", "Subject", "Teacher"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {draft.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{classes.find((c) => c.id === r.classId)?.name}</td>
                    <td>{weekdays[r.day - 1]}</td>
                    <td>
                      {r.start}–{r.end}
                    </td>
                    <td>
                      {data.subjects.find((s) => s.id === r.subjectId)?.name}
                    </td>
                    <td>
                      {data.users.find((u) => u.id === r.teacherId)?.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              const r = await run("apply", {
                rows: draft.rows,
                ...(draft.config ? { config: draft.config } : {}),
              });
              if (r) {
                setDraft(null);
                setMessage(`${r.created} periods saved.`);
                await refresh();
              }
            }}
          >
            Save reviewed timetable
          </button>
          <button className="secondary" onClick={() => setDraft(null)}>
            Discard draft
          </button>
        </>
      )}
    </details>
  );
}
