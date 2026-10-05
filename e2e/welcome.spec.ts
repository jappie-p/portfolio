import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The front door at /: two ways in, a how-to before the experience the
// first time, and old links that still land in the experience.

test("the front door offers two ways in, the simple one marked as coming", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Hoe wil je kijken?" })).toBeVisible();
  await expect(page.locator('[aria-disabled="true"]', { hasText: "Simpel" })).toContainText("Binnenkort");
  await expect(page.getByRole("link", { name: /De ervaring/ })).toHaveAttribute("href", "/experience");
});

test("the how-to teaches the three moves, then grows into the experience", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /De ervaring/ }).click();
  const tour = page.getByRole("dialog", { name: "Zo kijk je rond" });
  await expect(tour).toBeVisible();
  await expect(tour.getByRole("heading", { name: "Omlaag voor het volgende onderwerp" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(tour.getByRole("heading", { name: "Opzij voor de projecten" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(tour.getByRole("heading", { name: /Klik op een werk/ })).toBeVisible();
  await tour.getByRole("button", { name: "Happy Herbivore Kiosk" }).click();
  await tour.getByRole("button", { name: "Naar binnen" }).click();
  await expect(page).toHaveURL(/\/experience$/);
  await expect(page.locator('[data-section="hero"]')).toBeVisible();

  // the next visit goes straight in, and offers the how-to again
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Uitleg opnieuw bekijken" })).toBeVisible();
  await page.getByRole("link", { name: /De ervaring/ }).click();
  await expect(page).toHaveURL(/\/experience$/);
});

test("Escape closes the how-to, and skipping goes straight in", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("link", { name: /De ervaring/ });
  await open.click();
  const tour = page.getByRole("dialog", { name: "Zo kijk je rond" });
  await expect(tour).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tour).toBeHidden();
  await open.click();
  await tour.getByRole("button", { name: "Overslaan" }).click();
  await expect(page).toHaveURL(/\/experience$/);
});

test("links into the experience from before it moved still land there", async ({ page }) => {
  await page.goto("/#school");
  await expect(page).toHaveURL(/\/experience#school$/);
  await page.goto("/?case=zelda");
  await expect(page).toHaveURL(/\/experience\?case=zelda$/);
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
});

test("the front door and the how-to pass WCAG 2.1 AA checks", async ({ page }) => {
  const audit = async () => {
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
  };
  await page.goto("/");
  await page.waitForTimeout(1200);
  expect(await audit()).toEqual([]);
  await page.getByRole("link", { name: /De ervaring/ }).click();
  await page.waitForTimeout(1500);
  expect(await audit()).toEqual([]);
});

test.describe("without scripts", () => {
  test.use({ javaScriptEnabled: false });

  test("the experience is a plain link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /De ervaring/ }).click();
    await expect(page).toHaveURL(/\/experience$/);
  });
});
