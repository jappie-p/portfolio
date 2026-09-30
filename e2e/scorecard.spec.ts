import { test, expect, type Page } from "@playwright/test";

// The school's "Validatie formulier" for the portfolio, line by line, checked
// against the live page. Each test names the form line it proves.

const openCase = async (page: Page, slug: string) => {
  await page.goto(`/?case=${slug}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
};

test.describe("portfolio site (2.x)", () => {
  test("2.2.2 one language at a time: English shows no Dutch", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const text = await page.locator("#journey-root").innerText();
    for (const dutch of ["Bekijk", "Over mij", "Mijn rol", "Schoolprojecten", "Laten we", "Stuur een bericht", "Waarom ik"]) {
      expect(text, dutch).not.toContain(dutch);
    }
  });

  test("2.2.5 the cv is a pdf, in both languages", async ({ request }) => {
    for (const lang of ["nl", "en"]) {
      const res = await request.get(`/cv/jasper-pathuis-cv-${lang}.pdf`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("application/pdf");
    }
  });

  test("2.2.8 professional media only: GitHub, no social media", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    expect(hrefs.some((h) => h.startsWith("https://github.com/jappie-p"))).toBe(true);
    expect(hrefs.filter((h) => /instagram|tiktok|facebook|snapchat|x\.com|twitter/.test(h))).toEqual([]);
  });

  test("2.5 nothing privacy-sensitive: no phone, address or date of birth", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/\+31|\b06[- ]?\d{8}\b|Apollo|Soesterberg|12-09-2006|geboortedatum/i);
  });
});

test.describe("home (3.x)", () => {
  test("3.1 name and what I do, first thing on the page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Jasper");
    await expect(page.getByText("Van game-artist naar developer").first()).toBeVisible();
  });

  test("3.3 every project area is one click from the menu", async ({ page }) => {
    await page.goto("/");
    for (const id of ["websites", "ai", "cyber", "school"]) await expect(page.locator(`header [data-nav="${id}"]`)).toBeVisible();
  });
});

test.describe("projects (4.x)", () => {
  test("4.1 a case shows role, dates, solo or team, highlights, code and stack", async ({ page }) => {
    const dialog = await openCase(page, "hyphosting");
    await expect(dialog.getByText("Mijn rol")).toBeVisible();
    await expect(dialog.getByText(/2026 tot nu/)).toBeVisible();
    await expect(dialog.getByText("Solo", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Hoogtepunten")).toBeVisible();
    await expect(dialog.locator(".code-block pre")).toBeVisible();
    await expect(dialog.getByText("Gebouwd met")).toBeVisible();
  });

  test("4.2 school projects are labelled as such", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-nav="school"]').click();
    await expect(page.getByRole("heading", { level: 2, name: "Schoolprojecten" })).toBeVisible();
  });

  test("4.3 the most important projects are marked", async ({ page }) => {
    const dialog = await openCase(page, "hyphosting");
    await expect(dialog.getByText("Uitgelicht")).toBeVisible();
  });

  test("4.5 team work is shown, with my role in it", async ({ page }) => {
    const dialog = await openCase(page, "kiosk");
    await expect(dialog.getByText("Team", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Mijn rol")).toBeVisible();
  });

  test("4.6 projects come with a short video, silent", async ({ page }) => {
    for (const slug of ["hyphosting", "louisa", "zelda"]) {
      const dialog = await openCase(page, slug);
      const video = dialog.locator("video");
      await expect(video).toHaveCount(1);
      expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    }
  });
});

test.describe("about (5)", () => {
  test("photo, story, why, skills hard and soft, learning, references and cv", async ({ page }) => {
    await page.goto("/");
    const about = page.locator('[data-section="about"]');
    await expect(about.getByRole("img", { name: "Portretfoto van Jasper Pathuis" })).toBeVisible();
    for (const text of ["Waarom ik dit doe", "Hard skills", "Soft skills", "Wat ik nog wil leren", "Referenties"]) {
      await expect(about.getByText(text).first()).toBeAttached();
    }
    await expect(about.getByRole("link", { name: /Download mijn cv/ })).toHaveAttribute("href", "/cv/jasper-pathuis-cv-nl.pdf");
  });
});

test.describe("contact (6)", () => {
  test("email, an online form and my region on a world map", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-nav="contact"]').click();
    const contact = page.locator('[data-section="contact"]');
    await expect(contact.getByRole("button", { name: /pathuisjasper@gmail\.com/ })).toBeVisible();
    await expect(contact.getByRole("button", { name: "Verstuur" })).toBeVisible();
    await expect(contact.getByRole("img", { name: /Wereldkaart/ })).toBeVisible();
    await expect(contact.getByText("Regio Utrecht, Nederland")).toBeVisible();
  });
});
