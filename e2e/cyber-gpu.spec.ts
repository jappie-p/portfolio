import { test, expect } from "@playwright/test";
import { gotoCyber, renderer, SOFTWARE } from "./cyber-helpers";

// Installed Chrome runs headless on the GPU; Playwright's headless shell does not.
test.use({ channel: "chrome" });

test.beforeEach(async ({ page }) => {
  await page.goto("/experience");
  const r = await renderer(page);
  test.skip(SOFTWARE.test(r), `no hardware GPU here (${r})`);
});

test("cyber scene renders live WebGL and plays its chapters sideways", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.reload();
  await gotoCyber(page);
  const section = page.locator('[data-section="cyber"]');
  await expect(section.locator("canvas")).toBeVisible({ timeout: 20_000 });

  // the next buttons walk the story: overview, attack, defence, Homelab
  const card = section.locator(".glass", { hasText: "Homelab" });
  await expect(card).not.toBeInViewport();
  const chapters = section.locator(".cyber-chapter");
  for (let i = 0; i < 3; i++) {
    await chapters.nth(i).locator(".next-btn").click();
    await expect(chapters.nth(i + 1)).toBeInViewport({ ratio: 0.9 });
  }
  await expect(card).toBeInViewport();

  // shader compile failures and font errors surface as console errors
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test("reduced motion still renders the scene, one frame per chapter", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/experience");
  await gotoCyber(page);
  const section = page.locator('[data-section="cyber"]');
  await expect(section.locator("canvas")).toBeVisible({ timeout: 20_000 });
  await expect(section.locator(".project-panel")).toHaveCount(4);
  await ctx.close();
});
