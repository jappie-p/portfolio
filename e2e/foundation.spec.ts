import { test, expect } from "./test";

test("defaults to Dutch and persists an English toggle", async ({ page }) => {
  await page.goto("/experience");
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page.getByText("Van game-artist naar developer").first()).toBeVisible();
  await page.locator("header").getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("From game artist to developer").first()).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("nav reaches every section", async ({ page }) => {
  await page.goto("/experience");
  for (const id of ["about", "websites", "ai", "cyber", "school", "contact"]) {
    await page.locator(`[data-nav="${id}"]`).click();
    await expect(page.locator(`[data-section="${id}"]`)).toBeInViewport({ timeout: 5000 });
  }
});

test("makes no sound: no audio at all, and every video is muted", async ({ page }) => {
  await page.goto("/experience");
  await expect(page.locator("audio")).toHaveCount(0);
  const unmuted = await page.evaluate(() => [...document.querySelectorAll("video")].filter((v) => !v.muted).length);
  expect(unmuted).toBe(0);
});
