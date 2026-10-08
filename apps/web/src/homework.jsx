import React, { useState } from "react";
import { X } from "./glyphs.jsx";
export function Homework({
  resource,
  submissions,
  user,
  api,
  schoolId,
  refresh,
  download,
}) {
  const [open, setOpen] = useState(false),
    [attachment, setAttachment] = useState(null),
    [answer, setAnswer] = useState(""),
    [review, setReview] = useState(null),
    [feedback, setFeedback] = useState(""),
    [status, setStatus] = useState("reviewed"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const rows = submissions
    .filter((s) => s.resourceId === resource.id)
    .sort((a, b) => b.version - a.version);
  const student = user.role === "student",
    teacher = ["teacher", "director", "admin", "principal"].includes(user.role);
  if (!student && !teacher) return null;
  const latest = rows[0];
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let attachmentId = null;
      if (student && attachment) {
        const body = new FormData();
        body.append("file", attachment);
        attachmentId = (
          await api(
            `/schools/${schoolId}/homework/${resource.id}/attachment`,
            body,
          )
        ).attachmentId;
      }
      await api(
        student
          ? `/schools/${schoolId}/homework/${resource.id}/submit`
          : `/schools/${schoolId}/homework/submissions/${review.id}/review`,
        student ? { answer, attachmentId } : { feedback, status },
      );
      setAnswer("");
      setAttachment(null);
      setReview(null);
      setFeedback("");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="secondary homework-button"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        {student
          ? latest
            ? "View submission / feedback"
            : "Submit homework"
          : `Review submissions (${new Set(rows.map((s) => s.studentId)).size})`}
      </button>
      {open && (
        <div className="modal-backdrop">
          <section
            className="modal homework-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`homework-${resource.id}`}
          >
            <div className="panel-heading">
              <h2 id={`homework-${resource.id}`}>{resource.title}</h2>
              <button
                className="icon-button"
                aria-label="Close homework dialog"
                onClick={() => {
                  setOpen(false);
                  setReview(null);
                }}
              >
                <X />
              </button>
            </div>
            <div className="homework-body">
              <p>{resource.description}</p>
              {resource.dueDate && (
                <p>
                  Due {resource.dueDate} · end of day UTC. Late submissions are
                  recorded.
                </p>
              )}
              {!rows.length && <p>No submissions yet.</p>}
              {rows.map((s) => (
                <article className="submission-card" key={s.id}>
                  <h3>
                    {student ? "Your submission" : s.studentName} · Version{" "}
                    {s.version}
                  </h3>
                  <small>
                    {new Date(s.submittedAt).toLocaleString()} · {s.status}{" "}
                    {s.late ? " · Late" : ""}
                  </small>
                  <p className="answer-text">{s.answer}</p>
                  {s.attachmentId && (
                    <button
                      className="secondary"
                      onClick={() =>
                        download({
                          fileId: s.attachmentId,
                          fileName: s.attachmentName,
                        })
                      }
                    >
                      Download private attachment
                    </button>
                  )}
                  {s.reviews.map((r) => (
                    <div className="teacher-feedback" key={r.id}>
                      <strong>
                        {r.teacherName} · {r.status}
                      </strong>
                      <p>{r.feedback}</p>
                      <small>{new Date(r.reviewedAt).toLocaleString()}</small>
                    </div>
                  ))}
                  {teacher &&
                    !rows.some(
                      (r) =>
                        r.studentId === s.studentId && r.version > s.version,
                    ) && (
                      <button
                        className="secondary"
                        onClick={() => {
                          setReview(s);
                          setFeedback("");
                          setStatus("reviewed");
                        }}
                      >
                        Give feedback
                      </button>
                    )}
                </article>
              ))}
            </div>
            {((student && latest?.status !== "reviewed") ||
              (teacher && review)) && (
              <form onSubmit={save}>
                {student ? (
                  <>
                    <label>
                      Your answer
                      <textarea
                        aria-label="Homework answer"
                        required
                        maxLength={10000}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    </label>
                    <label>
                      Private attachment (optional, PDF/PNG/JPEG, 5 MB)
                      <input
                        aria-label="Homework attachment"
                        type="file"
                        disabled={data.capabilities?.uploads === false}
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) =>
                          setAttachment(e.target.files[0] || null)
                        }
                      />
                    </label>
                    <p>
                      Uploads require the school's configured malware scanner
                      and available storage quota.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Reviewing {review.studentName} · Version {review.version}
                    </p>
                    <label>
                      Feedback
                      <textarea
                        aria-label="Homework feedback"
                        required
                        maxLength={5000}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </label>
                    <label>
                      Review outcome
                      <select
                        aria-label="Review outcome"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="reviewed">Reviewed</option>
                        <option value="revision-requested">
                          Request revision
                        </option>
                      </select>
                    </label>
                  </>
                )}
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : student
                      ? "Submit answer"
                      : "Save feedback"}
                </button>
              </form>
            )}
            {student && latest?.status === "reviewed" && (
              <p className="homework-body">
                This work has been reviewed. Your teacher can request a
                revision.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
