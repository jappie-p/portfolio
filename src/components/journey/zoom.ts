import { prefersReducedMotion } from "@/lib/motion";

const EASE = "cubic-bezier(0.7, 0, 0.2, 1)";
const GROW_MS = 760;
/** How long the picture holds the screen after the page has moved under it,
 *  so the scene there can mount and draw its first frame. */
const HOLD_MS = 340;
const FADE_MS = 560;

let busy = false;

/**
 * Zoom into a world: the picture inside `from` (a door, a poster) grows from
 * where it sits until it fills the screen; while it covers everything the page
 * moves to that world underneath (`arrive`), then the picture fades into the
 * live scene. It starts from the image the element already shows and swaps in
 * a sharper one (`srcSet`) as it grows. Reduced motion simply arrives.
 */
export async function zoomInto(from: HTMLElement, arrive: () => void, { srcSet, position = "50% 50%" }: { srcSet?: string; position?: string } = {}) {
  const shown = from.querySelector("img");
  if (busy || prefersReducedMotion() || !shown) {
    arrive();
    return;
  }
  busy = true;
  const r = from.getBoundingClientRect();
  const radius = getComputedStyle(from).borderRadius;

  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  Object.assign(veil.style, {
    position: "fixed",
    left: "0px",
    top: "0px",
    width: `${r.width}px`,
    height: `${r.height}px`,
    transform: `translate(${r.left}px, ${r.top}px)`,
    borderRadius: radius,
    overflow: "hidden",
    zIndex: "90",
    pointerEvents: "none",
    background: "#05080d",
    boxShadow: "0 30px 120px rgba(0, 0, 0, 0.6)",
  });
  const img = document.createElement("img");
  img.alt = "";
  img.src = shown.currentSrc || shown.src;
  Object.assign(img.style, { display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: position });
  veil.appendChild(img);
  document.body.appendChild(veil);

  // a sharper picture for the full screen, swapped in once it is decoded
  if (srcSet) {
    const sharp = new Image();
    sharp.sizes = "100vw";
    sharp.srcset = srcSet;
    sharp.decode().then(() => (img.src = sharp.currentSrc || img.src)).catch(() => {});
  }

  const to = { width: `${innerWidth}px`, height: `${innerHeight}px`, transform: "translate(0px, 0px)", borderRadius: "0px" };
  const from0 = { width: `${r.width}px`, height: `${r.height}px`, transform: `translate(${r.left}px, ${r.top}px)`, borderRadius: radius };
  const grow = veil.animate([from0, to], { duration: GROW_MS, easing: EASE, fill: "forwards" });
  img.animate([{ objectPosition: position }, { objectPosition: "50% 50%" }], { duration: GROW_MS, easing: EASE, fill: "forwards" });
  try {
    await grow.finished;
    arrive();
    await new Promise((res) => setTimeout(res, HOLD_MS));
    await veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "ease-out", fill: "forwards" }).finished;
  } finally {
    veil.remove();
    busy = false;
  }
}

/** Where to point a wide picture inside a narrower box so that the slice
 *  centred on `focus` (a share of the picture's width) shows: an
 *  object-position, for pictures that fill their box's height. */
export function focusPosition(focus: number, boxAspect: number, pictureAspect: number): string {
  const visible = boxAspect / pictureAspect;
  if (visible >= 1) return "50% 50%";
  const left = Math.min(Math.max(focus - visible / 2, 0), 1 - visible);
  return `${((left / (1 - visible)) * 100).toFixed(2)}% 50%`;
}
