import React, { useState } from "react";
export function FeeYearPlan({ classes, years = [], save, busy }) {
  const [classId, setClassId] = useState(classes[0]?.id || ""),
    [months, setMonths] = useState([]),
    [requestKey, setKey] = useState(crypto.randomUUID());
  const cls = classes.find((c) => c.id === classId),
    year = years.find((y) => y.id === cls?.academicYearId);
  const choices = [];
  if (year) {
    let date = new Date(`${year.startDate.slice(0, 7)}-01T00:00:00Z`);
    for (
      let i = 0;
      i < 24 && date.toISOString().slice(0, 7) <= year.endDate.slice(0, 7);
      i++
    ) {
      choices.push(date.toISOString().slice(0, 7));
      date.setUTCMonth(date.getUTCMonth() + 1);
    }
  }
  return (
    <details className="panel planner-panel">
      <summary>Plan fees for the academic year</summary>
      <p>
        Choose the charge months and one recurring due day. Short months use
        their last day. Existing charges and payments remain intact.
      </p>
      <form
        className="calendar-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const amount = String(f.get("amount"));
          if (!/^\d+(\.\d{1,2})?$/.test(amount)) return;
          const [a, b = ""] = amount.split(".");
          const r = await save("/fee-year-plan", {
            classId,
            name: f.get("name"),
            amountMinor: Number(a) * 100 + Number(b.padEnd(2, "0")),
            currency: f.get("currency"),
            dueDay: Number(f.get("dueDay")),
            months,
            requestKey,
            assign: f.get("assign") === "on",
          });
          if (r) {
            setKey(crypto.randomUUID());
            setMonths([]);
          }
        }}
      >
        <div className="planner-grid">
          <label>
            Class
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setMonths([]);
                setKey(crypto.randomUUID());
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fee name
            <input name="name" required maxLength="70" />
          </label>
          <label>
            Monthly amount
            <input
              name="amount"
              required
              pattern="[0-9]+(\.[0-9]{1,2})?"
              inputMode="decimal"
            />
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
            Due day each month
            <input
              name="dueDay"
              type="number"
              min="1"
              max="31"
              defaultValue="10"
              required
            />
          </label>
        </div>
        <fieldset>
          <legend>
            Charge months ({year?.name || "select a year-linked class"})
          </legend>
          <button
            type="button"
            className="secondary"
            onClick={() => setMonths(choices)}
          >
            Select entire academic year
          </button>
          {choices.map((m) => (
            <label key={m} className="planner-choice">
              <input
                type="checkbox"
                checked={months.includes(m)}
                onChange={() =>
                  setMonths(
                    months.includes(m)
                      ? months.filter((x) => x !== m)
                      : [...months, m],
                  )
                }
              />
              {m}
            </label>
          ))}
        </fieldset>
        <label>
          <input type="checkbox" name="assign" defaultChecked />
          Also assign these fees to all active students currently in this class
        </label>
        <button className="primary" disabled={busy || !months.length}>
          Create yearly fee plan
        </button>
      </form>
    </details>
  );
}
