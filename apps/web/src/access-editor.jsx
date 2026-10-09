import React, { useState } from "react";
import { X } from "./glyphs.jsx";
export function AccessEditor({
  target,
  owner,
  schools,
  classes,
  api,
  close,
  refresh,
}) {
  const [form, setForm] = useState({
      role: target.role,
      schoolIds: target.schoolIds,
      classIds: target.classIds,
      orgId: target.orgId || "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const orgIds = [...new Set(schools.map((s) => s.orgId || ""))];
  const allowedClasses = classes.filter((c) =>
    form.schoolIds.includes(c.schoolId),
  );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/users/${target.id}/access`, form);
      close();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-title"
      >
        <div className="panel-heading">
          <h2 id="access-title">Edit account access</h2>
          <button
            className="icon-button"
            aria-label="Close access dialog"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form onSubmit={save}>
          <p>
            {target.name} · Changes sign this account out on all devices.
            Academic history and teaching assignments can prevent removal.
          </p>
          <label>
            Role
            <select
              aria-label="Access role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {(owner
                ? [
                    "director",
                    "admin",
                    "principal",
                    "teacher",
                    "student",
                    "staff",
                    "parent",
                  ]
                : ["teacher", "student", "staff", "parent"]
              ).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {owner && (
            <label>
              School grouping
              <select
                aria-label="School grouping"
                value={form.orgId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    orgId: e.target.value,
                    schoolIds: [],
                    classIds: [],
                  })
                }
              >
                {orgIds.map((org) => (
                  <option value={org} key={org}>
                    {org
                      ? schools
                          .filter((s) => s.orgId === org)
                          .map((s) => s.name)
                          .join(" / ")
                      : "Independent schools"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset>
            <legend>Schools</legend>
            {schools
              .filter((s) => (s.orgId || "") === form.orgId)
              .map((s) => (
                <label className="checkbox" key={s.id}>
                  <input
                    type="checkbox"
                    checked={form.schoolIds.includes(s.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        schoolIds: e.target.checked
                          ? form.orgId
                            ? [...form.schoolIds, s.id]
                            : [s.id]
                          : form.schoolIds.filter((id) => id !== s.id),
                        classIds: [],
                      })
                    }
                  />
                  {s.name}
                </label>
              ))}
          </fieldset>
          <fieldset>
            <legend>Class assignments</legend>
            {allowedClasses.map((c) => (
              <label className="checkbox" key={c.id}>
                <input
                  type="checkbox"
                  checked={form.classIds.includes(c.id)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      classIds: e.target.checked
                        ? [...form.classIds, c.id]
                        : form.classIds.filter((id) => id !== c.id),
                    })
                  }
                />
                {c.name} · {schools.find((s) => s.id === c.schoolId)?.name}
              </label>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save access"}
          </button>
        </form>
      </section>
    </div>
  );
}
