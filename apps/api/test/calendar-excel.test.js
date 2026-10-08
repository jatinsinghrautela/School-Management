import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  yearRows,
  calendarWorkbook,
  readCalendarWorkbook,
} from "../src/calendar-workbook.js";
import { createStore } from "../src/store.js";
import { seed } from "../src/seed.js";
import { createApp } from "../src/app.js";
test("weekend policies cover leap years and exact Saturday occurrences", () => {
  for (const [policy, expected] of [
    ["none", 0],
    ["all", 4],
    ["second-fourth", 2],
    ["second", 1],
    ["fourth", 1],
  ]) {
    const rows = yearRows({ year: 2028, sundayOff: true, saturdayOff: policy });
    assert.equal(rows.length, 366);
    const october = rows.filter((r) => r.date.startsWith("2028-10"));
    assert.equal(
      october.filter((r) => r.day === "Saturday" && r.status === "Holiday")
        .length,
      expected,
    );
    assert.ok(
      rows
        .filter((r) => r.day === "Sunday")
        .every((r) => r.status === "Holiday"),
    );
  }
  const rows = yearRows({
    year: 2026,
    sundayOff: false,
    saturdayOff: "second-fourth",
  });
  assert.equal(rows.length, 365);
  assert.ok(
    rows.filter((r) => r.day === "Sunday").every((r) => r.status === "Working"),
  );
  assert.equal(rows.find((r) => r.date === "2026-08-29").status, "Working");
  assert.equal(rows.find((r) => r.date === "2026-08-08").status, "Holiday");
});
test("Excel calendar round-trips styled dates and rejects missing rows, formulas and wrong schools", async () => {
  const bytes = await calendarWorkbook(
    { id: "school-test", name: "Test school" },
    { year: 2028, sundayOff: true, saturdayOff: "fourth" },
  );
  const result = await readCalendarWorkbook(bytes, "school-test");
  assert.equal(result.rows.length, 366);
  await assert.rejects(
    readCalendarWorkbook(bytes, "other-school"),
    /this school/,
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  const sheet = wb.getWorksheet("Year calendar");
  assert.equal(sheet.views[0].ySplit, 5);
  assert.equal(sheet.getCell("C6").dataValidation.type, "list");
  assert.equal(sheet.getCell("A6").numFmt, "yyyy-mm-dd");
  sheet.getCell("D6").value = { formula: "1+1", result: 2 };
  await assert.rejects(
    readCalendarWorkbook(
      Buffer.from(await wb.xlsx.writeBuffer()),
      "school-test",
    ),
    (e) => e.errors.some((s) => s.includes("formulas")),
  );
  await wb.xlsx.load(bytes);
  wb.getWorksheet("Year calendar").spliceRows(6, 1);
  await assert.rejects(
    readCalendarWorkbook(
      Buffer.from(await wb.xlsx.writeBuffer()),
      "school-test",
    ),
    (e) => e.errors.some((s) => s.includes("every date")),
  );
  await assert.rejects(
    readCalendarWorkbook(Buffer.from("not xlsx"), "school-test"),
    /valid/,
  );
});
test("year import previews and applies atomically, preserves manual entries, prevents stale/reused previews and duplicate dates", async () => {
  const store = await createStore("demo");
  await seed(store);
  const server = createApp(store).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const call = async (path, token, body, status = 200) => {
    const multipart = body instanceof FormData;
    const r = await fetch(
      `http://127.0.0.1:${server.address().port}/api${path}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          ...(!multipart ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}),
      },
    );
    const json = await r.json();
    assert.equal(r.status, status, JSON.stringify(json));
    return json;
  };
  const multipart = (bytes) => {
    const f = new FormData();
    f.append("file", new Blob([bytes]), "year.xlsx");
    return f;
  };
  try {
    const login = async (name) =>
      (
        await call("/auth/login", null, {
          email: `${name}@orbit.local`,
          password: "OrbitDemo123!",
        })
      ).token;
    const principal = await login("principal"),
      teacher = await login("teacher");
    const prefix = "/schools/school-north/calendar-excel";
    const prefs = { year: 2026, sundayOff: true, saturdayOff: "second-fourth" };
    const locations = await call(
      `${prefix}/locations?country=IN&state=KA`,
      principal,
    );
    assert.ok(locations.countries.IN);
    assert.ok(locations.states.KA);
    await call(`${prefix}/locations?country=IN`, teacher, null, 403);
    await call(`${prefix}/locations?country=XX`, principal, null, 400);
    await call(`${prefix}/template`, teacher, prefs, 403);
    await call(
      "/schools/school-west/calendar-excel/template",
      principal,
      prefs,
      403,
    );
    const template = await call(`${prefix}/template`, principal, prefs);
    const bytes = Buffer.from(template.content, "base64");
    const manual = await call(
      "/schools/school-north/calendar",
      principal,
      {
        title: "Manual festival",
        startDate: "2026-10-20",
        endDate: "2026-10-20",
        kind: "event",
        audience: "all",
      },
      201,
    );
    const preview = await call(
      `${prefix}/preview`,
      principal,
      multipart(bytes),
    );
    assert.equal(preview.rows.length, 365);
    assert.equal((await store.all("calendar")).length, 1);
    const results = await Promise.all(
      [200, 409].map(async () => {
        const r = await fetch(
          `http://127.0.0.1:${server.address().port}/api${prefix}/apply`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${principal}`,
            },
            body: JSON.stringify({ previewId: preview.previewId }),
          },
        );
        return r.status;
      }),
    );
    assert.deepEqual(results.sort(), [200, 409]);
    const second = await call(`${prefix}/preview`, principal, multipart(bytes));
    assert.equal(second.summary.created, 0);
    assert.equal(second.summary.updated, 0);
    assert.equal(second.summary.cancelled, 0);
    await call(`${prefix}/apply`, principal, { previewId: second.previewId });
    const stale = await call(`${prefix}/preview`, principal, multipart(bytes));
    await call("/schools/school-north/calendar", principal, {
      entryId: manual.id,
      title: "Changed manual festival",
      startDate: "2026-10-20",
      endDate: "2026-10-20",
      kind: "event",
      audience: "all",
    });
    await call(
      `${prefix}/apply`,
      principal,
      { previewId: stale.previewId },
      409,
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes);
    const sheet = wb.getWorksheet("Year calendar");
    const sunday = sheet.getRow(9);
    assert.equal(sunday.getCell(3).value, "Holiday");
    sunday.getCell(3).value = "Working";
    sheet.getCell("C6").value = "Event";
    sheet.getCell("D6").value = "New year assembly";
    const edited = await call(
      `${prefix}/preview`,
      principal,
      multipart(Buffer.from(await wb.xlsx.writeBuffer())),
    );
    assert.equal(edited.summary.cancelled, 1);
    assert.equal(edited.summary.created, 1);
    await call(`${prefix}/apply`, principal, { previewId: edited.previewId });
    assert.ok(
      (await store.all("calendar")).some(
        (e) => e.id === manual.id && !e.cancelled,
      ),
    );
    assert.ok(
      (await store.all("calendar")).some(
        (e) => e.title === "New year assembly" && !e.cancelled,
      ),
    );
    assert.ok(
      (await store.all("audit")).some(
        (e) => e.action === "calendar.year-imported",
      ),
    );
    sheet.getCell("A7").value = sheet.getCell("A6").value;
    const invalid = await call(
      `${prefix}/preview`,
      principal,
      multipart(Buffer.from(await wb.xlsx.writeBuffer())),
      400,
    );
    assert.ok(invalid.errors.length);
    const expiring = await call(
      `${prefix}/preview`,
      principal,
      multipart(bytes),
    );
    const stored = (await store.all("calendarImports")).find(
      (p) => p.id === expiring.previewId,
    );
    await store.put("calendarImports", { ...stored, expires: 0 });
    await call(
      `${prefix}/apply`,
      principal,
      { previewId: expiring.previewId },
      409,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
