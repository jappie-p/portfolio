import type { Page } from "@playwright/test";

export async function gotoCyber(page: Page) {
  await page.locator('[data-nav="cyber"]').click();
  await page.locator('[data-section="cyber"]').evaluate((s) => s.scrollIntoView({ behavior: "instant", block: "start" }));
}

export async function renderer(page: Page) {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "none";
  });
}

export const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|none/i;
