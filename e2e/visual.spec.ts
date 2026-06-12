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
  // Filmstrip: dense stops so camera choreography (arrive/hold/whoosh)
  // can be judged from stills.
  const stops: [string, number][] = [
    ["00-hero", 0],
    ["01-dive", 0.1],
    ["02-dream", 0.2],
    ["03-bank", 0.3],
    ["04-web", 0.4],
    ["05-divehall", 0.48],
    ["06-hall", 0.56],
    ["07-glide", 0.65],
    ["08-rise", 0.72],
    ["09-city", 0.82],
    ["10-descend", 0.9],
    ["11-arena", 0.99],
  ];
  for (const [name, p] of stops) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * p));
    await page.waitForTimeout(1500); // lenis + camera lerp settle
    await page.screenshot({
      path: `test-results/visual/${name}.png`,
      fullPage: false,
    });
  }
});
