import React, { useState, useEffect } from "react";
export function PlatformRecords({ api, platform, refresh }) {
  const [edit, setEdit] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/platform/${edit.kind}/${edit.id}/edit`, edit);
      setEdit(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel record-grid">
      <div className="panel-heading">
        <h3>Edit or archive schools and organizations</h3>
      </div>
      <div className="fees-body">
        <p>
          Archiving removes access while retaining historical records. Archive
          an organization's schools first. Restore a school to grant access
          again.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {["schools", "organizations"].map((kind) => (
          <div key={kind}>
            <h4>{kind === "schools" ? "Schools" : "Organizations"}</h4>
            {platform?.[kind]?.map((r) => (
              <div key={r.id} className="panel-heading">
                <span>
                  {r.name} {r.active === false ? "(archived)" : ""}
                </span>
                <button
                  className="secondary"
                  onClick={() =>
                    setEdit({ ...r, kind, active: r.active !== false })
                  }
                >
                  Edit / archive
                </button>
              </div>
            ))}
          </div>
        ))}
        {edit && (
          <form onSubmit={save} className="calendar-form">
            <h4>Edit {edit.name}</h4>
            {["name", ...(edit.kind === "schools" ? ["city", "code"] : [])].map(
              (k) => (
                <label key={k}>
                  {k}
                  <input
                    required
                    value={edit[k]}
                    maxLength={k === "code" ? 40 : 200}
                    onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                  />
                </label>
              ),
            )}
            <label>
              <input
                type="checkbox"
                checked={edit.active}
                onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
              />
              Active (uncheck to archive)
            </label>
            <button disabled={busy} className="primary">
              Save
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEdit(null)}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
export function GuardianRecords({ api, schoolId }) {
  const [rows, setRows] = useState([]),
    [edit, setEdit] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await api(`/schools/${schoolId}/guardian-records`);
    setRows(r.guardians);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [schoolId]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/schools/${schoolId}/guardian-records/${edit.id}`, edit);
      setEdit(null);
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
        <h3>Guardian contact records</h3>
      </div>
      <div className="fees-body">
        <p>
          Archiving removes active student/parent links without deleting
          records. Parent login profiles are edited through People.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {rows.map((g) => (
          <div className="panel-heading" key={g.id}>
            <span>
              {g.name} · {g.relationship}{" "}
              {g.active === false ? "(archived)" : ""}
            </span>
            <button
              className="secondary"
              onClick={() => setEdit({ ...g, active: g.active !== false })}
            >
              Edit / archive
            </button>
          </div>
        ))}
        {edit && (
          <form className="calendar-form" onSubmit={save}>
            {["name", "relationship", "email", "phone"].map((k) => (
              <label key={k}>
                {k}
                <input
                  required={["name", "relationship"].includes(k)}
                  value={edit[k] || ""}
                  onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                />
              </label>
            ))}
            <label>
              <input
                type="checkbox"
                checked={edit.active}
                onChange={(e) => setEdit({ ...edit, active: e.target.checked })}
              />
              Active contact
            </label>
            <button disabled={busy} className="primary">
              Save guardian
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEdit(null)}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
