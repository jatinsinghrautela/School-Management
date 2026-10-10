import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("small-screen theme controls remain clear of cards and dark options are readable", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const theme = page.getByRole("combobox", { name: "Color theme" });
  const control = await theme.boundingBox();
  const story = await page.locator(".login-story").boundingBox();
  expect(control.y + control.height).toBeLessThanOrEqual(story.y);
  const colors = await theme
    .locator('option[value="light"]')
    .evaluate((el) => ({
      color: getComputedStyle(el).color,
      background: getComputedStyle(el).backgroundColor,
    }));
  expect(colors).toEqual({
    color: "rgb(237, 246, 243)",
    background: "rgb(16, 33, 38)",
  });
  await page.getByLabel("Email address").fill("principal@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await expect(page.getByRole("button", { name: "Toggle menu" })).toBeVisible();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const header = await page.locator(".topbar").boundingBox();
    const content = await page.locator(".content").boundingBox();
    const selector = await theme.boundingBox();
    expect(selector.y + selector.height).toBeLessThanOrEqual(
      header.y + header.height,
    );
    expect(header.y + header.height).toBeLessThanOrEqual(content.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("system theme tracks OS changes and explicit choices persist", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const theme = page.getByRole("combobox", { name: "Color theme" });
  await expect(theme).toHaveValue("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await theme.selectOption("dark");
  await page.reload();
  await expect(theme).toHaveValue("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await theme.selectOption("light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await theme.selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("dark login and principal workspace retain accessible contrast", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  async function scan() {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await scan();
  await page.getByLabel("Email address").fill("principal@orbit.local");
  await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
  await page
    .getByRole("button", { name: "Sign in to Schoolglass Desk" })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Syncing your workspace…", { exact: true }),
  ).toHaveCount(0);
  await scan();
  await page.getByRole("button", { name: "Notices", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish notice", exact: true })
    .click();
  await scan();
});
