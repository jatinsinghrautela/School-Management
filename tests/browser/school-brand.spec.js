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
  await expect(
    page.getByRole("combobox", { name: "Choose school" }),
  ).toHaveCount(0);
});

test("sidebar icons are distinct and scrolling preserves sidebar geometry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill("principal@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await expect(
    page.getByRole("button", { name: "Settings", exact: true }),
  ).toBeVisible();
  const nav = page.getByRole("navigation");
  const paths = await nav
    .locator("button svg path")
    .evaluateAll((elements) => elements.map((el) => el.getAttribute("d")));
  expect(new Set(paths).size).toBe(paths.length);
  const before = await nav.boundingBox();
  await nav.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const end = await nav.evaluate((el) => el.scrollTop);
  await nav.hover();
  await page.mouse.wheel(0, 800);
  await expect(nav).toHaveJSProperty("scrollTop", end);
  expect(await nav.boundingBox()).toEqual(before);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeInViewport();
});
