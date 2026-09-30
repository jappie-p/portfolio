#!/usr/bin/env node
/**
 * Renders the CV route (nl and en) to PDF and reports each file's page count.
 *
 * Usage:
 *   node scripts/cv-pdf.mjs [baseUrl]
 *
 * baseUrl defaults to http://localhost:3000. Requires a `next dev` (or a
 * production) server already running at that URL; this script does not
 * start one itself. Uses Playwright's Chromium from node_modules/playwright
 * (a transitive dependency of @playwright/test, not installed separately).
 *
 * Output: public/cv/jasper-pathuis-cv-nl.pdf, public/cv/jasper-pathuis-cv-en.pdf
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "cv");

const baseUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const TARGETS = [
  { lang: "nl", file: "jasper-pathuis-cv-nl.pdf" },
  { lang: "en", file: "jasper-pathuis-cv-en.pdf" },
];

/** Page count via poppler's pdfinfo (already used for rasterizing previews). */
function pageCount(pdfPath) {
  try {
    const out = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    const match = out.match(/^Pages:\s*(\d+)/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    for (const { lang, file } of TARGETS) {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/cv/${lang}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      const outPath = path.join(OUT_DIR, file);
      await page.pdf({
        path: outPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      await page.close();

      const pages = pageCount(outPath);
      console.log(`${file}: ${pages ?? "?"} page(s) -> ${path.relative(ROOT, outPath)}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
