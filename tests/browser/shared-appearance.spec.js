import { test, expect } from "@playwright/test";

test("two-option appearance toggle stays responsive", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("combobox", { name: "Color theme" })).toHaveCount(
    0,
  );
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
    expect(header.y + header.height).toBeLessThanOrEqual(content.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
