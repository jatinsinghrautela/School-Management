import React, { useEffect, useState } from "react";
import { AcademicLifecycle } from "./academic-lifecycle.jsx";
import "./academics.css";
import {
  Plus,
  CalendarDays,
  BookOpen,
  GraduationCap,
  X,
  Check,
  Printer,
  LockKeyhole,
  RotateCcw,
} from "./glyphs.jsx";

function Field({ label, children }) {
  return (
    <label className="academic-field">
      {label}
      {children}
    </label>
  );
}
function Empty({ children }) {
  return (
    <div className="empty">
      <GraduationCap size={28} />
      <p>{children}</p>
    </div>
  );
}
const defaults = [
  { label: "A", minPercent: 80 },
  { label: "B", minPercent: 60 },
  { label: "C", minPercent: 40 },
  { label: "F", minPercent: 0 },
];
export function Academics({ data, api, schoolId, refresh, manager }) {
  const [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const years = data.academicYears || [],
    subjects = data.subjects || [],
    exams = data.exams || [];
  async function action(path, body) {
    setBusy(true);
    setError("");
    try {
      await api(`/schools/${schoolId}${path}`, body);
      setModal(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="academic-intro">
        <CalendarDays size={22} />
        <div>
          <strong>Structure for a successful year</strong>
          <p>
            Set up the academic year, classes, teaching assignments, and exams.
            Grades and subject weights are configured per exam.
          </p>
        </div>
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <AcademicLifecycle
        data={data}
        api={api}
        schoolId={schoolId}
        refresh={refresh}
        manager={manager}
      />
      <div className="academic-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Academic years</h3>
              <p>Your school’s academic calendar.</p>
            </div>
            {manager && (
              <button className="text-button" onClick={() => setModal("year")}>
                <Plus size={15} />
                Add year
              </button>
            )}
          </div>
          {years.map((y) => (
            <div className="academic-row" key={y.id}>
              <div>
                <strong>{y.name}</strong>
                <small>
                  {y.startDate} → {y.endDate}
                </small>
              </div>
              {y.isCurrent ? (
                <span className="badge">Current</span>
              ) : (
                manager && (
                  <button
                    disabled={busy}
                    className="text-button"
                    onClick={() =>
                      action(`/academics/years/${y.id}/activate`, {})
                    }
                  >
                    Make current
                  </button>
                )
              )}
            </div>
          ))}
          {!years.length && <Empty>Add an academic year to start.</Empty>}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Classes and sections</h3>
              <p>Linked to their academic year.</p>
            </div>
            {manager && (
              <button className="text-button" onClick={() => setModal("class")}>
                <Plus size={15} />
                Add class
              </button>
            )}
          </div>
          {data.classes.map((c) => (
            <div className="academic-row" key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <small>
                  {years.find((y) => y.id === c.academicYearId)?.name ||
                    "Legacy class · no academic year linked"}
                </small>
              </div>
              <BookOpen size={16} />
            </div>
          ))}
          {!data.classes.length && <Empty>Create a grade and section.</Empty>}
        </section>
      </div>
      <section className="panel academic-section">
        <div className="panel-heading">
          <div>
            <h3>Subjects and teaching assignments</h3>
            <p>Only assigned teachers can enter marks for a subject.</p>
          </div>
          {manager && (
            <button className="secondary" onClick={() => setModal("subject")}>
              <Plus size={15} />
              Add subject
            </button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Class</th>
                <th>Assigned teachers</th>
                {manager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{data.classes.find((c) => c.id === s.classId)?.name}</td>
                  <td>
                    {s.teacherIds
                      .map(
                        (tid) =>
                          data.users.find((u) => u.id === tid)?.name ||
                          "Assigned teacher",
                      )
                      .join(", ") || "No teacher assigned"}
                  </td>
                  {manager && (
                    <td>
                      <button
                        className="text-button"
                        onClick={() =>
                          setModal({ type: "assignment", subject: s })
                        }
                      >
                        Edit assignments
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!subjects.length && (
            <Empty>Add the subjects taught in each class.</Empty>
          )}
        </div>
      </section>
      <section className="panel academic-section">
        <div className="panel-heading">
          <div>
            <h3>Exam calendar</h3>
            <p>Draft exams stay private until results are published.</p>
          </div>
          {manager && (
            <button className="primary" onClick={() => setModal("exam")}>
              <Plus size={15} />
              Create exam
            </button>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Class / year</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Subjects</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>
                    {data.classes.find((c) => c.id === e.classId)?.name}
                    <small className="cell-detail">
                      {years.find((y) => y.id === e.academicYearId)?.name}
                    </small>
                  </td>
                  <td>
                    {e.startDate} → {e.endDate}
                  </td>
                  <td>
                    <span
                      className={
                        "badge " + (e.status === "draft" ? "draft-badge" : "")
                      }
                    >
                      {e.status}
                    </span>
                  </td>
                  <td>{e.subjects.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!exams.length && (
            <Empty>Create an exam after configuring its class subjects.</Empty>
          )}
        </div>
      </section>
      {modal && (
        <AcademicEditor
          type={typeof modal === "string" ? modal : modal.type}
          subject={modal.subject}
          data={data}
          close={() => {
            setModal(null);
            setError("");
          }}
          save={action}
          error={error}
          busy={busy}
        />
      )}
    </>
  );
}

function AcademicEditor({ type, data, close, save, error, busy, subject }) {
  const years = data.academicYears || [],
    initialYear = years.find((y) => y.isCurrent) || years[0];
  const [form, setForm] = useState({
      name: "",
      startDate: initialYear?.startDate || "",
      endDate: initialYear?.endDate || "",
      academicYearId: initialYear?.id || "",
      classId:
        subject?.classId ||
        (type === "exam"
          ? data.classes.find(
              (c) => !c.academicYearId || c.academicYearId === initialYear?.id,
            )?.id
          : data.classes[0]?.id) ||
        "",
      grade: "",
      section: "",
      teacherIds: subject?.teacherIds || [],
    }),
    [specs, setSpecs] = useState({}),
    [bands, setBands] = useState(defaults.map((b) => ({ ...b })));
  const update = (key, value) => setForm({ ...form, [key]: value });
  const input = (key, label, type = "text", required = true) => (
    <Field label={label}>
      <input
        aria-label={label}
        required={required}
        type={type}
        onInput={
          type === "date" ? (e) => update(key, e.target.value) : undefined
        }
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
      />
    </Field>
  );
  const select = (key, label, options) => (
    <Field label={label}>
      <select
        aria-label={label}
        value={form[key]}
        required
        onChange={(e) => {
          setForm({
            ...form,
            [key]: e.target.value,
            ...(key === "classId" ? { teacherIds: [] } : {}),
            ...(key === "academicYearId" && type === "exam"
              ? {
                  classId: "",
                  startDate:
                    years.find((y) => y.id === e.target.value)?.startDate || "",
                  endDate:
                    years.find((y) => y.id === e.target.value)?.endDate || "",
                }
              : {}),
          });
          if (
            key === "classId" ||
            (key === "academicYearId" && type === "exam")
          )
            setSpecs({});
        }}
      >
        <option value="">Choose {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  );
  function submit(e) {
    e.preventDefault();
    if (type === "assignment")
      save(`/academics/subjects/${subject.id}/assign`, {
        teacherIds: form.teacherIds,
      });
    if (type === "year")
      save("/academics/years", {
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
      });
    if (type === "class")
      save("/academics/classes", {
        academicYearId: form.academicYearId,
        grade: form.grade,
        section: form.section,
      });
    if (type === "subject")
      save("/academics/subjects", {
        name: form.name,
        classId: form.classId,
        teacherIds: form.teacherIds,
      });
    if (type === "exam")
      save("/exams", {
        name: form.name,
        classId: form.classId,
        academicYearId: form.academicYearId,
        startDate: form.startDate,
        endDate: form.endDate,
        subjects: Object.entries(specs)
          .filter(([, s]) => s.enabled)
          .map(([subjectId, s]) => ({
            subjectId,
            maxScore: Number(s.maxScore),
            weight: Number(s.weight),
            passPercent: Number(s.passPercent),
          })),
        gradingBands: bands.map((b) => ({
          label: b.label,
          minPercent: Number(b.minPercent),
        })),
      });
  }
  return (
    <div className="modal-backdrop">
      <section
        className={"modal " + (type === "exam" ? "exam-modal" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="academic-modal-title"
      >
        <div className="panel-heading">
          <h2 id="academic-modal-title">
            {
              {
                year: "Add academic year",
                class: "Create grade and section",
                subject: "Add subject",
                exam: "Configure an exam",
                assignment: `Assign teachers · ${subject?.name}`,
              }[type]
            }
          </h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          {["year", "subject", "exam"].includes(type) &&
            input(
              "name",
              type === "year"
                ? "Academic year name"
                : type === "subject"
                  ? "Subject name"
                  : "Exam name",
            )}
          {["class", "exam"].includes(type) &&
            select("academicYearId", "Academic year", years)}
          {type === "class" && (
            <div className="form-two">
              {input("grade", "Grade")}
              {input("section", "Section")}
            </div>
          )}
          {["subject", "exam"].includes(type) &&
            select(
              "classId",
              "Class",
              data.classes.filter(
                (c) =>
                  type !== "exam" ||
                  !c.academicYearId ||
                  c.academicYearId === form.academicYearId,
              ),
            )}
          {["year", "exam"].includes(type) && (
            <div className="form-two">
              {input("startDate", "Start date", "date")}
              {input("endDate", "End date", "date")}
            </div>
          )}
          {["subject", "assignment"].includes(type) && (
            <fieldset>
              <legend>Assigned teachers</legend>
              {data.users
                .filter(
                  (u) =>
                    u.role === "teacher" && u.classIds.includes(form.classId),
                )
                .map((t) => (
                  <label className="checkbox" key={t.id}>
                    <input
                      type="checkbox"
                      checked={form.teacherIds.includes(t.id)}
                      onChange={(e) =>
                        update(
                          "teacherIds",
                          e.target.checked
                            ? [...form.teacherIds, t.id]
                            : form.teacherIds.filter((tid) => tid !== t.id),
                        )
                      }
                    />
                    {t.name}
                  </label>
                ))}
              <p className="form-note">
                Teacher accounts need class access before they can be assigned.
              </p>
            </fieldset>
          )}
          {type === "exam" && (
            <>
              <fieldset>
                <legend>Exam subjects</legend>
                <p className="form-note">
                  Weights are normalized when calculating the overall
                  percentage. A student must meet each subject’s pass
                  percentage.
                </p>
                {(data.subjects || [])
                  .filter((s) => s.classId === form.classId)
                  .map((s) => {
                    const spec = specs[s.id] || {
                      enabled: false,
                      maxScore: 100,
                      weight: 1,
                      passPercent: 40,
                    };
                    const change = (key, value) =>
                      setSpecs({ ...specs, [s.id]: { ...spec, [key]: value } });
                    return (
                      <div className="exam-spec" key={s.id}>
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={spec.enabled}
                            onChange={(e) =>
                              change("enabled", e.target.checked)
                            }
                          />
                          {s.name}
                        </label>
                        {spec.enabled && (
                          <div className="form-three">
                            {[
                              ["maxScore", "Maximum marks", 1, 10000],
                              ["weight", "Weight", 0.01, 100],
                              ["passPercent", "Pass percentage", 0, 100],
                            ].map(([key, label, min, max]) => (
                              <Field key={key} label={label}>
                                <input
                                  aria-label={`${s.name} ${label}`}
                                  type="number"
                                  min={min}
                                  max={max}
                                  step="0.01"
                                  required
                                  value={spec[key]}
                                  onChange={(e) => change(key, e.target.value)}
                                />
                              </Field>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </fieldset>
              <fieldset>
                <legend>Grade thresholds</legend>
                <p className="form-note">
                  Example defaults only. Set your school’s grading rules before
                  creating the exam. Include a threshold of zero.
                </p>
                {bands.map((b, i) => (
                  <div className="grade-band" key={i}>
                    <input
                      aria-label={`Grade ${i + 1} label`}
                      required
                      maxLength={12}
                      value={b.label}
                      onChange={(e) =>
                        setBands(
                          bands.map((row, index) =>
                            index === i
                              ? { ...row, label: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <input
                      aria-label={`Grade ${i + 1} minimum percentage`}
                      required
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={b.minPercent}
                      onChange={(e) =>
                        setBands(
                          bands.map((row, index) =>
                            index === i
                              ? { ...row, minPercent: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                    <button
                      aria-label={`Remove grade ${i + 1}`}
                      type="button"
                      className="icon-button"
                      onClick={() =>
                        setBands(bands.filter((_, index) => index !== i))
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-button"
                  disabled={bands.length >= 12}
                  onClick={() =>
                    setBands([...bands, { label: "", minPercent: "" }])
                  }
                >
                  <Plus size={14} />
                  Add grade threshold
                </button>
              </fieldset>
            </>
          )}
          {error && (
            <div role="alert" className="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={close}>
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save configuration"}
              <Check size={15} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function ExamResults({ data, api, schoolId, refresh, user, manager }) {
  const exams = data.exams || [],
    [examId, setExamId] = useState(exams[0]?.id || ""),
    [subjectId, setSubjectId] = useState(""),
    [values, setValues] = useState({}),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(null),
    [history, setHistory] = useState([]),
    [reopen, setReopen] = useState(false),
    [reason, setReason] = useState("");
  const exam = exams.find((e) => e.id === examId),
    roster = data.users.filter(
      (u) => u.role === "student" && u.classIds.includes(exam?.classId),
    );
  const subjects = (data.subjects || []).filter(
    (s) =>
      exam?.subjects.some((spec) => spec.subjectId === s.id) &&
      (manager || s.teacherIds.includes(user.id)),
  );
  const spec = exam?.subjects.find((s) => s.subjectId === subjectId),
    record = (student) =>
      data.marks.find(
        (m) =>
          m.examId === examId &&
          m.subjectId === subjectId &&
          m.studentId === student.id,
      ),
    value = (student) => values[student.id] ?? record(student)?.score ?? "";
  useEffect(() => {
    setSubjectId("");
    setValues({});
    setReport(null);
    setError("");
    setMessage("");
  }, [examId]);
  useEffect(() => setValues({}), [subjectId]);
  useEffect(() => {
    if (examId && !exams.some((e) => e.id === examId))
      setExamId(exams[0]?.id || "");
  }, [data.exams]);
  async function action(path, body) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(`/schools/${schoolId}${path}`, body);
      setMessage(
        result.saved
          ? `${result.saved} records saved together.`
          : result.published
            ? `${result.published} report cards published.`
            : "Exam reopened. Student access is paused until you publish again.",
      );
      setReopen(false);
      setValues({});
      setReport(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const entries = roster
      .filter((s) => value(s) !== "")
      .map((s) => ({ studentId: s.id, score: Number(value(s)) }));
    await action(`/exams/${examId}/marks/batch`, { subjectId, entries });
  }
  async function viewReport(studentId) {
    setBusy(true);
    setError("");
    setHistory([]);
    try {
      setReport(
        await api(`/schools/${schoolId}/reports/${examId}/${studentId}`),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function viewHistory(studentId) {
    setBusy(true);
    setError("");
    try {
      const result = await api(
        `/schools/${schoolId}/reports/${examId}/${studentId}/history`,
      );
      if (!result.reports.length)
        throw new Error("No published report versions are available");
      setHistory(result.reports);
      setReport(result.reports[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const complete =
    exam &&
    roster.length > 0 &&
    roster.every((u) =>
      exam.subjects.every((s) =>
        data.marks.some(
          (m) =>
            m.examId === exam.id &&
            m.subjectId === s.subjectId &&
            m.studentId === u.id,
        ),
      ),
    );
  return (
    <>
      <div className="results-select">
        <Field label="Exam">
          <select
            aria-label="Results exam"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
          >
            <option value="">Choose an exam</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {data.classes.find((c) => c.id === e.classId)?.name}{" "}
                · {e.status}
              </option>
            ))}
          </select>
        </Field>
        {exam && (
          <span
            className={
              "badge " + (exam.status === "draft" ? "draft-badge" : "")
            }
          >
            {exam.status === "published"
              ? `Published · version ${exam.version}`
              : "Draft · private to staff"}
          </span>
        )}
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="success" role="status">
          {message}
        </div>
      )}
      {!exam && (
        <Empty>
          {user.role === "student"
            ? "Your report cards will appear after your school publishes results."
            : "Set up an exam in Academics, then select it here to enter marks."}
        </Empty>
      )}
      {exam && (
        <>
          <section className="panel academic-section">
            <div className="panel-heading">
              <div>
                <h3>{exam.name}</h3>
                <p>
                  {
                    data.academicYears?.find(
                      (y) => y.id === exam.academicYearId,
                    )?.name
                  }{" "}
                  · {exam.startDate} → {exam.endDate}
                </p>
              </div>
              {manager &&
                (exam.status === "published" ? (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => {
                      setReopen(true);
                      setReason("");
                    }}
                  >
                    <RotateCcw size={14} />
                    Reopen for correction
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={busy || !complete}
                    onClick={() => action(`/exams/${exam.id}/publish`, {})}
                  >
                    <Check size={15} />
                    Publish results
                  </button>
                ))}
            </div>
            {exam.status === "draft" && user.role !== "student" && (
              <form onSubmit={save}>
                <div className="register-controls">
                  <Field label="Subject">
                    <select
                      aria-label="Exam subject"
                      value={subjectId}
                      required
                      onChange={(e) => setSubjectId(e.target.value)}
                    >
                      <option value="">Choose your assigned subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {spec && (
                    <div className="mark-rule">
                      Maximum {spec.maxScore} · Weight {spec.weight} · Pass{" "}
                      {spec.passPercent}%
                    </div>
                  )}
                </div>
                {subjectId && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Score</th>
                          <th>Recorded score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.map((s) => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>
                              <input
                                className="score-input"
                                aria-label={`Exam marks for ${s.name}`}
                                type="number"
                                min="0"
                                max={spec?.maxScore}
                                step="0.01"
                                value={value(s)}
                                onChange={(e) =>
                                  setValues({
                                    ...values,
                                    [s.id]: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              {record(s)
                                ? `${record(s).score} / ${spec?.maxScore}`
                                : "Not entered"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="register-footer">
                  <span>
                    All records save together. Blank scores remain unchanged.
                  </span>
                  <button
                    className="primary"
                    disabled={busy || !subjectId || !roster.length}
                  >
                    {busy ? "Saving…" : "Save exam marks"}
                  </button>
                </div>
              </form>
            )}
            {exam.status === "draft" && manager && !complete && (
              <div className="exam-hint">
                Publication becomes available when every enrolled student has a
                score for every exam subject.
              </div>
            )}
            {exam.status === "published" && (
              <div className="exam-hint">
                <LockKeyhole size={16} />
                Published results are locked. Report cards use an approved
                snapshot.
              </div>
            )}
          </section>
          {exam.status === "draft" && roster.length > 0 && (
            <section className="panel academic-section">
              <div className="panel-heading">
                <div>
                  <h3>Mark completion</h3>
                  <p>Review progress before publication.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      {exam.subjects.map((s) => (
                        <th key={s.subjectId}>
                          {
                            data.subjects.find((a) => a.id === s.subjectId)
                              ?.name
                          }
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        {exam.subjects.map((s) => {
                          const m = data.marks.find(
                            (m) =>
                              m.examId === exam.id &&
                              m.subjectId === s.subjectId &&
                              m.studentId === u.id,
                          );
                          return (
                            <td key={s.subjectId}>
                              {m ? (
                                `${m.score} / ${s.maxScore}`
                              ) : (
                                <span className="badge warning">Missing</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {(exam.status === "published" || (manager && exam.version > 0)) && (
            <section className="panel academic-section">
              <div className="panel-heading">
                <div>
                  <h3>
                    {exam.status === "published"
                      ? "Published report cards"
                      : "Archived report cards"}
                  </h3>
                  <p>View and print individual student reports.</p>
                </div>
              </div>
              {roster.map((s) => (
                <div className="academic-row" key={s.id}>
                  <div>
                    <strong>{s.name}</strong>
                    <small>
                      {data.classes.find((c) => c.id === exam.classId)?.name}
                    </small>
                  </div>
                  <div className="report-row-actions">
                    {exam.status === "published" && (
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => viewReport(s.id)}
                      >
                        View report card
                      </button>
                    )}
                    {manager && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => viewHistory(s.id)}
                      >
                        View report history
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!roster.length && <Empty>No accessible student reports.</Empty>}
            </section>
          )}
        </>
      )}
      {report && (
        <ReportCard
          logo={data.schoolSettings?.logoDataUri}
          download={async (r) => {
            try {
              const file = await api(
                `/schools/${schoolId}/reports/${r.examId}/${r.studentId}/pdf?version=${r.version}`,
              );
              const bytes = Uint8Array.from(atob(file.base64), (c) =>
                c.charCodeAt(0),
              );
              const url = URL.createObjectURL(
                new Blob([bytes], { type: "application/pdf" }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = file.filename;
              link.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              setError(e.message);
            }
          }}
          report={report}
          history={history}
          select={setReport}
          close={() => setReport(null)}
        />
      )}{" "}
      {reopen && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reopen-title"
          >
            <div className="panel-heading">
              <h2 id="reopen-title">Reopen published results</h2>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setReopen(false)}
              >
                <X />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action(`/exams/${exam.id}/reopen`, { reason });
              }}
            >
              <p className="recovery-help">
                Students will temporarily lose access to these results. Existing
                report snapshots remain archived, and republishing creates a new
                version.
              </p>
              <Field label="Reason for correction">
                <textarea
                  aria-label="Reason for correction"
                  required
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              {error && <div className="alert">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setReopen(false)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  Reopen exam
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function ReportCard({
  report: r,
  close,
  history = [],
  select,
  download,
  logo,
}) {
  return (
    <div className="modal-backdrop report-backdrop">
      <section
        className="modal report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <div className="report-actions">
          <button className="primary" onClick={() => download(r)}>
            Download PDF
          </button>
          {history.length > 0 && (
            <select
              aria-label="Report version"
              value={r.id}
              onChange={(e) =>
                select(history.find((item) => item.id === e.target.value))
              }
            >
              {history.map((item) => (
                <option value={item.id} key={item.id}>
                  Version {item.version} ·{" "}
                  {item.archived ? "Archived" : "Current"}
                </option>
              ))}
            </select>
          )}
          <button className="secondary" onClick={() => window.print()}>
            <Printer size={15} />
            Print / save PDF
          </button>
          <button
            className="icon-button"
            aria-label="Close report card"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <article className="report-document">
          <header className="report-header">
            {r.archived && (
              <div className="badge warning">
                Archived version · superseded or currently withdrawn
              </div>
            )}
            <span className="report-emblem">
              {r.schoolLogo || logo ? (
                <img
                  src={r.schoolLogo || logo}
                  width="64"
                  height="64"
                  alt="School logo"
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <GraduationCap size={35} />
              )}
            </span>
            <h2 id="report-title">{r.schoolName}</h2>
            <p>{r.schoolCity}</p>
            <span className="label">STUDENT REPORT CARD</span>
          </header>
          <div className="report-identity">
            <div>
              <small>STUDENT</small>
              <strong>{r.studentName}</strong>
            </div>
            <div>
              <small>CLASS</small>
              <strong>{r.className}</strong>
            </div>
            <div>
              <small>ACADEMIC YEAR</small>
              <strong>{r.academicYear}</strong>
            </div>
            <div>
              <small>EXAM</small>
              <strong>{r.examName}</strong>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Percentage</th>
                  <th>Weight</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {r.rows.map((s) => (
                  <tr key={s.subjectId}>
                    <td>{s.name}</td>
                    <td>
                      {s.score} / {s.maxScore}
                    </td>
                    <td>{s.percent.toFixed(2)}%</td>
                    <td>{s.weight}</td>
                    <td>{s.passed ? "Pass" : "Below threshold"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="report-totals">
            <div>
              <small>TOTAL MARKS</small>
              <strong>
                {r.totalScore} / {r.totalMax}
              </strong>
            </div>
            <div>
              <small>WEIGHTED PERCENTAGE</small>
              <strong>{r.percentage.toFixed(2)}%</strong>
            </div>
            <div>
              <small>GRADE</small>
              <strong>{r.grade}</strong>
            </div>
            <div>
              <small>OUTCOME</small>
              <strong>{r.passed ? "Pass" : "Needs improvement"}</strong>
            </div>
          </div>
          <p className="report-note">
            Overall percentage uses the configured subject weights. Each subject
            must meet its own pass threshold.
          </p>
          <footer className="report-footer">
            <div>
              Published by {r.publishedBy}
              <br />
              {new Date(r.publishedAt).toLocaleDateString("en-IN")} · Version{" "}
              {r.version}
            </div>
            <div>
              Report reference
              <br />
              {r.id}
            </div>
          </footer>
        </article>
      </section>
    </div>
  );
}
