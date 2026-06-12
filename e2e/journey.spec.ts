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

test("wheel scrolling actually moves the page (Lenis wired to ticker)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-preloader]")).toBeHidden({ timeout: 8000 });
  await page.mouse.wheel(0, 2000);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeGreaterThan(50);
});

test("same-session reload does not leave a stuck preloader", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-preloader]")).toBeHidden({ timeout: 8000 });
  await page.reload();
  await expect(page.locator("[data-preloader]")).toBeHidden({ timeout: 4000 });
  await expect(page.locator("h1")).toContainText("JASPER");
});

test("custom fonts actually load and apply to rendered text", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-preloader]")).toBeHidden({ timeout: 8000 });
  // next/font names families after the exports in src/lib/fonts.ts.
  const h1Font = await page
    .locator("h1")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1Font).toContain("displayFont");
  const bodyFont = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily
  );
  expect(bodyFont).toContain("bodyFont");
  // And the actual woff2 files must be loaded, not just requested.
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      display: document.fonts.check("1em displayFont"),
      body: document.fonts.check("1em bodyFont"),
    };
  });
  expect(loaded.display).toBe(true);
  expect(loaded.body).toBe(true);
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
