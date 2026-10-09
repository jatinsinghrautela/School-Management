import { brandWorkbook } from "./document-brand.js";
import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { holidayPreferences, publicHolidayDates } from "./public-holidays.js";
import { india2026Source } from "./india-holidays-2026.js";
export const saturdayOptions = [
  "none",
  "all",
  "second-fourth",
  "second",
  "fourth",
];
export const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const reject = (message) => {
  throw Object.assign(new Error(message), { status: 400 });
};
export function preferences(input) {
  const year = Number(input.year);
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    typeof input.sundayOff !== "boolean" ||
    !saturdayOptions.includes(input.saturdayOff)
  )
    reject("Choose a year from 2000–2100 and valid weekend preferences");
  return {
    year,
    sundayOff: input.sundayOff,
    saturdayOff: input.saturdayOff,
    ...holidayPreferences(input),
  };
}
export function yearRows(prefs) {
  const rows = [];
  const holidays = publicHolidayDates(prefs);
  for (
    let d = new Date(Date.UTC(prefs.year, 0, 1));
    d.getUTCFullYear() === prefs.year;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const weekday = d.getUTCDay(),
      nth = Math.ceil(d.getUTCDate() / 7);
    const off =
      (weekday === 0 && prefs.sundayOff) ||
      (weekday === 6 &&
        (prefs.saturdayOff === "all" ||
          (prefs.saturdayOff === "second-fourth" && [2, 4].includes(nth)) ||
          (prefs.saturdayOff === "second" && nth === 2) ||
          (prefs.saturdayOff === "fourth" && nth === 4)));
    const date = d.toISOString().slice(0, 10),
      names = holidays.get(date) || [],
      publicOff = prefs.publicHolidays && names.length;
    rows.push({
      date,
      day: days[weekday],
      status: off || publicOff ? "Holiday" : "Working",
      title: publicOff
        ? names.join(" / ").slice(0, 120)
        : off
          ? `${days[weekday]} holiday`
          : "",
      description: names.length
        ? `Public holiday reference (${[prefs.country, prefs.state, prefs.region].filter(Boolean).join("/")}): ${names.join(" / ")}. ${prefs.publicHolidays ? "Included as a holiday." : "Public-holiday days off excluded; weekend rules still apply."} Review government and school circulars.`
        : "",
    });
  }
  return rows;
}
export async function calendarWorkbook(school, prefs, logo = "") {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Schoolglass Desk";
  const sheet = workbook.addWorksheet("Year calendar", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:5",
    },
  });
  sheet.columns = [
    { width: 17 },
    { width: 17 },
    { width: 16 },
    { width: 38 },
    { width: 70 },
  ];
  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = `Schoolglass Desk · ${prefs.year} calendar`;
  sheet.mergeCells("A2:E2");
  sheet.getCell("A2").value = school.name;
  sheet.mergeCells("A3:E3");
  sheet.getCell("A3").value =
    "Edit Status, Title and Details. Holiday/Event needs a title; Working rows do not publish notes.";
  sheet.mergeCells("A4:E4");
  sheet.getCell("A4").value =
    "Keep every date and the Settings sheet. Upload → preview → apply. Manual calendar entries are preserved.";
  sheet.getRow(5).values = ["Date", "Day", "Status", "Title", "Details"];
  sheet.getRow(1).height = 32;
  sheet.getRow(2).height = 26;
  sheet.getRow(3).height = 28;
  sheet.getRow(4).height = 28;
  for (const n of [1, 2, 5]) {
    sheet.getRow(n).font = {
      name: "Calibri",
      size: n === 1 ? 18 : 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    sheet.getRow(n).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF185A50" },
    };
  }
  for (const n of [3, 4])
    sheet.getRow(n).alignment = { wrapText: true, vertical: "middle" };
  for (const item of yearRows(prefs)) {
    const row = sheet.addRow([
      new Date(`${item.date}T00:00:00Z`),
      item.day,
      item.status,
      item.title || null,
      item.description || null,
    ]);
    row.height = 25;
    row.font = { name: "Calibri", size: 11, color: { argb: "FF193E34" } };
    row.alignment = { vertical: "middle", wrapText: true };
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb:
          item.status === "Holiday"
            ? "FFE0EEE6"
            : row.number % 2
              ? "FFF2F6F4"
              : "FFFFFFFF",
      },
    };
    row.getCell(1).numFmt = "yyyy-mm-dd";
    row.getCell(3).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"Working,Holiday,Event"'],
      showErrorMessage: true,
      errorTitle: "Choose a status",
      error: "Use Working, Holiday or Event.",
    };
    for (const n of [3, 4, 5])
      row.getCell(n).font = {
        name: "Calibri",
        size: 11,
        color: { argb: "FF245EAB" },
      };
  }
  sheet.autoFilter = { from: "A5", to: `E${sheet.rowCount}` };
  const settings = workbook.addWorksheet("Settings");
  settings.columns = [{ width: 27 }, { width: 62 }];
  for (const row of [
    ["School ID", school.id],
    ["Year", prefs.year],
    ["Sundays off", prefs.sundayOff ? "yes" : "no"],
    ["Saturdays off", prefs.saturdayOff],
    ["Template version", "2"],
  ])
    settings.addRow(row);
  settings.getColumn(1).font = { bold: true, color: { argb: "FF185A50" } };
  settings.addRow([
    "Weekend rules",
    "none / all / second-fourth / second / fourth",
  ]);
  settings.addRow([
    "Import behavior",
    "Rows are authoritative; editing preferences here does not recalculate dates.",
  ]);
  settings.addRow([
    "Scope",
    "All-day, whole-school calendar entries; weekly class periods are unchanged.",
  ]);
  settings.getColumn(2).alignment = { wrapText: true };
  settings.getRow(7).height = 38;
  settings.getRow(8).height = 38;
  settings.addRow([
    "Public holidays",
    prefs.publicHolidays ? "include" : "exclude",
  ]);
  settings.addRow(["Country", prefs.country || ""]);
  settings.addRow(["State", prefs.state || ""]);
  settings.addRow(["Region", prefs.region || ""]);
  settings.addRow([
    "Holiday data source",
    "date-holidays: https://github.com/commenthol/date-holidays",
  ]);
  settings.addRow([
    "Holiday data license",
    "CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/",
  ]);
  settings.addRow([
    "Country attribution",
    prefs.country
      ? `https://github.com/commenthol/date-holidays/blob/master/data/countries/${prefs.country}.yaml`
      : "No public holiday data selected",
  ]);
  settings.addRow([
    "Review dates",
    "Dataset may omit regional or newly announced holidays. Confirm school/government circulars and edit date rows as needed.",
  ]);
  for (let n = 13; n <= 16; n++) settings.getRow(n).height = 42;
  if (prefs.country === "IN" && prefs.year === 2026) {
    settings.addRow(["India 2026 gazetted source", india2026Source]);
    settings.getRow(17).height = 42;
  }
  brandWorkbook(workbook, school.name, logo);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
// Bound the ZIP directory before decompression; reject ZIP64, embedded macros and huge expanded files.
export function boundedZip(buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--)
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) reject("Upload a valid .xlsx workbook");
  const count = buffer.readUInt16LE(end + 10),
    size = buffer.readUInt32LE(end + 12),
    offset = buffer.readUInt32LE(end + 16);
  if (
    count > 200 ||
    offset + size > end ||
    buffer.readUInt16LE(end + 4) !== 0 ||
    buffer.readUInt16LE(end + 6) !== 0
  )
    reject("Workbook archive is unsupported or too large");
  let cursor = offset,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (
      cursor + 46 > offset + size ||
      buffer.readUInt32LE(cursor) !== 0x02014b50
    )
      reject("Invalid workbook archive");
    const nameLength = buffer.readUInt16LE(cursor + 28),
      extra = buffer.readUInt16LE(cursor + 30),
      comment = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42),
      compressed = buffer.readUInt32LE(cursor + 20),
      method = buffer.readUInt16LE(cursor + 10);
    if (
      localOffset + 30 > offset ||
      buffer.readUInt32LE(localOffset) !== 0x04034b50 ||
      buffer.readUInt16LE(cursor + 8) & 1 ||
      ![0, 8].includes(method)
    )
      reject("Unsupported workbook archive");
    const dataOffset =
      localOffset +
      30 +
      buffer.readUInt16LE(localOffset + 26) +
      buffer.readUInt16LE(localOffset + 28);
    if (dataOffset + compressed > offset) reject("Invalid workbook archive");
    try {
      const actual =
        method === 8
          ? inflateRawSync(
              buffer.subarray(dataOffset, dataOffset + compressed),
              { maxOutputLength: 5 * 1024 * 1024 },
            )
          : buffer.subarray(dataOffset, dataOffset + compressed);
      if (actual.length !== buffer.readUInt32LE(cursor + 24))
        reject("Invalid workbook expanded size");
    } catch {
      reject("Workbook archive exceeds its permitted size or is invalid");
    }
    total += buffer.readUInt32LE(cursor + 24);
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + nameLength)
      .toString("utf8");
    if (
      total > 5 * 1024 * 1024 ||
      /vbaProject|\.bin$|externalLinks/i.test(name)
    )
      reject(
        "Workbook contains unsupported content or exceeds the expanded size limit",
      );
    cursor += 46 + nameLength + extra + comment;
    if (cursor > offset + size) reject("Invalid workbook archive");
  }
}
export async function readCalendarWorkbook(buffer, schoolId) {
  boundedZip(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    reject("Workbook could not be read. Use the downloaded .xlsx template.");
  }
  const settings = workbook.getWorksheet("Settings"),
    sheet = workbook.getWorksheet("Year calendar");
  if (
    !settings ||
    !sheet ||
    settings.getCell("B1").value !== schoolId ||
    !["1", "2"].includes(String(settings.getCell("B5").value))
  )
    reject("Use a calendar template downloaded for this school");
  const sunday = settings.getCell("B3").value;
  if (!["yes", "no"].includes(sunday))
    reject("Invalid Sunday preference in Settings");
  const prefs = preferences({
    year: settings.getCell("B2").value,
    sundayOff: sunday === "yes",
    saturdayOff: settings.getCell("B4").value,
    ...(String(settings.getCell("B5").value) === "2"
      ? {
          publicHolidays: settings.getCell("B9").value === "include",
          country: settings.getCell("B10").value || "",
          state: settings.getCell("B11").value || "",
          region: settings.getCell("B12").value || "",
        }
      : {}),
  });
  if (
    String(settings.getCell("B5").value) === "2" &&
    !["include", "exclude"].includes(settings.getCell("B9").value)
  )
    reject("Invalid public holiday preference in Settings");
  if (sheet.columnCount > 5 || sheet.rowCount > 372)
    reject("Keep the original calendar columns and date rows");
  const expected = yearRows(prefs),
    dates = new Map(expected.map((r) => [r.date, r.day])),
    seen = new Set(),
    rows = [],
    errors = [];
  const text = (cell) =>
    typeof cell.value === "string"
      ? cell.value.trim()
      : cell.value == null
        ? ""
        : null;
  for (let n = 6; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (!row.hasValues) continue;
    const v = row.getCell(1).value;
    const date =
      v instanceof Date && !Number.isNaN(v.valueOf())
        ? v.toISOString().slice(0, 10)
        : text(row.getCell(1));
    const day = text(row.getCell(2)),
      status = text(row.getCell(3)),
      title = text(row.getCell(4)),
      description = text(row.getCell(5));
    if (!dates.has(date) || seen.has(date)) {
      errors.push(
        `Row ${n}: date is missing, duplicated or outside ${prefs.year}`,
      );
      continue;
    }
    seen.add(date);
    if (
      day !== dates.get(date) ||
      !["Working", "Holiday", "Event"].includes(status) ||
      title === null ||
      description === null ||
      title.length > 120 ||
      description.length > 2000 ||
      (status !== "Working" && !title)
    ) {
      errors.push(
        `Row ${n}: check weekday, status, title (120 characters) and details (2000 characters); formulas are not accepted`,
      );
      continue;
    }
    rows.push({
      date,
      day,
      status,
      title: status === "Working" ? "" : title,
      description: status === "Working" ? "" : description,
    });
  }
  if (seen.size !== expected.length)
    errors.push(
      `Include every date: expected ${expected.length}, found ${seen.size}`,
    );
  if (errors.length)
    throw Object.assign(new Error("Workbook validation failed"), {
      status: 400,
      errors: errors.slice(0, 30),
    });
  return {
    preferences: prefs,
    rows: rows.sort((a, b) => a.date.localeCompare(b.date)),
  };
}
export const importedId = (schoolId, date) =>
  createHash("sha256")
    .update(`year-calendar:${schoolId}:${date}`)
    .digest("hex")
    .slice(0, 32);
export const calendarDigest = (rows) =>
  createHash("sha256")
    .update(JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id))))
    .digest("hex");
