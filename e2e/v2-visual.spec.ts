import { test } from "@playwright/test";

// Filmstrip harness for the v2 scrubbed cut — captures the pinned
// choreography at dense stops for review as stills.
test("capture v2 filmstrip", async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    sessionStorage.setItem("ember-preloaded", "1");
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/v2");
  await page.waitForTimeout(2500);

  const total = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  for (let i = 0; i <= 19; i++) {
    const p = i / 19;
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * p));
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `test-results/v2/${String(i).padStart(2, "0")}.png`,
      fullPage: false,
    });
  }
});
