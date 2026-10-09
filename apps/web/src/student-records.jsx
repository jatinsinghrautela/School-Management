import React, { useEffect, useState } from "react";
export function StudentRecords({
  api,
  schoolId,
  classes,
  manager,
  readOnly,
  refresh,
}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [tab, setTab] = useState("records"),
    [decisions, setDecisions] = useState({});
  async function load() {
    const r = await api(`/schools/${schoolId}/student-records`);
    setData(r);
    setSelected((old) =>
      r.students.some((s) => s.id === old) ? old : r.students[0]?.id || "",
    );
  }
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api(`/schools/${schoolId}/student-records`)
      .then((r) => {
        if (active) {
          setData(r);
          setSelected(r.students[0]?.id || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);
  async function action(path, body) {
    setBusy(true);
    setError("");
    try {
      await api(`/schools/${schoolId}${path}`, body);
      await load();
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const profile = data?.profiles.find((p) => p.studentId === selected),
    student = data?.students.find((s) => s.id === selected);
  const guardians =
    data?.guardianLinks
      .filter((l) => l.studentId === selected)
      .map((l) => data.guardians.find((g) => g.id === l.guardianId))
      .filter(Boolean) || [];
  const writable = manager && !readOnly;
  return (
    <section className="panel record-grid student-records">
      <div className="panel-heading">
        <div>
          <h3>Admissions and student records</h3>
          <p>
            Reviewed admissions, private guardian contacts and retained
            enrollment history.
          </p>
        </div>
      </div>
      {error && (
        <div className="alert" role="status">
          {error}
        </div>
      )}
      {manager && (
        <div className="register-actions">
          <button
            className={tab === "records" ? "primary" : "secondary"}
            onClick={() => setTab("records")}
          >
            Student records
          </button>
          <button
            className={tab === "admissions" ? "primary" : "secondary"}
            onClick={() => setTab("admissions")}
          >
            Admissions
          </button>
        </div>
      )}
      {!data ? (
        <p>Loading student records…</p>
      ) : tab === "records" ? (
        <>
          <label>
            Student
            <select
              aria-label="Student record"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {student ? (
            <>
              <dl>
                <dt>Admission number</dt>
                <dd>{profile?.admissionNumber || "Not recorded"}</dd>
                <dt>Birth date</dt>
                <dd>{profile?.birthDate || "Not recorded"}</dd>
                <dt>Address</dt>
                <dd>{profile?.address || "Not recorded"}</dd>
              </dl>
              <h4>Guardian contacts</h4>
              {guardians.length ? (
                guardians.map((g) => (
                  <p key={g.id}>
                    {g.name} · {g.relationship}
                    <br />
                    {g.phone} {g.email}
                  </p>
                ))
              ) : (
                <p>No guardian contacts recorded.</p>
              )}
              {writable && (
                <details className="calendar-form">
                  <summary>Edit student profile</summary>
                  <ProfileForm
                    key={selected + ":" + (profile?.updatedAt || "")}
                    initial={profile}
                    guardians={guardians}
                    busy={busy}
                    submit={(body) =>
                      action(`/students/${selected}/profile`, body)
                    }
                  />
                  <p>
                    Saving replaces the active guardian contacts. Previous links
                    are retained for audit history.
                  </p>
                </details>
              )}
              <h4>Enrollment history</h4>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Dates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.enrollments
                      .filter((e) => e.studentId === selected)
                      .map((e) => (
                        <tr key={e.id}>
                          <td>
                            {classes.find((c) => c.id === e.classId)?.name ||
                              e.className ||
                              "Past class"}
                          </td>
                          <td>{e.status}</td>
                          <td>
                            {e.startedOn || "Earlier enrollment"} →{" "}
                            {e.endedOn || "Current"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>No student accounts yet.</p>
          )}
        </>
      ) : (
        <>
          {writable && (
            <details className="calendar-form">
              <summary>Create admission application</summary>
              <AdmissionForm
                classes={classes}
                busy={busy}
                submit={(body) => action("/admissions", body)}
              />
            </details>
          )}
          <p>
            Admitted accounts need activation through People → Recover account.
            Applications are created by school management; there is no public
            signup.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Student / class</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {[...data.admissions].reverse().map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.applicationNumber}
                      <details>
                        <summary>Decision history</summary>
                        {a.history.map((h, i) => (
                          <p key={i}>
                            {h.status} · {h.at.slice(0, 10)} {h.reason}
                          </p>
                        ))}
                      </details>
                    </td>
                    <td>
                      {a.studentName}
                      <br />
                      {classes.find((c) => c.id === a.classId)?.name ||
                        a.className}
                    </td>
                    <td>{a.status}</td>
                    <td>
                      {writable &&
                      ["submitted", "reviewing"].includes(a.status) ? (
                        <>
                          <label>
                            Decision reason
                            <textarea
                              aria-label={`Decision reason for ${a.studentName}`}
                              maxLength={500}
                              value={decisions[a.id] || ""}
                              onChange={(e) =>
                                setDecisions({
                                  ...decisions,
                                  [a.id]: e.target.value,
                                })
                              }
                            />
                          </label>
                          <div className="register-actions">
                            {(a.status === "submitted"
                              ? ["reviewing", "rejected", "withdrawn"]
                              : ["admitted", "rejected", "withdrawn"]
                            ).map((status) => (
                              <button
                                key={status}
                                className="secondary"
                                disabled={
                                  busy ||
                                  (decisions[a.id] || "").trim().length < 5
                                }
                                onClick={() =>
                                  action(`/admissions/${a.id}/decision`, {
                                    status,
                                    reason: decisions[a.id],
                                  })
                                }
                              >
                                {status === "reviewing"
                                  ? "Start review"
                                  : status === "admitted"
                                    ? "Admit student"
                                    : status === "rejected"
                                      ? "Reject"
                                      : "Withdraw"}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        "Finalized"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.admissions.length && <p>No applications yet.</p>}
        </>
      )}
    </section>
  );
}
function ProfileForm({ initial, guardians = [], busy, submit, children }) {
  const [g, setG] = useState(guardians.length > 0),
    [count, setCount] = useState(Math.max(1, guardians.length));
  async function save(e) {
    e.preventDefault();
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    const contacts = g
      ? Array.from({ length: count }, (_, i) => ({
          name: values[`guardianName${i}`],
          relationship: values[`relationship${i}`],
          email: values[`guardianEmail${i}`] || "",
          phone: values[`guardianPhone${i}`] || "",
        }))
      : [];
    const body = {
      ...values,
      guardianConsent: values.guardianConsent === "on",
      guardians: contacts,
    };
    if (await submit(body)) {
      if (!initial) {
        form.reset();
        setG(false);
        setCount(1);
      }
    }
  }
  return (
    <form className="calendar-form" onSubmit={save}>
      {children}
      <label>
        Admission number
        <input
          name="admissionNumber"
          defaultValue={initial?.admissionNumber || ""}
          maxLength={60}
        />
      </label>
      <label>
        Birth date
        <input
          name="birthDate"
          type="date"
          defaultValue={initial?.birthDate || ""}
        />
      </label>
      <label>
        Address
        <textarea
          name="address"
          maxLength={500}
          defaultValue={initial?.address || ""}
        />
      </label>
      <label className="check-option">
        <input
          type="checkbox"
          checked={g}
          onChange={(e) => setG(e.target.checked)}
        />
        Record guardian contact
      </label>
      {g && (
        <>
          {Array.from({ length: count }, (_, i) => {
            const guardian = guardians[i];
            return (
              <fieldset key={i}>
                <legend>Guardian {i + 1}</legend>
                <label>
                  Guardian name
                  <input
                    name={`guardianName${i}`}
                    defaultValue={guardian?.name || ""}
                    maxLength={200}
                    required
                  />
                </label>
                <label>
                  Relationship
                  <input
                    name={`relationship${i}`}
                    defaultValue={guardian?.relationship || ""}
                    maxLength={60}
                    required
                  />
                </label>
                <label>
                  Guardian phone
                  <input
                    name={`guardianPhone${i}`}
                    defaultValue={guardian?.phone || ""}
                    maxLength={40}
                  />
                </label>
                <label>
                  Guardian email
                  <input
                    name={`guardianEmail${i}`}
                    type="email"
                    defaultValue={guardian?.email || ""}
                    maxLength={200}
                  />
                </label>
              </fieldset>
            );
          })}
          <div className="register-actions">
            <button
              type="button"
              className="secondary"
              disabled={count >= 3}
              onClick={() => setCount(count + 1)}
            >
              Add guardian
            </button>
            <button
              type="button"
              className="secondary"
              disabled={count <= 1}
              onClick={() => setCount(count - 1)}
            >
              Remove last guardian
            </button>
          </div>
          <label className="check-option">
            <input name="guardianConsent" type="checkbox" required />I have
            authorization to store and share this contact with the linked
            student.
          </label>
        </>
      )}
      <button className="primary" disabled={busy}>
        {children ? "Submit application" : "Save student profile"}
      </button>
    </form>
  );
}
function AdmissionForm({ classes, busy, submit }) {
  return (
    <ProfileForm busy={busy} submit={submit}>
      <label>
        Student name
        <input name="studentName" maxLength={200} required />
      </label>
      <label>
        Student login email
        <input name="loginEmail" type="email" maxLength={200} required />
      </label>
      <label>
        Admission class
        <select name="classId" aria-label="Admission class" required>
          <option value="">Choose class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </ProfileForm>
  );
}
