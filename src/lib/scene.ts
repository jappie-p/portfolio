"use client";
import { useEffect, useState, type RefObject } from "react";
import { hasHardwareWebGL } from "./webgl";
import { prefersReducedMotion } from "./motion";
import type { TopicId } from "./chapters";

/** How a WebGL scene should run here: not at all (server render, no GPU), as
 *  one still frame (reduced motion), or live. Decided once on the client. */
export type SceneMode = "off" | "still" | "live";

export function useSceneMode(): SceneMode {
  const [mode, setMode] = useState<SceneMode>("off");
  useEffect(() => {
    if (!hasHardwareWebGL()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(prefersReducedMotion() ? "still" : "live");
  }, []);
  return mode;
}

/** Reduced motion as state: false on the server and the first render. */
export function useStill(): boolean {
  const [still, setStill] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStill(prefersReducedMotion());
  }, []);
  return still;
}

/** An observer entry with some actual area on screen. */
export const onScreen = (e: IntersectionObserverEntry) => e.isIntersecting && e.intersectionRatio > 0;

/** Whether an element is on screen (grown by `margin`), for pausing render loops. */
export function useInView(ref: RefObject<Element | null>, margin = "0px"): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // a panel that only touches the viewport's edge (the ones beside the
    // current panel do, exactly) "intersects" with zero area: not on screen
    const io = new IntersectionObserver((entries) => setInView(entries.some(onScreen)), { rootMargin: margin, threshold: [0, 0.001] });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return inView;
}

/** True from the first moment an element comes within `margin` of the
 *  viewport, and it stays true: for mounting a scene once, just in time. */
export function useNearOnce(ref: RefObject<Element | null>, margin = "100% 0px"): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}

let landing = () => {};

/** Scroll to a topic, entering it at its first panel (or at `panel`).
 *  `instant` skips the smooth scroll, for when a zoom already covers the move.
 *  While it glides, snapping is off: a section waking up on the way changes
 *  the layout, and a snapping page re-snaps and drops the scroll. So it also
 *  checks that it lands, picks the glide up again if something stopped it,
 *  and steps aside the moment the reader scrolls or types themselves. */
export function jumpTo(id: TopicId, { panel = 0, instant = false }: { panel?: number; instant?: boolean } = {}) {
  const row = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!row) return;
  const smooth = !(instant || prefersReducedMotion());
  const behavior = smooth ? "smooth" : "instant";
  landing();
  const html = document.documentElement;
  if (smooth) html.classList.add("jumping");
  // line the row's sideways track up first, at once (the row is still off
  // screen): a second smooth scroll would abort the page's glide in Chrome
  const track = row.querySelector<HTMLElement>(".project-track");
  const target = track?.querySelectorAll<HTMLElement>(".project-panel")[panel];
  const left = target?.offsetLeft ?? 0;
  if (track && Math.abs(track.scrollLeft - left) > 1) track.scrollTo({ left, behavior: "instant" });
  row.scrollIntoView({ behavior, block: "start" });
  // keyboard users land where they went
  if (instant) (target ?? row).focus({ preventScroll: true });
  if (!smooth) return;

  let raf = 0;
  let frames = 0;
  let last = Number.NaN;
  let stalled = 0;
  let retries = 0;
  const inputs = ["wheel", "touchstart", "keydown"] as const;
  const stop = () => {
    cancelAnimationFrame(raf);
    for (const e of inputs) window.removeEventListener(e, stop);
    html.classList.remove("jumping");
    landing = () => {};
  };
  const check = () => {
    const top = row.getBoundingClientRect().top;
    if (Math.abs(top) < 1 || ++frames > 150) {
      if (Math.abs(top) >= 1) row.scrollIntoView({ behavior: "instant", block: "start" });
      stop();
      return;
    }
    stalled = Math.abs(top - last) < 0.5 ? stalled + 1 : 0;
    last = top;
    if (stalled > 6 && retries < 2) {
      row.scrollIntoView({ behavior: "smooth", block: "start" });
      stalled = 0;
      retries += 1;
    }
    raf = requestAnimationFrame(check);
  };
  for (const e of inputs) window.addEventListener(e, stop, { passive: true });
  landing = stop;
  raf = requestAnimationFrame(check);
}

