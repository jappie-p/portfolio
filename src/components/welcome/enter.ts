import { prefersReducedMotion } from "@/lib/motion";

const DONE = "tour-done";

/** Whether this reader has been through the how-to before. */
export function tourDone(): boolean {
  try {
    return localStorage.getItem(DONE) === "1";
  } catch {
    return false;
  }
}

export function markTourDone() {
  try {
    localStorage.setItem(DONE, "1");
  } catch {
    // private mode: the how-to just offers itself again next time
  }
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Wait until `ready` holds (checked every frame), or `ms` have passed. */
async function until(ready: () => boolean, ms: number) {
  const end = performance.now() + ms;
  while (!ready() && performance.now() < end) await frame();
}

/**
 * Into the experience: a dark window grows out of `from` (the preview on
 * its card, or the map's first tile) until it fills the screen, the page
 * underneath becomes the experience (`go`), and the dark lifts off its
 * first frame, which is just as dark. The window lives outside React, so
 * it outlasts the page it started on.
 */
export async function enterExperience(from: HTMLElement | null, go: () => void) {
  if (!from || prefersReducedMotion()) return go();
  const r = from.getBoundingClientRect();
  const radius = getComputedStyle(from).borderRadius;
  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  Object.assign(veil.style, { position: "fixed", left: "0", top: "0", zIndex: "100", pointerEvents: "none", background: "#05080d", overflow: "hidden" });
  document.body.appendChild(veil);
  const box = (x: number, y: number, w: number, h: number, rad: string) => ({ transform: `translate(${x}px, ${y}px)`, width: `${w}px`, height: `${h}px`, borderRadius: rad });
  try {
    await veil.animate([box(r.left, r.top, r.width, r.height, radius), box(0, 0, innerWidth, innerHeight, "0px")], { duration: 760, easing: "cubic-bezier(0.7, 0, 0.2, 1)", fill: "forwards" }).finished;
    go();
    await until(() => location.pathname.endsWith("/experience") && !!document.querySelector('[data-section="hero"]'), 5000);
    await frame();
    await frame();
    await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 520, easing: "ease-out", fill: "forwards" }).finished;
  } finally {
    veil.remove();
  }
}
