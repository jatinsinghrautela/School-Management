import React, { useState, useEffect } from "react";
const saturdayChoices = [
  ["none", "No Saturdays off"],
  ["all", "All Saturdays off"],
  ["second-fourth", "2nd and 4th Saturdays off"],
  ["second", "Only 2nd Saturdays off"],
  ["fourth", "Only 4th Saturdays off"],
];
export function CalendarExcel({ schoolId, api, refresh }) {
  const [prefs, setPrefs] = useState({
      year: new Date().getFullYear(),
      sundayOff: true,
      saturdayOff: "none",
      publicHolidays: true,
      country: "IN",
      state: "",
      region: "",
    }),
    [preview, setPreview] = useState(null),
    [file, setFile] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState(false),
    [locations, setLocations] = useState({
      countries: {},
      states: {},
      regions: {},
    }),
    [locationsLoading, setLocationsLoading] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setLocationsLoading(true);
    api(
      `/schools/${schoolId}/calendar-excel/locations?country=${encodeURIComponent(prefs.country)}&state=${encodeURIComponent(prefs.state)}`,
    )
      .then((r) => {
        if (active) setLocations(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLocationsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [expanded, schoolId, prefs.country, prefs.state]);
  const options = (map) =>
    Object.entries(map).sort((a, b) => a[1].localeCompare(b[1]));
  async function download() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(
        `/schools/${schoolId}/calendar-excel/template`,
        prefs,
      );
      const bytes = Uint8Array.from(atob(result.content), (c) =>
        c.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setMessage(
        "Template downloaded. Edit the date rows in Excel or LibreOffice, save as .xlsx, then upload it below.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setPreview(null);
    try {
      const body = new FormData();
      body.append("file", file);
      setPreview(
        await api(`/schools/${schoolId}/calendar-excel/preview`, body),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    setBusy(true);
    setError("");
    try {
      const result = await api(`/schools/${schoolId}/calendar-excel/apply`, {
        previewId: preview.previewId,
      });
      setPreview(null);
      setMessage(
        `Year calendar updated: ${result.created} added, ${result.updated} edited, ${result.cancelled} cancelled. The dates are shown below.`,
      );
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="calendar-excel">
      <div className="panel-heading">
        <div>
          <h3>Year calendar · Excel</h3>
          <p>
            Set weekend holidays, fill the year in Excel and preview your
            changes before applying.
          </p>
        </div>
        <button
          className="primary"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide Excel tools" : "Plan yearly calendar"}
        </button>
      </div>
      {expanded && (
        <div className="calendar-excel-body">
          <div className="calendar-excel-controls">
            <label>
              Calendar year
              <input
                type="number"
                min={2000}
                max={2100}
                value={prefs.year}
                onChange={(e) =>
                  setPrefs({ ...prefs, year: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Saturday holidays
              <select
                value={prefs.saturdayOff}
                onChange={(e) =>
                  setPrefs({ ...prefs, saturdayOff: e.target.value })
                }
              >
                {saturdayChoices.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="weekend-checkbox">
              <input
                type="checkbox"
                checked={prefs.sundayOff}
                onChange={(e) =>
                  setPrefs({ ...prefs, sundayOff: e.target.checked })
                }
              />{" "}
              All Sundays are holidays
            </label>
            <label>
              Public holidays
              <select
                aria-label="Public holidays"
                value={prefs.publicHolidays ? "include" : "exclude"}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    publicHolidays: e.target.value === "include",
                  })
                }
              >
                <option value="include">
                  Include public holidays as days off
                </option>
                <option value="exclude">
                  Exclude public holidays as days off
                </option>
              </select>
            </label>
            <label>
              Holiday country
              <select
                aria-label="Holiday country"
                disabled={locationsLoading}
                value={prefs.country}
                onChange={(e) => {
                  setLocations({ ...locations, states: {}, regions: {} });
                  setPrefs({
                    ...prefs,
                    country: e.target.value,
                    state: "",
                    region: "",
                  });
                }}
              >
                {options(locations.countries).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            {Object.keys(locations.states).length > 0 && (
              <label>
                Holiday state / province
                <select
                  aria-label="Holiday state / province"
                  disabled={locationsLoading}
                  value={prefs.state}
                  onChange={(e) => {
                    setLocations({ ...locations, regions: {} });
                    setPrefs({ ...prefs, state: e.target.value, region: "" });
                  }}
                >
                  <option value="">Country-level holidays only</option>
                  {options(locations.states).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {Object.keys(locations.regions).length > 0 && (
              <label>
                Holiday region
                <select
                  aria-label="Holiday region"
                  value={prefs.region}
                  onChange={(e) =>
                    setPrefs({ ...prefs, region: e.target.value })
                  }
                >
                  <option value="">All state-level holidays</option>
                  {options(locations.regions).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            className="primary"
            disabled={
              busy || locationsLoading || !locations.countries[prefs.country]
            }
            onClick={download}
          >
            Download formatted Excel template
          </button>
          <p>
            The template includes every date for the selected calendar year with
            your weekend and public-holiday choices prefilled. Excluded public
            holidays remain identified in Details; weekend rules still apply.
            Review regional and newly announced dates against school/government
            circulars. Edit Status, Title and Details. Working dates do not
            create calendar entries. Existing manual entries and weekly class
            periods are preserved.
          </p>
          <p>
            Holiday references:{" "}
            <a
              href="https://github.com/commenthol/date-holidays"
              target="_blank"
              rel="noreferrer"
            >
              date-holidays
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/3.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 3.0 data
            </a>
            . Attribution is also included in the workbook.
          </p>
          {prefs.country === "IN" && (
            <p>
              India 2026 includes a verified central gazetted holiday list.
              Other years use the bundled dataset and may need additional
              festival or local holiday dates.
            </p>
          )}
          <form onSubmit={upload} className="calendar-excel-upload">
            <label>
              Completed calendar workbook
              <input
                type="file"
                accept=".xlsx"
                required
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setPreview(null);
                  setError("");
                  setMessage("");
                }}
              />
            </label>
            <button disabled={busy || !file} className="primary">
              {busy ? "Processing…" : "Upload and preview"}
            </button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="calendar-excel-message">
              {message}
            </p>
          )}
          {preview && (
            <section className="calendar-import-preview">
              <h3>Review {preview.preferences.year} calendar</h3>
              <p>
                {preview.summary.holidays} holidays · {preview.summary.events}{" "}
                events · {preview.summary.working} working dates
              </p>
              <p>
                {preview.summary.created} added · {preview.summary.updated}{" "}
                edited · {preview.summary.cancelled} cancelled ·{" "}
                {preview.summary.unchanged} unchanged
              </p>
              <p>
                Only entries managed by yearly Excel imports are replaced.
                Manual entries remain. This preview expires in 15 minutes;
                changes made after preview require a new upload.
              </p>
              <div className="calendar-preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Status</th>
                      <th>Title</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.date}>
                        <td>{r.date}</td>
                        <td>{r.day}</td>
                        <td>{r.status}</td>
                        <td>{r.title || "—"}</td>
                        <td>{r.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button disabled={busy} className="primary" onClick={apply}>
                Apply reviewed year calendar
              </button>
              <button disabled={busy} onClick={() => setPreview(null)}>
                Discard preview
              </button>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
