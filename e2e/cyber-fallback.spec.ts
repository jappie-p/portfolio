import { test, expect } from "@playwright/test";
import { gotoCyber, renderer, SOFTWARE } from "./cyber-helpers";

// Playwright's headless shell renders WebGL in software (SwiftShader).
test("without a hardware GPU the cyber topic shows the poster and still tells the story sideways", async ({ page }) => {
  await page.goto("/");
  test.skip(!SOFTWARE.test(await renderer(page)), "this browser has a GPU");
  await gotoCyber(page);
  const section = page.locator('[data-section="cyber"]');
  await expect(section.locator("canvas")).toHaveCount(0);
  await expect(section.locator('[style*="firewall-poster.jpg"]')).toHaveCount(1);
  await expect(section.locator(".project-panel")).toHaveCount(4);
});
