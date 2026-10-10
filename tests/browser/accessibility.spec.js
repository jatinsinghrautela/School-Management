import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function check(page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

test("login accessibility at desktop and mobile sizes", async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await check(page);
  }
});

for (const role of ["owner", "principal", "teacher", "student"]) {
  test(`${role} dashboard accessibility`, async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email address").fill(`${role}@orbit.local`);
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
    await check(page);
    if (role !== "owner") {
      await page.getByRole("button", { name: "Notices", exact: true }).click();
      await expect(
        page.getByText("Syncing your workspace…", { exact: true }),
      ).toHaveCount(0);
      await check(page);
      if (role === "principal" || role === "teacher") {
        await page
          .getByRole("button", { name: "Publish notice", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Publish a notice" }),
        ).toBeVisible();
        await check(page);
      }
    }
  });
}
