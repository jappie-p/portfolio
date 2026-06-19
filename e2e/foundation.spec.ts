import { test, expect } from "@playwright/test";

test("defaults to Dutch and persists an English toggle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page.getByText("Game-artist die developer werd")).toBeVisible();
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Game artist turned developer")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("nav reaches every section", async ({ page }) => {
  await page.goto("/");
  for (const id of ["websites", "ai", "cyber", "about", "contact"]) {
    await page.locator(`[data-nav="${id}"]`).click();
    await expect(page.locator(`[data-section="${id}"]`)).toBeInViewport({ timeout: 5000 });
  }
});

test("makes no sound on arrival", async ({ page }) => {
  await page.goto("/");
  const media = await page.evaluate(() => document.querySelectorAll("audio,video").length);
  expect(media).toBe(0);
});
