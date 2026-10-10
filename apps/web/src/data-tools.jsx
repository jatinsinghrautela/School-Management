import React, { useEffect, useState } from "react";
export function downloadGenerated(file) {
  const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes]));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  link.click();
  URL.revokeObjectURL(url);
}
export function DataTools({ kind, api, schoolId, refresh, manager }) {
  const [file, setFile] = useState(null),
    [credentials, setCredentials] = useState(null),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setCredentials(null);
    setPreview(null);
    setFile(null);
  }, [schoolId]);
  async function action(path, body) {
    setBusy(true);
    setError("");
    try {
      return await api(`/schools/${schoolId}${path}`, body);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel record-grid">
      <div className="panel-heading">
        <div>
          <h3>
            {kind === "directory"
              ? "People import and export"
              : kind === "results"
                ? "Results export"
                : "Attendance export"}
          </h3>
          <p>Exports respect your school, class and account permissions.</p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            const r = await action(`/exports/${kind}`);
            if (r) downloadGenerated(r);
          }}
        >
          Download Excel
        </button>
      </div>
      {error && (
        <div className="alert" role="status">
          {error}
        </div>
      )}
      {kind === "directory" && manager && (
        <details className="calendar-form">
          <summary>Import teachers, students or staff</summary>
          <p>
            Download the template, use the Class choices from its Classes sheet,
            then upload and review. Each imported user receives a unique
            temporary password and must change it on first login. Download the
            credentials after importing and share each user's credentials
            privately.
          </p>
          {credentials && (
            <div className="success" role="status">
              <p>
                Accounts created. Save the credentials before leaving this page;
                passwords are not saved for later download. If lost, use account
                recovery.
              </p>
              <button
                className="secondary"
                onClick={() => downloadGenerated(credentials)}
              >
                Download login credentials
              </button>
              <button
                className="text-button"
                onClick={() => setCredentials(null)}
              >
                Dismiss credentials
              </button>
            </div>
          )}
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              const r = await action("/people-import/template");
              if (r) downloadGenerated(r);
            }}
          >
            Download people template
          </button>
          <label>
            Completed workbook
            <input
              aria-label="People import workbook"
              type="file"
              accept=".xlsx"
              onChange={(e) => {
                setFile(e.target.files[0] || null);
                setPreview(null);
              }}
            />
          </label>
          <button
            className="primary"
            disabled={busy || !file}
            onClick={async () => {
              const body = new FormData();
              body.append("file", file);
              setPreview(
                (await action("/people-import/preview", body)) || null,
              );
            }}
          >
            Upload and preview users
          </button>
          {preview && (
            <>
              <p>
                {preview.entries.length} users. Review before creating accounts;
                this preview expires in 15 minutes.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.entries.map((e) => (
                      <tr key={e.email}>
                        <td>{e.name}</td>
                        <td>{e.email}</td>
                        <td>{e.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={async () => {
                  const r = await action("/people-import/apply", {
                    previewId: preview.previewId,
                  });
                  if (r) {
                    setCredentials(r.credentials);
                    setPreview(null);
                    setFile(null);
                    setError("");
                    await refresh();
                  }
                }}
              >
                Create reviewed accounts
              </button>
              <button className="secondary" onClick={() => setPreview(null)}>
                Discard preview
              </button>
            </>
          )}
        </details>
      )}
    </section>
  );
}
