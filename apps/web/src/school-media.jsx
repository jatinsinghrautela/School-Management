import React, { useEffect, useRef, useState } from "react";

export function LogoUpload({ api, schoolId, settings, readOnly, onSaved }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="school-logo-editor">
      <h3>School logo</h3>
      {settings.logoDataUri && (
        <img
          className="school-logo-preview"
          src={settings.logoDataUri}
          alt="Current school logo"
        />
      )}
      <p>
        Upload a 256 × 256 PNG, at most 128 KB, exported without interlacing.
        Transparent padding is recommended. Documents display it at 64–72 pixels
        without stretching. Previously published documents retain their original
        logo.
      </p>
      {!readOnly && (
        <form
          className="operation-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            setError("");
            try {
              const body = new FormData(form);
              body.append("version", settings.version || 0);
              await api(`/schools/${schoolId}/school-logo`, body);
              await onSaved();
              form.reset();
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Logo file
            <input
              aria-label="Logo file"
              name="file"
              type="file"
              accept="image/png"
              required
              disabled={!settings.uploadsEnabled || busy}
            />
          </label>
          <button
            className="primary"
            disabled={!settings.uploadsEnabled || busy}
          >
            {busy ? "Uploading…" : "Upload school logo"}
          </button>
        </form>
      )}
      {!settings.uploadsEnabled && (
        <p className="upload-disabled">
          Uploads are disabled until the platform administrator configures the
          local malware scanner.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
function Photo({ photo, api, base }) {
  const ref = useRef(null),
    [src, setSrc] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!started && entries.some((e) => e.isIntersecting)) {
          started = true;
          observer.disconnect();
          api(`${base}/gallery/${photo.id}/image`)
            .then((r) => {
              if (active) setSrc(r.dataUri);
            })
            .catch((e) => {
              if (active) setError(e.message);
            });
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [photo.id, base]);
  return (
    <div className="gallery-photo" ref={ref}>
      {src ? (
        <img
          src={src}
          alt={photo.caption || photo.title}
          loading="lazy"
          decoding="async"
          width={photo.width}
          height={photo.height}
        />
      ) : (
        <p>{error || "Loading photograph…"}</p>
      )}
    </div>
  );
}
export function Gallery({ api, schoolId, manager, readOnly }) {
  const [data, setData] = useState(null),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const base = `/schools/${schoolId}`;
  async function load(p = page) {
    setData(await api(`${base}/gallery?page=${p}`));
  }
  useEffect(() => {
    let active = true;
    setData(null);
    setPage(1);
    api(`${base}/gallery?page=1`)
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [schoolId]);
  useEffect(() => {
    if (data) load().catch((e) => setError(e.message));
  }, [page]);
  return (
    <div className="operations-stack">
      <section className="panel operations-panel">
        <div className="panel-title">
          <h2>School moments</h2>
          <p>
            Functions, celebrations and events, shared within this school
            community.
          </p>
        </div>
        <div className="operations-body">
          <button
            className="secondary"
            onClick={() => load().catch((e) => setError(e.message))}
          >
            Refresh gallery
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          {manager && !readOnly && (
            <details className="operation-details">
              <summary>Publish an event photograph</summary>
              <form
                className="operation-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  setBusy(true);
                  setError("");
                  try {
                    const body = new FormData(form);
                    body.set("consentVerified", "true");
                    await api(base + "/gallery", body);
                    await load(1);
                    setPage(1);
                    form.reset();
                    setMessage(
                      "Photograph published to this school community.",
                    );
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Event / photo title
                  <input name="title" required maxLength={120} />
                </label>
                <label>
                  Caption
                  <textarea name="caption" maxLength={500} />
                </label>
                <label>
                  Photograph
                  <input
                    name="file"
                    type="file"
                    accept="image/png,image/jpeg"
                    required
                    disabled={!data?.uploadsEnabled || busy}
                  />
                </label>
                <p>
                  PNG or JPEG, up to 5 MB, 4096 × 4096 and 16 megapixels.
                  EXIF/IPTC and text metadata are removed from the published
                  copy.
                </p>
                <label className="checkbox">
                  <input type="checkbox" required />I have verified permission
                  to publish this photo, including any students pictured.
                </label>
                <button
                  className="primary"
                  disabled={!data?.uploadsEnabled || busy}
                >
                  {busy ? "Publishing…" : "Publish photograph"}
                </button>
                {!data?.uploadsEnabled && (
                  <p>
                    Uploads are disabled until the local malware scanner is
                    configured.
                  </p>
                )}
              </form>
            </details>
          )}
        </div>
      </section>
      <div className="gallery-grid">
        {data?.photos.map((photo) => (
          <article className="panel gallery-card" key={photo.id}>
            <Photo photo={photo} api={api} base={base} />
            <div className="gallery-caption">
              <h3>{photo.title}</h3>
              <p>{photo.caption}</p>
              <small>{photo.createdAt.slice(0, 10)}</small>
              {manager && !readOnly && (
                <details>
                  <summary>Remove from gallery</summary>
                  <form
                    className="operation-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const reason = new FormData(e.currentTarget).get(
                        "reason",
                      );
                      setBusy(true);
                      setError("");
                      try {
                        await api(`${base}/gallery/${photo.id}/archive`, {
                          reason,
                        });
                        await load();
                        setMessage(
                          "Photograph removed; its audit history is retained.",
                        );
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      Removal reason
                      <textarea
                        name="reason"
                        minLength={5}
                        maxLength={500}
                        required
                      />
                    </label>
                    <button className="secondary" disabled={busy}>
                      Remove photograph
                    </button>
                  </form>
                </details>
              )}
            </div>
          </article>
        ))}
      </div>
      {data && !data.total && (
        <section className="panel operations-body">
          <p>No event photographs published yet.</p>
        </section>
      )}
      {data && (
        <div className="fee-pagination">
          <button
            className="secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            {data.total} photographs · Page {page}
          </span>
          <button
            className="secondary"
            disabled={page * 12 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
