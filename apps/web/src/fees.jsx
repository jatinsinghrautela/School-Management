import React, { useEffect, useState, useRef } from "react";
const money = (n, c) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(
    n / 100,
  );
function minor(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with at most two decimal places");
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 1000000000)
    throw new Error("Enter a positive amount within the supported limit");
  return result;
}
export function Fees({
  api,
  schoolId,
  classes,
  students,
  manager,
  readOnly,
  settings,
}) {
  const money = (n, c) =>
    new Intl.NumberFormat(settings?.locale || "en-IN", {
      style: "currency",
      currency: c,
    }).format(n / 100);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [schedule, setSchedule] = useState(""),
    [selected, setSelected] = useState([]),
    [chargeId, setChargeId] = useState(""),
    [requestKeys, setRequestKeys] = useState({}),
    [voidReasons, setVoidReasons] = useState({});
  const ledgerRef = useRef(null);
  const [ledgerOpen, setLedgerOpen] = useState(0);
  useEffect(() => {
    if (ledgerOpen && ledgerRef.current) {
      ledgerRef.current.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
      ledgerRef.current.focus({ preventScroll: true });
    }
  }, [ledgerOpen]);
  const writable = manager && !readOnly;
  useEffect(() => {
    let active = true;
    setData(null);
    setSchedule("");
    setSelected([]);
    setChargeId("");
    setRequestKeys({});
    setError("");
    setMessage("");
    setQuery("");
    setPage(1);
    api(`/schools/${schoolId}/fees`)
      .then((r) => {
        if (active) {
          setData(r);
          setChargeId(r.charges[0]?.id || "");
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
      const r = await api(`/schools/${schoolId}${path}`, body);
      setData(await api(`/schools/${schoolId}/fees`));
      setMessage("Ledger updated successfully.");
      return r;
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
    try {
      body.amountMinor = minor(body.amount);
      delete body.amount;
      const requestSlot = `${chargeId}:${type}`;
      if (type !== "schedule") {
        body.requestKey = requestKeys[requestSlot] || crypto.randomUUID();
        setRequestKeys((old) => ({ ...old, [requestSlot]: body.requestKey }));
      }
      const result = await act(
        type === "schedule"
          ? "/fee-schedules"
          : `/fee-charges/${chargeId}/${type}`,
        body,
      );
      if (result) {
        form.reset();
        setRequestKeys((old) => {
          const next = { ...old };
          delete next[requestSlot];
          return next;
        });
      }
    } catch (e) {
      setError(e.message);
    }
  }
  async function receipt(payment) {
    setError("");
    try {
      const file = await api(
          `/schools/${schoolId}/fee-payments/${payment.id}/receipt`,
        ),
        url = URL.createObjectURL(
          new Blob([file.html], { type: "text/html;charset=utf-8" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  }
  const chosenSchedule = data?.schedules.find((s) => s.id === schedule),
    roster = students.filter(
      (s) => s.active !== false && s.classIds.includes(chosenSchedule?.classId),
    ),
    charge = data?.charges.find((c) => c.id === chargeId);
  const totals = {};
  const filtered = (data?.charges || []).filter((c) =>
      `${c.studentName} ${c.name} ${c.className}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
    maxPage = Math.max(1, Math.ceil(filtered.length / 20)),
    currentPage = Math.min(page, maxPage),
    pageRows = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  for (const c of data?.charges || [])
    totals[c.currency] = (totals[c.currency] || 0) + c.outstandingMinor;
  return (
    <div className="fees-workspace">
      <section className="panel record-grid">
        <div className="panel-heading">
          <div>
            <h3>Fee ledger</h3>
            <p>School charges, concessions and manually recorded payments.</p>
          </div>
        </div>
        <div className="fees-body">
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {message && <p role="status">{message}</p>}
          {!data ? (
            <p>Loading fees…</p>
          ) : (
            <>
              <div className="fee-summary">
                {Object.entries(totals).map(([currency, total]) => (
                  <div key={currency}>
                    <span>Outstanding · {currency}</span>
                    <strong>{money(total, currency)}</strong>
                  </div>
                ))}
                {!data.charges.length && <p>No charges assigned yet.</p>}
              </div>
              {writable && (
                <details>
                  <summary>Create fee schedule</summary>
                  <form
                    className="calendar-form"
                    onSubmit={(e) => submit(e, "schedule")}
                  >
                    <label>
                      Fee name
                      <input name="name" maxLength={120} required />
                    </label>
                    <label>
                      Class
                      <select
                        name="classId"
                        required
                        aria-label="Fee schedule class"
                      >
                        <option value="">Choose class</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Currency
                      <select name="currency">
                        {["INR", "USD", "EUR", "GBP"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Amount
                      <input
                        name="amount"
                        inputMode="decimal"
                        required
                        placeholder="0.00"
                      />
                    </label>
                    <label>
                      Due date
                      <input name="dueDate" type="date" required />
                    </label>
                    <button className="primary" disabled={busy}>
                      Create schedule
                    </button>
                  </form>
                </details>
              )}
              {writable && (
                <details>
                  <summary>Assign a schedule to students</summary>
                  <div className="calendar-form">
                    <label>
                      Schedule
                      <select
                        aria-label="Assign fee schedule"
                        value={schedule}
                        onChange={(e) => {
                          setSchedule(e.target.value);
                          setSelected([]);
                        }}
                      >
                        <option value="">Choose schedule</option>
                        {data.schedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.className} ·{" "}
                            {money(s.amountMinor, s.currency)} · {s.dueDate}
                          </option>
                        ))}
                      </select>
                    </label>
                    {chosenSchedule && (
                      <>
                        <p>
                          Review the selected students before assigning{" "}
                          {money(
                            chosenSchedule.amountMinor,
                            chosenSchedule.currency,
                          )}{" "}
                          to each. Reassigning the same schedule preserves
                          existing charges.
                        </p>
                        {roster.map((s) => (
                          <label className="fee-check" key={s.id}>
                            <input
                              type="checkbox"
                              checked={selected.includes(s.id)}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, s.id]
                                    : selected.filter((id) => id !== s.id),
                                )
                              }
                            />
                            {s.name}
                          </label>
                        ))}
                        {!roster.length && (
                          <p>No active students assigned to this class.</p>
                        )}
                        <button
                          className="primary"
                          disabled={busy || !selected.length}
                          onClick={async () => {
                            const r = await act(
                              `/fee-schedules/${schedule}/assign`,
                              { studentIds: selected },
                            );
                            if (r) {
                              setSelected([]);
                              setMessage(
                                `${r.created} charges assigned; ${r.alreadyAssigned} already existed.`,
                              );
                            }
                          }}
                        >
                          Assign to {selected.length} selected students
                        </button>
                      </>
                    )}
                  </div>
                </details>
              )}
              <label className="calendar-form">
                Search fee ledger
                <input
                  aria-label="Search fee ledger"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Student, fee or class"
                />
              </label>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student / fee</th>
                      <th>Due</th>
                      <th>Charge</th>
                      <th>Concessions</th>
                      <th>Paid</th>
                      <th>Outstanding</th>
                      <th>Ledger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.studentName}
                          <br />
                          {c.name} · {c.className}
                        </td>
                        <td>{c.dueDate}</td>
                        <td>{money(c.amountMinor, c.currency)}</td>
                        <td>{money(c.concessionMinor, c.currency)}</td>
                        <td>{money(c.paidMinor, c.currency)}</td>
                        <td>{money(c.outstandingMinor, c.currency)}</td>
                        <td>
                          <button
                            className="secondary"
                            onClick={() => {
                              setChargeId(c.id);
                              setLedgerOpen((n) => n + 1);
                            }}
                          >
                            View ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="fee-pagination">
                <button
                  className="secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span>
                  {filtered.length} charges · Page {currentPage} of {maxPage}
                </span>
                <button
                  className="secondary"
                  disabled={currentPage >= maxPage}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </section>
      {charge && (
        <section
          className="panel record-grid fee-ledger-detail"
          ref={ledgerRef}
          tabIndex={-1}
          aria-label="Selected fee ledger"
        >
          <div className="panel-heading">
            <div>
              <h3>
                {charge.studentName} · {charge.name}
              </h3>
              <p>
                Outstanding: {money(charge.outstandingMinor, charge.currency)}
              </p>
            </div>
          </div>
          <div className="fees-body">
            {writable && (
              <>
                <details>
                  <summary>Record manual payment</summary>
                  <form
                    key={chargeId + "payment"}
                    className="calendar-form"
                    onSubmit={(e) => submit(e, "payments")}
                  >
                    <p>
                      Record an already received payment. This does not transfer
                      funds or verify bank settlement.
                    </p>
                    <label>
                      Amount ({charge.currency})
                      <input name="amount" inputMode="decimal" required />
                    </label>
                    <label>
                      Payment date
                      <input
                        name="paidOn"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().slice(0, 10)}
                      />
                    </label>
                    <label>
                      Method
                      <select name="method">
                        <option value="cash">Cash</option>
                        <option value="bank">Bank transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </label>
                    <label>
                      Reference (required for bank/cheque)
                      <input name="reference" maxLength={120} />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || charge.outstandingMinor <= 0}
                    >
                      Record payment and issue receipt
                    </button>
                  </form>
                </details>
                <details>
                  <summary>Add concession</summary>
                  <form
                    key={chargeId + "concession"}
                    className="calendar-form"
                    onSubmit={(e) => submit(e, "concessions")}
                  >
                    <label>
                      Amount ({charge.currency})
                      <input name="amount" inputMode="decimal" required />
                    </label>
                    <label>
                      Reason
                      <textarea
                        name="reason"
                        minLength={5}
                        maxLength={500}
                        required
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || charge.outstandingMinor <= 0}
                    >
                      Apply concession
                    </button>
                  </form>
                </details>
              </>
            )}
            <h4>Payments and receipts</h4>
            {data.payments
              .filter((p) => p.chargeId === chargeId)
              .map((p) => (
                <article className="fee-entry" key={p.id}>
                  <div>
                    <strong>
                      {p.receiptNumber} · {money(p.amountMinor, p.currency)}
                    </strong>
                    <p>
                      {p.paidOn} · {p.method} · {p.reference || "No reference"}
                    </p>
                    {p.voided && <p>Voided: {p.voidReason}</p>}
                  </div>
                  <button className="secondary" onClick={() => receipt(p)}>
                    Download printable receipt
                  </button>
                  {writable && !p.voided && (
                    <VoidEntry
                      entry={p}
                      type="payments"
                      busy={busy}
                      reasons={voidReasons}
                      setReasons={setVoidReasons}
                      act={act}
                    />
                  )}
                </article>
              ))}
            <h4>Concessions</h4>
            {data.concessions
              .filter((c) => c.chargeId === chargeId)
              .map((c) => (
                <article className="fee-entry" key={c.id}>
                  <div>
                    <strong>{money(c.amountMinor, c.currency)}</strong>
                    <p>{c.reason}</p>
                    {c.voided && <p>Voided: {c.voidReason}</p>}
                  </div>
                  {writable && !c.voided && (
                    <VoidEntry
                      entry={c}
                      type="concessions"
                      busy={busy}
                      reasons={voidReasons}
                      setReasons={setVoidReasons}
                      act={act}
                    />
                  )}
                </article>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
function VoidEntry({ entry, type, busy, reasons, setReasons, act }) {
  return (
    <details>
      <summary>Void incorrect entry</summary>
      <p>
        Voiding changes the ledger only. It does not refund or transfer money.
      </p>
      <label>
        Void reason
        <textarea
          minLength={5}
          maxLength={500}
          value={reasons[entry.id] || ""}
          onChange={(e) =>
            setReasons({ ...reasons, [entry.id]: e.target.value })
          }
        />
      </label>
      <button
        className="secondary"
        disabled={busy || (reasons[entry.id] || "").trim().length < 5}
        onClick={() =>
          act(`/fee-${type}/${entry.id}/void`, { reason: reasons[entry.id] })
        }
      >
        Void entry
      </button>
    </details>
  );
}
