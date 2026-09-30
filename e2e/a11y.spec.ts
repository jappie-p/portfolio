import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// WCAG 2.1 A and AA, checked with axe on the whole page (every topic is in the
// DOM at once) and on an open case panel, in both languages.

const audit = async (page: Page, include?: string) => {
  let axe = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (include) axe = axe.include(include);
  const { violations } = await axe.analyze();
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
};

test("the page passes WCAG 2.1 AA checks", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(await audit(page)).toEqual([]);
});

test("the page passes in English too", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lang", "en"));
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(await audit(page)).toEqual([]);
});

test("an open case panel passes", async ({ page }) => {
  await page.goto("/?case=hyphosting");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  // let the open animation finish: mid-fade the colours are half transparent
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)),
  );
  expect(await audit(page, "[role=dialog]")).toEqual([]);
});
