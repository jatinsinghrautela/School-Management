import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import ExcelJS from "exceljs";
import { appearanceOptions } from "./appearance-options.js";
test.use({ ...appearanceOptions("dark"), reducedMotion: "reduce" });
async function login(page, role = "principal") {
  await page.goto("/");
  await page.getByLabel("Email address").fill(`${role}@orbit.local`);
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
}
test("separate import templates and expanded planning tools remain readable in dark mode on mobile", async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page);
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page
    .getByText("Import teachers, students or staff", { exact: true })
    .click();
  for (const type of ["student", "teacher"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Download ${type} template`, exact: true })
      .click();
    const file = await pending;
    const book = new ExcelJS.Workbook();
    await book.xlsx.readFile(await file.path());
    expect(book.getWorksheet("People").getCell("E1").value).toBe(
      type === "student" ? "Admission number" : "Enrollment number",
    );
  }
  for (const [name, summary] of [
    ["Timetable", "Plan or import weekly timetables"],
    ["Fees", "Plan fees for the academic year"],
    ["Calendar", null],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    if (summary) await page.getByText(summary, { exact: true }).click();
    else
      await page
        .getByRole("button", { name: "Plan yearly calendar", exact: true })
        .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page.screenshot({
    path: "apps/api/data/calendar-dark-planning-review.png",
    fullPage: true,
  });
});
test("yearly fee planning creates all selected monthly charges through the UI", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Fees", exact: true }).click();
  await page
    .getByText("Plan fees for the academic year", { exact: true })
    .click();
  const planner = page.locator(".planner-panel");
  await planner
    .getByLabel("Fee name", { exact: true })
    .fill(`Annual browser plan ${Date.now()}`);
  await planner.getByLabel("Monthly amount", { exact: true }).fill("250.00");
  await planner
    .getByRole("button", { name: "Select entire academic year" })
    .click();
  await planner.getByRole("button", { name: "Create yearly fee plan" }).click();
  await expect(
    page.getByText("Ledger updated successfully.", { exact: true }),
  ).toBeVisible();
});
