import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { appearanceOptions } from "./appearance-options.js";
test.use({ ...appearanceOptions("dark"), reducedMotion: "reduce" });
test("student privacy review is readable, scoped and downloads password-confirmed records", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Email address").fill("student@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await page.getByRole("button", { name: "Security", exact: true }).click();
  const privacy = page.getByRole("region", { name: "School privacy" });
  await expect(
    privacy.getByText("Your school has not published a privacy notice yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    privacy.getByRole("button", { name: "Publish privacy notice" }),
  ).toHaveCount(0);
  const password = privacy.getByLabel("Confirm password for export");
  await password.fill("OrbitDemo123!");
  const pending = page.waitForEvent("download");
  await privacy
    .getByRole("button", { name: "Download personal records" })
    .click();
  expect((await pending).suggestedFilename()).toBe(
    "school-personal-records.json",
  );
  await expect(password).toHaveValue("");
  await privacy.getByLabel("Privacy request type").selectOption("correction");
  const details = `Please review my synthetic profile address ${Date.now()}`;
  await privacy.getByLabel("Request details").fill(details);
  await privacy.getByRole("button", { name: "Send privacy request" }).click();
  await expect(
    privacy
      .locator(".privacy-request")
      .filter({ hasText: details })
      .getByText("Privacy: correction · open", { exact: true }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include(".privacy-workspace")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await privacy.screenshot({ path: "apps/api/data/privacy-review.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
