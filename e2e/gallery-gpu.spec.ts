import { test, expect, type Page } from "./test";
import { renderer, SOFTWARE } from "./cyber-helpers";

// The School gallery's guided way between its projects needs the live
// gallery, so a real GPU: installed Chrome runs headless on it.
test.use({ channel: "chrome" });

test.beforeEach(async ({ page }) => {
  await page.goto("/experience");
  const r = await renderer(page);
  test.skip(SOFTWARE.test(r), `no hardware GPU here (${r})`);
});

/** Which School panel is in front: 0 the gallery, then one per project. */
const panel = (page: Page) =>
  page.locator('[data-section="school"] .project-track').evaluate((t) => Math.round(t.scrollLeft / t.clientWidth));

test("a print dives into its project, and the way on goes back through the gallery", async ({ page }) => {
  await page.locator('[data-nav="school"]').click();
  const school = page.locator('[data-section="school"]');
  await expect(school.locator("[data-ready]")).toBeAttached({ timeout: 30_000 });
  await school.getByRole("button", { name: "Zelda Remote Controller: Bekijk project" }).click({ force: true });
  await expect.poll(() => panel(page), { timeout: 8000 }).toBe(1);

  // from a project: the next print peeks in, and a step on lands in the next project
  await expect(school.getByRole("button", { name: "Volgende: Happy Herbivore Kiosk" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => panel(page), { timeout: 8000 }).toBe(2);

  // a quick run of steps chains on without stopping: back, on, on
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => panel(page), { timeout: 10_000 }).toBe(3);

  // Escape backs out into the gallery
  await page.keyboard.press("Escape");
  await expect.poll(() => panel(page), { timeout: 8000 }).toBe(0);
  await expect(school.getByRole("button", { name: "Terug naar de galerij" })).toBeHidden();
});
