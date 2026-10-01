import { clamp } from "./rng";

export type Rect = { x0: number; y0: number; x1: number; y1: number };

export type Layout = {
  w: number;
  h: number;
  /** copy left and the form card right (lg), or one column that scrolls */
  wide: boolean;
  /** 1 at 1440x900; every length in the city scales with it */
  u: number;
  /** the top of the skyline band: only the Dom rises above it */
  bandTop: number;
  /** street level on the far bank, where every building stands */
  street: number;
  /** the wharf at the water's edge; the canal fills the screen below it */
  wharf: number;
  /** the Domtoren: centre x and pixels per metre */
  domX: number;
  m: number;
  /** where the copy sits, and how hard it wants the light kept down there */
  calm: { r: Rect; k: number }[];
  /** the glass form card on wide screens */
  form: Rect | null;
};

// Mirrors the Contact panel: a max-w-6xl grid with 1fr/1.05fr columns and a
// 3.5rem gap from lg, padded pt-24 pb-10 (px-12, px-6 on phones), the copy
// column about 598px tall with the map and the region label at its foot, the
// form card 434px tall and centred beside it, the footer 98px. Change these
// when that panel changes.
const INNER = 1152;
const GAP = 56;
const COPY_H = 598;
const FORM_H = 434;
const FOOTER = 98;

/** Base width over full height of the Domtoren (19.3 m by 112.5 m). */
export const DOM_RATIO = 19.3 / 112.5;

export function computeLayout(w: number, h: number): Layout {
  const wide = w >= 1024;
  const bandTop = h * (wide ? 0.655 : 0.72);
  const u = clamp((h - bandTop) / 310, 0.55, 2.2);
  const wharf = h - clamp(h * (wide ? 0.112 : 0.088), 46, 190);
  const street = wharf - 26 * u;
  const calm: Layout["calm"] = [];
  let form: Rect | null = null;
  let domX: number;
  let base: number;

  if (wide) {
    const inner = Math.min(w - 96, INNER);
    const left = (w - inner) / 2;
    const colL = (inner - GAP) / 2.05;
    const top = Math.max(96, (h - FOOTER - 40 + 96) / 2 - COPY_H / 2);
    form = { x0: left + colL + GAP, y0: top + (COPY_H - FORM_H) / 2, x1: left + inner, y1: top + (COPY_H + FORM_H) / 2 };
    // label, headline, lead, buttons and links; the dotted map; the region label
    calm.push({ r: { x0: left - 24, y0: top - 20, x1: left + colL, y1: top + 345 }, k: 0.75 });
    calm.push({ r: { x0: left - 16, y0: top + 360, x1: left + colL + 10, y1: top + 574 }, k: 0.6 });
    calm.push({ r: { x0: left - 22, y0: top + 566, x1: left + 320, y1: top + 616 }, k: 1 });
    // the Dom stands in the free margin right of the form, as tall as fits:
    // a bookend to the headline, small where that margin is a mere gutter
    const margin = w - form.x1;
    const tall = Math.min(h * 0.64, street - Math.max(100, h * 0.15));
    base = Math.min(Math.max(margin * 0.66, 36), tall * DOM_RATIO);
    const lo = base / 2 + 16;
    const hi = margin - base / 2 - 16;
    domX = form.x1 + (lo < hi ? clamp(margin * 0.46, lo, hi) : margin / 2);
  } else {
    // one column scrolling over the scene: the Dom keeps to the right, where
    // the ragged ends of the lines leave the most sky
    base = Math.min(clamp(w * 0.15, 40, 100), h * 0.46 * DOM_RATIO);
    domX = w - Math.max(base * 0.5 + w * 0.075, base * 0.5 + 16);
  }
  return { w, h, wide, u, bandTop, street, wharf, domX, m: base / 19.3, calm, form };
}

/** How much the copy at (x, y) wants the light kept down: 0 free, 1 hush. */
export function calmAt(L: Layout, x: number, y: number): number {
  let k = 0;
  for (const c of L.calm) {
    const { r } = c;
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) k = Math.max(k, c.k);
  }
  return k;
}
