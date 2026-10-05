import { test, expect } from "@playwright/test";

// Phone-sized WebKit (see playwright.config.ts): the menu sheet replaces the
// top nav, nothing scrolls sideways by accident, and the key flows still work.

test("the menu sheet reaches every section", async ({ page }) => {
  await page.goto("/experience");
  for (const [label, id] of [
    ["Over mij", "about"],
    ["School", "school"],
    ["Contact", "contact"],
  ]) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: label }).click();
    await expect(page.locator(`[data-section="${id}"]`)).toBeInViewport({ timeout: 5000 });
  }
});

test("the page never scrolls sideways as a whole", async ({ page }) => {
  await page.goto("/experience");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a case panel opens as a sheet and closes again", async ({ page }) => {
  await page.goto("/experience?case=festival");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { level: 2 })).toContainText("Festival", { timeout: 15_000 });
  await dialog.getByRole("button", { name: /Sluiten/ }).click();
  await expect(dialog).toBeHidden();
});

test("the game's trailer plays without a play button, since the game needs a keyboard", async ({ page }) => {
  await page.goto("/experience");
  const school = page.locator('[data-section="school"]');
  await school.scrollIntoViewIfNeeded();
  await expect(school.getByRole("button", { name: "Speel hier" })).toBeHidden();
  await expect(school.locator("video").first()).toBeAttached();
});
