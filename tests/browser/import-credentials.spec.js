import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
test("importer can download unique credentials after unchanged workbook import", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill("principal@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page
    .getByText("Import teachers, students or staff", { exact: true })
    .click();
  const templateDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download people template", exact: true })
    .click();
  const template = await templateDownload;
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(await template.path());
  expect(book.getWorksheet("People").getRow(1).values.slice(1)).toEqual([
    "Name",
    "Email",
    "Role",
    "Class",
  ]);
  const cls = book.getWorksheet("Classes").getCell("A2").value;
  book.getWorksheet("People").getRow(2).values = [
    "Sample Student",
    `sample.${Date.now()}@test.local`,
    "student",
    cls,
  ];
  const path = testInfo.outputPath("import.xlsx");
  await book.xlsx.writeFile(path);
  await page.getByLabel("People import workbook").setInputFiles(path);
  await page.getByRole("button", { name: "Upload and preview users" }).click();
  await page.getByRole("button", { name: "Create reviewed accounts" }).click();
  const button = page.getByRole("button", {
    name: "Download login credentials",
    exact: true,
  });
  await expect(button).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;
  const credentials = new ExcelJS.Workbook();
  await credentials.xlsx.readFile(await download.path());
  expect(
    credentials.getWorksheet("Login credentials").getCell("D2").value.length,
  ).toBeGreaterThanOrEqual(12);
  await page.getByRole("button", { name: "Dismiss credentials" }).click();
  await expect(button).toHaveCount(0);
});
