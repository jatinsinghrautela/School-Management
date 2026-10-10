import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("toggle follows system initially and remembers an explicit choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.getByRole("group", { name: "Color theme" });
  await expect(toggle.getByRole("button")).toHaveCount(2);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await toggle.getByRole("button", { name: "Dark", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

for (const colorScheme of ["light", "dark"]) {
  test(`${colorScheme} workspace pages retain accessible contrast`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    async function scan(name) {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect
        .soft(
          results.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
          name,
        )
        .toEqual([]);
    }
    await scan("Login");
    await page.getByLabel("Email address").fill("principal@orbit.local");
    await page.getByLabel("Password", { exact: true }).fill("OrbitDemo123!");
    await page
      .getByRole("button", { name: "Sign in to Schoolglass Desk" })
      .click();
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible();
    const names = await page
      .getByRole("navigation")
      .getByRole("button")
      .allTextContents();
    for (const name of names) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: name.trim(), exact: true })
        .click();
      await expect(
        page.getByText("Syncing your workspace…", { exact: true }),
      ).toHaveCount(0);
      await scan(name);
      if (name.trim() === "Notices") {
        await page
          .getByRole("button", { name: "Publish notice", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Publish a notice" }),
        ).toBeVisible();
        await scan("Publishing dialog");
        await page.keyboard.press("Escape");
      }
    }
  });
}
