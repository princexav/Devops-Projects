import { test, expect } from "@playwright/test";

test.describe("Health Check", () => {
  test("application loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "HealthPulse" })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test("login page is responsive", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });
});
