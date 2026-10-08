import React, { useState, useEffect } from "react";
export function Security({ api, required, onChanged, logout }) {
  const [sessions, setSessions] = useState([]),
    [sessionMessage, setSessionMessage] = useState("");
  async function loadSessions() {
    try {
      setSessions((await api("/auth/sessions")).sessions);
    } catch (e) {
      setSessionMessage(e.message);
    }
  }
  useEffect(() => {
    if (!required) loadSessions();
  }, []);
  async function revokeOthers() {
    try {
      const r = await api("/auth/revoke-others", {});
      setSessionMessage(`${r.count} other sessions signed out`);
      await loadSessions();
    } catch (e) {
      setSessionMessage(e.message);
    }
  }
  const [currentPassword, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords must match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/auth/change-password", { currentPassword, password });
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={required ? "password-gate" : "panel security-panel"}>
      <h2>{required ? "Choose your personal password" : "Account security"}</h2>
      <p>
        {required
          ? "Your administrator provided a temporary password. Replace it before opening your workspace."
          : "Changing your password signs out all devices and invalidates recovery links."}
      </p>
      <form onSubmit={submit}>
        <label>
          {required ? "Temporary password" : "Current password"}
          <input
            aria-label="Current password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            aria-label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={200}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Confirm new password
          <input
            aria-label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={200}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Updating…" : "Change password"}
        </button>
        {required && (
          <button className="secondary" type="button" onClick={logout}>
            Sign out
          </button>
        )}
      </form>
      {!required && (
        <div className="session-list">
          <h3>Active sign-ins</h3>
          {sessions.map((s) => (
            <article key={s.id}>
              <strong>{s.current ? "This session" : "Another session"}</strong>
              <p>{s.device}</p>
              <small>Expires {new Date(s.expires).toLocaleString()}</small>
            </article>
          ))}
          <button type="button" className="secondary" onClick={revokeOthers}>
            Sign out other sessions
          </button>
          {sessionMessage && <p role="status">{sessionMessage}</p>}
        </div>
      )}
    </section>
  );
}
