import { test, expect } from "@playwright/test";

// The endpoint allows a few messages per visitor per ten minutes; give every
// run its own visitor so repeated runs don't trip the limit.
test.use({ extraHTTPHeaders: { "cf-connecting-ip": `203.0.113.${Math.floor(Math.random() * 250) + 1}` } });

test("the contact form checks the fields, then sends", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-nav="contact"]').click();
  const form = page.locator('[data-section="contact"] form');

  // empty: every field says what's missing, focus goes to the first
  await form.getByRole("button", { name: "Verstuur" }).click();
  await expect(form.getByText("Vul je naam in.")).toBeVisible();
  await expect(form.getByText("Vul een geldig e-mailadres in.")).toBeVisible();
  await expect(form.getByText("Schrijf minstens een paar woorden.")).toBeVisible();
  await expect(form.getByLabel("Naam")).toBeFocused();

  await form.getByLabel("Naam").fill("Playwright");
  await form.getByLabel("E-mailadres").fill("test@example.com");
  await form.getByLabel("Bericht").fill("Een testbericht vanuit de end-to-end tests.");
  // a person takes a moment to write; the form ignores instant submissions
  await page.waitForTimeout(2600);
  await form.getByRole("button", { name: "Verstuur" }).click();
  await expect(page.getByRole("status")).toContainText("Bedankt!", { timeout: 15_000 });
});

test("the contact endpoint rate-limits a visitor", async ({ request }) => {
  const headers = { "cf-connecting-ip": "198.51.100.7" };
  const ok = { name: "Limit test", email: "limit@example.com", message: "Checking the rate limit works.", elapsedMs: 9000 };
  const codes: number[] = [];
  for (let i = 0; i < 4; i++) codes.push((await request.post("/api/contact", { headers, data: ok })).status());
  expect(codes.slice(-1)[0]).toBe(429);
});

test("the contact endpoint turns away bad input and bots", async ({ request }) => {
  const bad = await request.post("/api/contact", { data: { name: "x", email: "nope", message: "hi", elapsedMs: 9000 } });
  expect(bad.status()).toBe(422);
  expect((await bad.json()).fields).toEqual(["name", "email", "message"]);

  // the honeypot is filled: accepted on the surface, never delivered
  const bot = await request.post("/api/contact", {
    data: { name: "Bot", email: "bot@example.com", message: "Buy cheap things now please", company: "spam inc", elapsedMs: 9000 },
  });
  expect(bot.status()).toBe(200);
});
