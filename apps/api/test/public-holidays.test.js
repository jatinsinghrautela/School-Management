import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  preferences,
  yearRows,
  calendarWorkbook,
  readCalendarWorkbook,
} from "../src/calendar-workbook.js";
import { india2026 } from "../src/india-holidays-2026.js";
const base = {
  year: 2026,
  sundayOff: false,
  saturdayOff: "none",
  country: "IN",
  state: "",
  region: "",
  publicHolidays: true,
};
test("public holidays include verified India dates and regional dates, while exclusion keeps reference names", () => {
  const rows = yearRows(base);
  for (const [date] of india2026)
    assert.equal(rows.find((r) => r.date === date).status, "Holiday");
  assert.match(rows.find((r) => r.date === "2026-03-04").title, /Holi/);
  const excluded = yearRows({ ...base, publicHolidays: false });
  assert.equal(excluded.find((r) => r.date === "2026-03-04").status, "Working");
  assert.match(
    excluded.find((r) => r.date === "2026-03-04").description,
    /Holi/,
  );
  const regional = yearRows({ ...base, state: "KA" });
  assert.match(
    regional.find((r) => r.date === "2026-11-01").title,
    /Karnataka/,
  );
  const weekends = yearRows({
    ...base,
    sundayOff: true,
    publicHolidays: false,
  });
  assert.equal(weekends.find((r) => r.date === "2026-11-08").status, "Holiday");
  assert.equal(
    weekends.find((r) => r.date === "2026-11-08").title,
    "Sunday holiday",
  );
  const us = yearRows({ ...base, country: "US" });
  assert.equal(us.find((r) => r.date === "2026-07-04").status, "Holiday");
  assert.equal(us.find((r) => r.date === "2026-07-03").status, "Holiday");
});
test("holiday location settings validate country/state/region and persist through workbook round trip", async () => {
  for (const input of [
    { country: "XX" },
    { country: "__proto__" },
    { state: "XX" },
    { region: "XX" },
    { country: "", publicHolidays: true },
  ])
    assert.throws(() => preferences({ ...base, ...input }), /supported/);
  const bytes = await calendarWorkbook(
      { id: "school-test", name: "School" },
      base,
    ),
    parsed = await readCalendarWorkbook(bytes, "school-test");
  assert.equal(parsed.preferences.country, "IN");
  assert.equal(parsed.preferences.publicHolidays, true);
  assert.equal(
    parsed.rows.find((r) => r.date === "2026-03-04").status,
    "Holiday",
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  assert.match(wb.getWorksheet("Settings").getCell("B14").text, /CC BY-SA/);
  // Legacy version-one templates keep their original rows without introducing public holidays.
  wb.getWorksheet("Settings").getCell("B5").value = "1";
  const legacy = await readCalendarWorkbook(
    Buffer.from(await wb.xlsx.writeBuffer()),
    "school-test",
  );
  assert.equal(legacy.preferences.publicHolidays, false);
  assert.equal(
    legacy.rows.find((r) => r.date === "2026-03-04").status,
    "Holiday",
  );
});
