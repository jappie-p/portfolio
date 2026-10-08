import { test, expect, type Locator } from "./test";
import { topicPanelCount } from "../src/lib/chapters";

/** Wait until a topic row has finished its smooth scroll and sits flush at the top. */
const settled = (row: Locator) => expect.poll(() => row.evaluate((el) => Math.abs(el.getBoundingClientRect().top)), { timeout: 12_000 }).toBeLessThan(2);

test("a project opens as a shareable case panel and closes with Escape and back", async ({ page }) => {
  await page.goto("/experience");
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
  await page.goto("/experience?case=louisa");
  await expect(page.getByRole("dialog").getByRole("heading", { level: 2, name: "Louisa Edelstenen" })).toBeVisible({ timeout: 15_000 });
});

test("the case panel keeps focus inside while open", async ({ page }) => {
  await page.goto("/experience?case=zelda");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
});

test("about walks sideways from the hello to my room, my growth and the invitation", async ({ page }) => {
  await page.goto("/experience");
  await page.locator('[data-nav="about"]').click();
  const about = page.locator('[data-section="about"]');
  await settled(about);
  const panel = (name: RegExp) => about.locator(".project-panel", { has: page.getByRole("heading", { level: 2, name }) });
  // the how-to's map of the site draws this many tiles for About
  await expect(about.locator(".project-panel")).toHaveCount(topicPanelCount("about"));
  await expect(panel(/Hoi, ik ben Jasper/)).toBeInViewport({ ratio: 0.9 });
  for (const [from, to] of [
    [/Hoi, ik ben Jasper/, /Dit is mijn wereld/],
    [/Dit is mijn wereld/, /Elke stap vertelt een verhaal/],
    [/Elke stap vertelt een verhaal/, /Laten we iets moois bouwen/],
  ]) {
    // let the sideways scroll land first
    await expect.poll(() => panel(from).evaluate((el) => Math.abs(el.getBoundingClientRect().left)), { timeout: 8000 }).toBeLessThan(2);
    // the keyboard, like the websites walk: a pointer click on a button in a
    // snapping track makes Firefox lose it while it scrolls it into view
    await panel(from).locator(".next-btn").focus();
    await page.keyboard.press("Enter");
    await expect(panel(to)).toBeInViewport({ ratio: 0.9 });
  }
});

test("about's growth tabs switch with the arrow keys, without walking the track", async ({ page }) => {
  await page.goto("/experience");
  await page.locator('[data-nav="about"]').click();
  const about = page.locator('[data-section="about"]');
  await settled(about);
  const growth = about.locator(".project-panel").nth(2);
  await about.locator(".project-track").evaluate((track, i) => {
    const p = track.querySelectorAll<HTMLElement>(".project-panel")[i];
    track.scrollTo({ left: p.offsetLeft, behavior: "instant" });
  }, 2);
  await expect(growth).toBeInViewport({ ratio: 0.9 });
  await growth.getByRole("tab", { name: "Mijn verhaal" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(growth.getByRole("tab", { name: "Vaardigheden" })).toHaveAttribute("aria-selected", "true");
  await expect(growth.getByRole("tabpanel")).toContainText("Hard skills");
  await expect(growth).toBeInViewport({ ratio: 0.9 });
});

test("the game is playable from the school topic", async ({ page, request }) => {
  await page.goto("/experience");
  await page.locator('[data-nav="school"]').click();
  const play = page.locator('[data-section="school"] a', { hasText: "Speel in je browser" });
  await expect(play).toHaveAttribute("href", "/play/zelda/index.html");
  const res = await request.get("/play/zelda/index.html");
  expect(res.status()).toBe(200);
  expect((await request.get("/play/zelda/pygame-zelda.tar.gz")).status()).toBe(200);
});

test("the game also runs inside its panel, and stops again", async ({ page }) => {
  // the Python runtime comes from a CDN; the test only needs our page in the frame
  await page.route(/pygame-web\.github\.io/, (r) => r.abort());
  await page.goto("/experience");
  await page.locator('[data-nav="school"]').click();
  const school = page.locator('[data-section="school"]');
  await settled(school);
  await school.locator(".project-track").evaluate((track) => {
    const panel = track.querySelectorAll<HTMLElement>(".project-panel")[1];
    track.scrollTo({ left: panel.offsetLeft, behavior: "instant" });
  });
  const play = school.getByRole("button", { name: "Speel hier" });
  // the stage floats, so the button never holds still for the stability check
  await play.click({ force: true });
  const frame = school.locator('iframe[title="Zelda Remote Controller, speelbaar in je browser"]');
  await expect(frame).toHaveAttribute("src", "/play/zelda/index.html");
  await expect(frame).toBeFocused();
  await school.getByRole("button", { name: "Stoppen" }).click({ force: true });
  await expect(frame).toHaveCount(0);
  await expect(play).toBeFocused();
});

test("the first screen builds from sketch to render, and a key fast-forwards it", async ({ page }) => {
  // look as soon as the page arrives: the build-up runs from hydration, and
  // some engines fire "load" only once it is well under way
  await page.goto("/experience", { waitUntil: "commit" });
  const build = page.locator("[data-load]");
  await expect(build).toHaveAttribute("data-load", "sketch");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jasper");
  // a key only fast-forwards once the page is live
  await page.waitForFunction(() => document.documentElement.classList.contains("reveal-armed"));
  await page.keyboard.press("Shift");
  await expect(build).toHaveAttribute("data-load", "done", { timeout: 5000 });
});

test("left alone, the build-up finishes by itself", async ({ page }) => {
  await page.goto("/experience");
  await expect(page.locator("[data-load]")).toHaveAttribute("data-load", "done", { timeout: 10_000 });
});

test("a print on the School wall zooms into its project's panel", async ({ page }) => {
  await page.goto("/experience");
  await page.locator('[data-nav="school"]').click();
  const school = page.locator('[data-section="school"]');
  await settled(school);
  await school.getByRole("button", { name: "Zelda Remote Controller: Bekijk project" }).click({ force: true });
  const zelda = school.locator(".project-panel", { has: page.getByRole("heading", { level: 3, name: "Zelda Remote Controller" }) });
  await expect.poll(() => zelda.evaluate((el) => Math.abs(el.getBoundingClientRect().left)), { timeout: 8000 }).toBeLessThan(2);
  await expect(zelda).toBeFocused();
});
