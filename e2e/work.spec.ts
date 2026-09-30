import { test, expect, type Locator } from "@playwright/test";

/** Wait until a topic row has finished its smooth scroll and sits flush at the top. */
const settled = (row: Locator) => expect.poll(() => row.evaluate((el) => Math.abs(el.getBoundingClientRect().top)), { timeout: 8000 }).toBeLessThan(2);

test("a project opens as a shareable case panel and closes with Escape and back", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-nav="websites"]').click();
  const websites = page.locator('[data-section="websites"]');
  await settled(websites);

  // sideways to the first site with the keyboard, then open its case
  const next = websites.locator(".project-panel").first().locator(".next-btn");
  await next.focus();
  await page.keyboard.press("Enter");
  const site = websites.locator(".project-panel", { has: page.getByRole("heading", { level: 3, name: "HypHosting" }) });
  await expect(site).toBeInViewport({ ratio: 0.9 });
  // wait for the sideways smooth scroll to land before pressing the button
  await expect.poll(() => site.evaluate((el) => Math.abs(el.getBoundingClientRect().left)), { timeout: 8000 }).toBeLessThan(2);
  await site.getByRole("button", { name: "Bekijk project" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { level: 2, name: "HypHosting" })).toBeVisible();
  await expect(page).toHaveURL(/\?case=hyphosting/);
  await expect(dialog.getByRole("link", { name: /Bekijk live/ })).toHaveAttribute("href", "https://hyphosting.com");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/case=/);

  // a shared link opens the case straight away
  await page.goto("/?case=louisa");
  await expect(page.getByRole("dialog").getByRole("heading", { level: 2, name: "Louisa Edelstenen" })).toBeVisible({ timeout: 15_000 });
});

test("the case panel keeps focus inside while open", async ({ page }) => {
  await page.goto("/?case=zelda");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
});

test("about walks sideways from the bio to skills, learning and more work", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-nav="about"]').click();
  const about = page.locator('[data-section="about"]');
  await settled(about);
  const panel = (name: string) => about.locator(".project-panel", { has: page.getByRole("heading", { level: 2, name }) });
  await expect(panel("Over mij")).toBeInViewport({ ratio: 0.9 });
  for (const [from, to] of [
    ["Over mij", "Skills"],
    ["Skills", "Wat ik nog wil leren"],
    ["Wat ik nog wil leren", "Meer werk"],
  ]) {
    await panel(from).locator(".next-btn").click();
    await expect(panel(to)).toBeInViewport({ ratio: 0.9 });
  }
});

test("the game is playable from the school topic", async ({ page, request }) => {
  await page.goto("/");
  await page.locator('[data-nav="school"]').click();
  const play = page.locator('[data-section="school"] a', { hasText: "Speel in je browser" });
  await expect(play).toHaveAttribute("href", "/play/zelda/index.html");
  const res = await request.get("/play/zelda/index.html");
  expect(res.status()).toBe(200);
  expect((await request.get("/play/zelda/pygame-zelda.tar.gz")).status()).toBe(200);
});
