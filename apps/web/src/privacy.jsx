import React, { useEffect, useState } from "react";
import "./privacy.css";

export function Privacy({ api, schoolId, manager, readOnly }) {
  const base = `/schools/${schoolId}/privacy`;
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState(""),
    [inventory, setInventory] = useState(null);
  async function load() {
    setData(await api(base));
  }
  useEffect(() => {
    setData(null);
    load().catch((e) => setError(e.message));
  }, [schoolId]);
  async function act(fn) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(e) {
    e.preventDefault();
    await act(async () => {
      const result = await api(base + "/export", { currentPassword: password });
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(result, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "school-personal-records.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Your personal records were downloaded. Keep this file private.",
      );
    });
    setPassword("");
  }
  async function request(e) {
    e.preventDefault();
    const form = e.currentTarget,
      fields = new FormData(form);
    await act(async () => {
      await api(base + "/requests", {
        type: fields.get("type"),
        details: fields.get("details"),
        requestKey: crypto.randomUUID(),
      });
      await load();
      form.reset();
      setMessage(
        "Request sent to school leadership. Track the response below or in Operations.",
      );
    });
  }
  async function policy(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await act(async () => {
      await api(base + "/policy", {
        contactEmail: f.get("contactEmail"),
        jurisdiction: f.get("jurisdiction"),
        notice: f.get("notice"),
        retention: f.get("retention"),
        approved: f.get("approved") === "on",
        version: data.settingsVersion,
      });
      await load();
      setMessage("School privacy notice published.");
    });
  }
  return (
    <section className="privacy-workspace" aria-label="School privacy">
      <div className="panel privacy-card">
        <h2>Privacy & personal records</h2>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {!data ? (
          <p>Loading privacy information…</p>
        ) : data.policy ? (
          <>
            <h3>School privacy notice</h3>
            <p className="privacy-copy">{data.policy.notice}</p>
            <h3>Retention rules</h3>
            <p className="privacy-copy">{data.policy.retention}</p>
            <p>Jurisdiction: {data.policy.jurisdiction}</p>
            <p>
              Privacy contact:{" "}
              <a href={`mailto:${data.policy.contactEmail}`}>
                {data.policy.contactEmail}
              </a>
            </p>
            <small>
              Version {data.policy.version} · Published{" "}
              {new Date(data.policy.publishedAt).toLocaleDateString()}
            </small>
          </>
        ) : (
          <p>
            Your school has not published a privacy notice yet. Contact school
            leadership before supplying real personal data.
          </p>
        )}
      </div>
      {!readOnly && (
        <div className="privacy-grid">
          <section className="panel privacy-card">
            <h3>Download my records</h3>
            <p>
              Confirm your password to download your account and selected
              personal records from this school. For attachments, linked-child
              records or a complete reviewed disclosure, submit an access
              request.
            </p>
            <form onSubmit={download}>
              <label>
                Confirm password for export
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={200}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="secondary" disabled={busy}>
                Download personal records
              </button>
            </form>
          </section>
          <section className="panel privacy-card">
            <h3>Request a review</h3>
            <p>
              School leadership reviews access, correction and deletion
              requests. Deletion needs a retention and legal-hold review;
              submitting or closing a request does not delete records.
            </p>
            <form onSubmit={request}>
              <label>
                Privacy request type
                <select name="type">
                  <option value="access">Access to records</option>
                  <option value="correction">Correct my records</option>
                  <option value="deletion">Review deletion</option>
                </select>
              </label>
              <label>
                Request details
                <textarea
                  name="details"
                  required
                  minLength={5}
                  maxLength={500}
                  rows={3}
                />
              </label>
              <button className="secondary" disabled={busy}>
                Send privacy request
              </button>
            </form>
          </section>
        </div>
      )}
      {data && (
        <section className="panel privacy-card">
          <h3>{manager ? "School privacy requests" : "My privacy requests"}</h3>
          {!data.requests.length && <p>No privacy requests yet.</p>}
          {data.requests.map((r) => (
            <article className="privacy-request" key={r.id}>
              <strong>
                {r.subject} · {r.status}
              </strong>
              {manager && <p>{r.requesterName}</p>}
              <p>{r.description}</p>
              {r.history.map((h, i) => (
                <p key={i}>
                  {h.status}: {h.reason}
                </p>
              ))}
            </article>
          ))}
          {manager && (
            <p>
              Review and update these tickets in Operations, recording the
              decision and any retention or legal-hold reason.
            </p>
          )}
        </section>
      )}
      {manager && data && !readOnly && (
        <section className="panel privacy-card">
          <h3>Publish school privacy notice</h3>
          <p>
            Use wording and retention rules approved for your school’s
            jurisdiction. A notice is not a consent record or legal
            certification.
          </p>
          <form key={data.settingsVersion} onSubmit={policy}>
            <div className="privacy-grid">
              <label>
                Operating jurisdiction
                <input
                  name="jurisdiction"
                  required
                  maxLength={120}
                  defaultValue={data.policy?.jurisdiction || ""}
                />
              </label>
              <label>
                Privacy contact email
                <input
                  name="contactEmail"
                  type="email"
                  required
                  maxLength={200}
                  defaultValue={data.policy?.contactEmail || ""}
                />
              </label>
            </div>
            <label>
              Privacy notice
              <textarea
                name="notice"
                required
                maxLength={6000}
                rows={5}
                defaultValue={data.policy?.notice || ""}
              />
            </label>
            <label>
              School retention rules
              <textarea
                name="retention"
                required
                maxLength={2000}
                rows={3}
                defaultValue={data.policy?.retention || ""}
              />
            </label>
            <label className="privacy-check">
              <input name="approved" type="checkbox" required />
              Our school has reviewed and approved this notice and retention
              policy.
            </label>
            <button className="primary" disabled={busy}>
              Publish privacy notice
            </button>
          </form>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              act(async () => setInventory(await api(base + "/inventory")))
            }
          >
            Review retained record counts
          </button>
          {inventory && (
            <>
              <p>{inventory.note}</p>
              <div className="privacy-inventory">
                {inventory.counts.map((r) => (
                  <span key={r.collection}>
                    {r.collection}: <strong>{r.count}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}
