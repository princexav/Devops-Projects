import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test("should display the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "HealthPulse" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("should login and redirect to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("sarah.johnson@email.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("should show dashboard content after login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password").fill("test");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Upcoming Appointments")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@test.com");
    await page.getByLabel("Password").fill("test");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test("should navigate to appointments", async ({ page }) => {
    await page.getByRole("link", { name: "Appointments" }).click();
    await expect(page).toHaveURL(/appointments/);
  });

  test("should navigate to lab results", async ({ page }) => {
    await page.getByRole("link", { name: "Lab Results" }).click();
    await expect(page).toHaveURL(/labs/);
  });

  test("should navigate to messages", async ({ page }) => {
    await page.getByRole("link", { name: "Messages" }).click();
    await expect(page).toHaveURL(/messages/);
  });

  test("should navigate to profile", async ({ page }) => {
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/profile/);
  });
});
