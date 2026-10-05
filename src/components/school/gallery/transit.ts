import { prefersReducedMotion } from "@/lib/motion";

/** "in": through a print into its project; "out": from a project back into its print. */
export type Passage = "in" | "out";

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
let latest = 0;

/**
 * Swap what the screen shows (`update` moves the page), as one continuous
 * move, styled in globals.css by `html[data-passage]`. Where the print
 * already covers its own slice of the panel the two simply cross-fade;
 * with `zoom` (a narrow room, where they cannot line up) the old view grows
 * past you (in) or shrinks back into the print (out) while the new one
 * settles. Without view transitions, a moment of dark covers the switch.
 */
export async function pass(kind: Passage, update: () => void, zoom = false): Promise<void> {
  if (prefersReducedMotion()) return update();
  const html = document.documentElement;
  if (typeof document.startViewTransition === "function") {
    const mine = ++latest;
    html.dataset.passage = zoom ? `${kind}-zoom` : kind;
    // the new view is live while it fades in: the scene keeps drawing under it
    const vt = document.startViewTransition(update);
    try {
      await vt.finished;
    } catch {
      // skipped by a newer passage: that one carries on
    } finally {
      if (mine === latest) delete html.dataset.passage;
    }
    return;
  }
  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  Object.assign(veil.style, { position: "fixed", inset: "0", zIndex: "90", pointerEvents: "none", background: "#05080d", opacity: "0" });
  document.body.appendChild(veil);
  try {
    await veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-in", fill: "forwards" }).finished;
    update();
    await frame();
    await frame();
    await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, easing: "ease-out", fill: "forwards" }).finished;
  } finally {
    veil.remove();
  }
}
