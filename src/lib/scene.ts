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

/** Whether an element is on screen (grown by `margin`), for pausing render loops. */
export function useInView(ref: RefObject<Element | null>, margin = "0px"): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setInView(entries.some((e) => e.isIntersecting)), { rootMargin: margin });
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

/** Scroll to a topic, entering it at its first panel. */
export function jumpTo(id: TopicId) {
  const row = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
  if (!row) return;
  row.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  row.querySelector<HTMLElement>(".project-track")?.scrollTo({ left: 0 });
}

