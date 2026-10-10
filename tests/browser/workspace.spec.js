import { test, expect } from "@playwright/test";

async function login(page, role) {
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

test("built application loads without script errors and logout remains reachable", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "principal");
  const logout = page.getByRole("button", { name: "Sign out", exact: true });
  await expect(logout).toBeInViewport();
  await logout.click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(errors).toEqual([]);
});

test("notice dialog traps keyboard focus, locks scrolling and restores focus", async ({
  page,
}) => {
  await login(page, "principal");
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  const trigger = page.getByRole("button", {
    name: "Publish notice",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Publish a notice" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close dialog" });
  await expect(close).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
});

test("director can switch between assigned schools", async ({ page }) => {
  await login(page, "director");
  const schools = page.getByRole("combobox", { name: "Choose school" });
  await expect(schools.locator("option")).toHaveCount(2);
  await schools.selectOption("school-west");
  await expect(schools).toHaveValue("school-west");
  await expect(
    page
      .getByRole("complementary")
      .getByText("Schoolglass Desk Demo West", { exact: true }),
  ).toBeVisible();
});

test("teachers target assigned classes and unconfigured uploads stay disabled", async ({
  page,
}) => {
  await login(page, "teacher");
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish notice", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog
      .getByLabel("Audience", { exact: true })
      .locator('option:not([value=""])'),
  ).toHaveCount(1);
  await expect(dialog.getByRole("checkbox")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByRole("button", { name: "Add resource", exact: true }).click();
  await expect(page.getByLabel("Resource file")).toBeDisabled();
});

test("students can read notices but cannot publish or onboard people", async ({
  page,
}) => {
  await login(page, "student");
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Publish notice", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add person", exact: true }),
  ).toHaveCount(0);
});

test("mobile navigation exposes logout without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Email address").fill("principal@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await expect(page.getByRole("button", { name: "Toggle menu" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
