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

/** Scroll to a topic, entering it at its first panel (or at `panel`).
 *  `instant` skips the smooth scroll, for when a zoom already covers the move. */
export function jumpTo(id: TopicId, { panel = 0, instant = false }: { panel?: number; instant?: boolean } = {}) {
  const row = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!row) return;
  const behavior = instant || prefersReducedMotion() ? "instant" : "smooth";
  row.scrollIntoView({ behavior, block: "start" });
  const track = row.querySelector<HTMLElement>(".project-track");
  const target = track?.querySelectorAll<HTMLElement>(".project-panel")[panel];
  track?.scrollTo({ left: target?.offsetLeft ?? 0, behavior });
  // keyboard users land where they went
  if (instant) (target ?? row).focus({ preventScroll: true });
}

