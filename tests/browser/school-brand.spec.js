import { test, expect } from "@playwright/test";

test("school palette is saved for all members and platform branding is secondary", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill("principal@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await expect(page.locator(".school-brand-name")).toHaveText(
    "Schoolglass Desk Demo North",
  );
  await expect(
    page.getByText("Powered by Schoolglass Desk", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Ocean theme", exact: true }).click();
  await expect(
    page.getByText("School appearance and regional settings saved.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".shell")).toHaveCSS("--school-accent", "#245ac0");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email address").fill("student@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await expect(page.locator(".shell")).toHaveCSS("--school-accent", "#245ac0");
  await expect(page.locator(".school-brand-mark")).toBeVisible();
});
