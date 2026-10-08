import React, { useState } from "react";

export function AttendanceCorrections({
  data,
  api,
  schoolId,
  refresh,
  manager,
  userId,
}) {
  const [recordId, setRecordId] = useState(""),
    [status, setStatus] = useState("present"),
    [reason, setReason] = useState(""),
    [reviewId, setReviewId] = useState(""),
    [decision, setDecision] = useState("approved"),
    [reviewReason, setReviewReason] = useState(""),
    [filter, setFilter] = useState("pending"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const requests = data.attendanceCorrections || [],
    records = data.attendance || [];
  const selected = records.find((r) => r.id === recordId);
  const review = requests.find(
    (r) => r.id === reviewId && r.status === "pending",
  );
  const student = (id) =>
    data.users.find((u) => u.id === id)?.name || "Student";
  const className = (id) =>
    data.classes.find((c) => c.id === id)?.name || "Class";
  const sessionName = (id) =>
    data.attendanceSessions?.find((s) => s.id === id)?.name || "Daily";
  async function submit(e, reviewing = false) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      if (reviewing) {
        await api(
          `/schools/${schoolId}/attendance-corrections/${reviewId}/review`,
          { decision, reason: reviewReason },
        );
        setReviewId("");
        setReviewReason("");
        setMessage(`Correction ${decision}.`);
      } else {
        await api(`/schools/${schoolId}/attendance-corrections`, {
          attendanceId: recordId,
          requestedStatus: status,
          reason,
        });
        setRecordId("");
        setReason("");
        setFilter("pending");
        setMessage(
          "Correction requested. Attendance stays unchanged until leadership approves.",
        );
      }
      await refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel record-grid attendance-corrections">
      <div className="panel-heading">
        <div>
          <h3>Attendance corrections</h3>
          <p>
            Saved statuses need leadership approval to change. Every request and
            decision retains its reason.
          </p>
        </div>
      </div>
      <form onSubmit={(e) => submit(e)}>
        <div className="register-controls">
          <label>
            Saved record
            <select
              aria-label="Correction attendance record"
              value={recordId}
              required
              disabled={busy}
              onChange={(e) => setRecordId(e.target.value)}
            >
              <option value="">Choose a saved record</option>
              {[...records]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                    disabled={
                      r.excludedFromAttendance ||
                      requests.some(
                        (q) =>
                          q.attendanceId === r.id && q.status === "pending",
                      )
                    }
                  >
                    {r.date} · {sessionName(r.sessionId)} ·{" "}
                    {student(r.studentId)} · {className(r.classId)} · {r.status}
                    {r.excludedFromAttendance ? " · holiday" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Requested status
            <select
              aria-label="Correction requested status"
              value={status}
              required
              disabled={busy}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["present", "absent", "late", "excused"].map((s) => (
                <option key={s} value={s} disabled={selected?.status === s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="correction-note">
          Correction reason
          <textarea
            aria-label="Correction reason"
            value={reason}
            minLength={5}
            maxLength={500}
            required
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <div className="register-footer">
          <button
            className="primary"
            disabled={
              busy ||
              !selected ||
              selected.excludedFromAttendance ||
              selected.status === status
            }
          >
            Request correction
          </button>
        </div>
      </form>
      {message && (
        <div className={failed ? "alert" : "success"} role="status">
          {message}
        </div>
      )}
      <div className="register-controls">
        <label>
          Requests to show
          <select
            aria-label="Correction request filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="all">All requests</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student / date</th>
              <th>Change</th>
              <th>Reason</th>
              <th>Decision</th>
              {manager && <th>Review</th>}
            </tr>
          </thead>
          <tbody>
            {requests
              .filter((r) => filter === "all" || r.status === filter)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((r) => (
                <tr key={r.id}>
                  <td>
                    {student(r.studentId)}
                    <br />
                    <span className="correction-date">{r.date}</span>
                    <br />
                    {sessionName(r.sessionId)}
                    <br />
                    {className(r.classId)}
                  </td>
                  <td>
                    {r.beforeStatus} → {r.requestedStatus}
                  </td>
                  <td>
                    {r.reason}
                    <br />
                    <small>
                      Requested by {r.requesterName} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </small>
                  </td>
                  <td>
                    <span className="badge">{r.status}</span>
                    {r.reviewReason && (
                      <p>
                        {r.reviewReason}
                        <br />
                        <small>
                          {r.reviewerName} ·{" "}
                          {new Date(r.reviewedAt).toLocaleString()}
                        </small>
                      </p>
                    )}
                  </td>
                  {manager && (
                    <td>
                      {r.status === "pending" ? (
                        r.requestedBy === userId ? (
                          "Another leader must review"
                        ) : (
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy}
                            onClick={() => {
                              setReviewId(r.id);
                              setReviewReason("");
                              setDecision("approved");
                              setMessage("");
                            }}
                          >
                            Review request
                          </button>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!requests.some((r) => filter === "all" || r.status === filter) && (
        <p>No {filter === "all" ? "" : filter + " "}correction requests.</p>
      )}
      {manager && review && (
        <form onSubmit={(e) => submit(e, true)}>
          <h4>
            Review {student(review.studentId)} · {review.date}
          </h4>
          <p>
            {review.beforeStatus} → {review.requestedStatus}: {review.reason}
          </p>
          <div className="register-controls">
            <label>
              Decision
              <select
                aria-label="Correction review decision"
                value={decision}
                disabled={busy}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="approved">Approve correction</option>
                <option value="rejected">Reject request</option>
              </select>
            </label>
          </div>
          <label className="correction-note">
            Review reason
            <textarea
              aria-label="Correction review reason"
              required
              minLength={5}
              maxLength={500}
              disabled={busy}
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
            />
          </label>
          <div className="register-footer">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setReviewId("")}
            >
              Cancel review
            </button>
            <button className="primary" disabled={busy}>
              Submit decision
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
