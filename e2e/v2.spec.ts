import { test, expect } from "@playwright/test";

test("v2 renders all sections with content", async ({ page }) => {
  await page.goto("/v2");
  await expect(page.locator("[data-preloader]")).toBeHidden({ timeout: 8000 });
  for (const id of [
    "v2-hero",
    "v2-manifesto",
    "v2-story",
    "v2-work",
    "v2-craft",
    "v2-contact",
  ]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(page.locator("#v2-hero")).toContainText("JASPER");
  await expect(page.locator("#v2-work")).toContainText("HypHosting");
  await expect(page.locator("#v2-contact")).toContainText("internships");
});
