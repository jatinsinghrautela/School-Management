import React, { useEffect, useState } from "react";
export function Staff({ api, schoolId, manager, userId, readOnly }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [personId, setPersonId] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [requestKey, setRequestKey] = useState(crypto.randomUUID()),
    [reasons, setReasons] = useState({});
  const writable = !readOnly;
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    setMessage("");
    setPersonId("");
    setQuery("");
    setPage(1);
    setStatus("all");
    setReasons({});
    setRequestKey(crypto.randomUUID());
    api(`/schools/${schoolId}/staff-workspace`)
      .then((r) => {
        if (active) {
          setData(r);
          setPersonId(r.people[0]?.id || "");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);
  async function act(path, body) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const row = await api(`/schools/${schoolId}${path}`, body);
      setData(await api(`/schools/${schoolId}/staff-workspace`));
      setMessage("Staff workspace updated.");
      return row;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e, type) {
    e.preventDefault();
    const form = e.currentTarget,
      body = Object.fromEntries(new FormData(form));
    if (type === "leave") body.requestKey = requestKey;
    if (
      await act(
        type === "leave" ? "/leave-requests" : `/staff-profiles/${personId}`,
        body,
      )
    ) {
      if (type === "leave") {
        form.reset();
        setRequestKey(crypto.randomUUID());
      }
    }
  }
  const profile = data?.profiles.find((p) => p.userId === personId),
    person = data?.people.find((p) => p.id === personId);
  const rows =
    data?.requests.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        `${r.employeeName} ${r.type} ${r.startDate} ${r.endDate}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  const pages = Math.max(1, Math.ceil(rows.length / 15)),
    currentPage = Math.min(page, pages);
  return (
    <div className="staff-workspace">
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Staff profiles & leave</h2>
            <p>Private employment details and reasoned leave decisions.</p>
          </div>
        </div>
        <div className="staff-body">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          {!data ? (
            <p>Loading staff records…</p>
          ) : (
            <>
              <div className="fee-summary">
                <div>
                  <span>Employees visible</span>
                  <strong>{data.people.length}</strong>
                </div>
                <div>
                  <span>Pending requests</span>
                  <strong>
                    {data.requests.filter((r) => r.status === "pending").length}
                  </strong>
                </div>
                <div>
                  <span>Approved requests</span>
                  <strong>
                    {
                      data.requests.filter((r) => r.status === "approved")
                        .length
                    }
                  </strong>
                </div>
              </div>
              {readOnly && (
                <p>
                  Support session: employment records are available for viewing
                  only.
                </p>
              )}
              <label>
                Employee
                <select
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                >
                  {data.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.role}
                      {!p.active ? " · inactive" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <article className="staff-profile">
                <h3>{person?.name || "Employee profile"}</h3>
                {profile ? (
                  <dl>
                    <div>
                      <dt>Employee number</dt>
                      <dd>{profile.employeeNumber}</dd>
                    </div>
                    <div>
                      <dt>Job title</dt>
                      <dd>{profile.jobTitle}</dd>
                    </div>
                    <div>
                      <dt>Department</dt>
                      <dd>{profile.department}</dd>
                    </div>
                    <div>
                      <dt>Joining date</dt>
                      <dd>{profile.joinDate}</dd>
                    </div>
                  </dl>
                ) : (
                  <p>No employment profile has been added yet.</p>
                )}
                {manager && writable && person && (
                  <details>
                    <summary>
                      {profile
                        ? "Edit employment profile"
                        : "Add employment profile"}
                    </summary>
                    <form
                      key={`${personId}:${profile?.updatedAt || ""}`}
                      className="calendar-form"
                      onSubmit={(e) => submit(e, "profile")}
                    >
                      <label>
                        Employee number
                        <input
                          name="employeeNumber"
                          maxLength={120}
                          required
                          defaultValue={profile?.employeeNumber || ""}
                        />
                      </label>
                      <label>
                        Job title
                        <input
                          name="jobTitle"
                          maxLength={120}
                          required
                          defaultValue={profile?.jobTitle || ""}
                        />
                      </label>
                      <label>
                        Department
                        <input
                          name="department"
                          maxLength={120}
                          required
                          defaultValue={profile?.department || ""}
                        />
                      </label>
                      <label>
                        Joining date
                        <input
                          name="joinDate"
                          type="date"
                          required
                          defaultValue={profile?.joinDate || ""}
                        />
                      </label>
                      <button className="primary" disabled={busy}>
                        Save profile
                      </button>
                    </form>
                  </details>
                )}
              </article>
              {writable && (
                <details className="staff-profile">
                  <summary>Request leave for myself</summary>
                  <form
                    className="calendar-form"
                    onSubmit={(e) => submit(e, "leave")}
                  >
                    <label>
                      Start date
                      <input type="date" name="startDate" required />
                    </label>
                    <label>
                      End date
                      <input type="date" name="endDate" required />
                    </label>
                    <label>
                      Leave type
                      <select name="type">
                        <option value="personal">Personal</option>
                        <option value="sick">Sick</option>
                        <option value="annual">Annual</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label>
                      Reason
                      <textarea
                        name="reason"
                        minLength={5}
                        maxLength={500}
                        required
                        placeholder="Brief work-related explanation; avoid medical details."
                      />
                    </label>
                    <p>
                      Dates are inclusive. Leave does not automatically change
                      attendance, timetable assignments, or pay.
                    </p>
                    <button className="primary" disabled={busy}>
                      Submit leave request
                    </button>
                  </form>
                </details>
              )}
            </>
          )}
        </div>
      </section>
      {data && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>{manager ? "Leave review & history" : "My leave history"}</h2>
              <p>School leaders cannot approve their own requests.</p>
            </div>
          </div>
          <div className="staff-body">
            <div className="staff-filters">
              <label>
                Search
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Employee, type or date"
                />
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {["all", "pending", "approved", "rejected", "cancelled"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>
            {rows.length === 0 && <p>No matching leave requests.</p>}
            {rows.slice((currentPage - 1) * 15, currentPage * 15).map((r) => {
              const own = r.userId === userId,
                review = manager && !own && r.status === "pending",
                cancel =
                  (own && r.status === "pending") ||
                  (manager && !own && r.status === "approved");
              return (
                <article className="staff-request" key={r.id}>
                  <div className="staff-request-heading">
                    <div>
                      <h3>{r.employeeName}</h3>
                      <p>
                        {r.startDate} → {r.endDate} · {r.type}
                      </p>
                    </div>
                    <span className="badge">{r.status}</span>
                  </div>
                  <p className="staff-reason">{r.reason}</p>
                  {r.history.map((h, i) => (
                    <p className="staff-history" key={i}>
                      {h.to} by {h.actorName} ·{" "}
                      {new Date(h.at).toLocaleString()}
                      <br />
                      {h.reason}
                    </p>
                  ))}
                  {writable && (review || cancel) && (
                    <div className="staff-actions">
                      <label>
                        Decision reason
                        <textarea
                          value={reasons[r.id] || ""}
                          onChange={(e) =>
                            setReasons((old) => ({
                              ...old,
                              [r.id]: e.target.value,
                            }))
                          }
                          minLength={5}
                          maxLength={500}
                        />
                      </label>
                      <div className="staff-action-buttons">
                        {(review
                          ? ["approved", "rejected"]
                          : ["cancelled"]
                        ).map((decision) => (
                          <button
                            key={decision}
                            className={
                              decision === "approved" ? "primary" : "secondary"
                            }
                            disabled={
                              busy || (reasons[r.id] || "").trim().length < 5
                            }
                            onClick={() =>
                              act(`/leave-requests/${r.id}/decision`, {
                                decision,
                                reason: reasons[r.id],
                              })
                            }
                          >
                            {decision === "approved"
                              ? "Approve"
                              : decision === "rejected"
                                ? "Reject"
                                : "Cancel leave"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            <div className="fee-pagination">
              <span>
                {rows.length} requests · Page {currentPage} of {pages}
              </span>
              <button
                className="secondary"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <button
                className="secondary"
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
