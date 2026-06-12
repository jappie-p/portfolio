import { test } from "@playwright/test";

// Not an assertion suite — a visual harness. Captures the journey at each
// chapter so scene changes can be reviewed as images without a browser.
test("capture journey snapshots", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    sessionStorage.setItem("ember-preloaded", "1");
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(2500); // canvas + first frame settle

  const total = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  const stops: [string, number][] = [
    ["0-hero", 0],
    ["1-dream", 0.18],
    ["2-turn", 0.36],
    ["3-work", 0.56],
    ["4-craft", 0.78],
    ["5-contact", 0.97],
  ];
  for (const [name, p] of stops) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * p));
    await page.waitForTimeout(1800); // lenis + camera lerp settle
    await page.screenshot({
      path: `test-results/visual/${name}.png`,
      fullPage: false,
    });
  }
});
