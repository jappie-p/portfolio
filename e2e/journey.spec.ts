import { test, expect } from "@playwright/test";

test("journey renders all chapters and hero name", async ({ page }) => {
  await page.goto("/");
  // Preloader completes (or was skipped) within 8s.
  await expect(page.locator("[data-preloader]")).toBeHidden({ timeout: 8000 });
  await expect(page.locator("h1")).toContainText("JASPER");
  for (const id of ["hero", "dream", "turn", "work", "craft", "contact"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test("case stub pages resolve", async ({ page }) => {
  await page.goto("/work/hyphosting");
  await expect(page.locator("h1")).toContainText("HypHosting");
  await page.goto("/work/jarvis");
  await expect(page.locator("h1")).toContainText("Jarvis");
});

test("content survives without WebGL (fallback mode)", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    // Force the WebGL detection to fail.
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("JASPER", { timeout: 15000 });
  await expect(page.locator("#contact")).toHaveCount(1);
});
