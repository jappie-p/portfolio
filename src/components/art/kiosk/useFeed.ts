import { useEffect, useRef, type RefObject } from "react";

// One loop: print for 5 s, let it hang for 4, tear it off, a beat of empty slot.
const FEED = 5000;
const HOLD = 4000;
const TEAR = 700;
const GAP = 500;
const LOOP = FEED + HOLD + TEAR + GAP;
/** Share of each line's time spent moving; the rest the head is burning dots. */
const MOVE = 0.5;

type Phase = "feed" | "hold" | "tear" | "gap";
type Pose = { x: number; y: number; rot: number; opacity: number; phase: Phase };
/** How far out the paper is after each line, and how long each line takes. */
type Plan = { height: number; stops: number[]; times: number[] };

const hash = (n: number) => {
  const s = Math.sin(n * 91.345 + 3.1) * 47453.3;
  return s - Math.floor(s);
};

/** Lines are the paper's direct children (HTML elements, for their layout
 *  box): the paper steps out one of them at a time, at a steady speed, so a
 *  tall line takes longer than a rule. */
function plan(paper: HTMLElement): Plan {
  const height = paper.offsetHeight;
  const lead = parseFloat(getComputedStyle(paper).fontSize) * 0.5;
  const stops = Array.from(paper.children, (el) => {
    const e = el as HTMLElement;
    return Math.min(height, e.offsetTop + e.offsetHeight + lead);
  });
  stops.push(height);
  const times: number[] = [];
  let prev = 0;
  for (const s of stops) {
    times.push((FEED * (s - prev)) / height);
    prev = s;
  }
  return { height, stops, times };
}

function pose(t: number, p: Plan, still: boolean): Pose {
  if (still) return { x: 0, y: 0, rot: 0, opacity: 1, phase: "hold" };
  if (t < FEED) {
    let acc = 0;
    for (let i = 0; i < p.stops.length; i++) {
      const d = p.times[i];
      if (t < acc + d || i === p.stops.length - 1) {
        const local = Math.min(1, (t - acc) / d / MOVE);
        const ease = 1 - (1 - local) ** 3;
        const from = i ? p.stops[i - 1] : 0;
        const out = from + (p.stops[i] - from) * ease;
        // the step's little shudder, settling as the paper stops
        const j = 1 - local;
        return { x: (hash(i) - 0.5) * 0.8 * j, y: p.height - out, rot: (hash(i + 31) - 0.5) * 0.4 * j, opacity: 1, phase: "feed" };
      }
      acc += d;
    }
  }
  if (t < FEED + HOLD) return { x: 0, y: 0, rot: 0, opacity: 1, phase: "hold" };
  if (t < FEED + HOLD + TEAR) {
    // a tug against the tear bar, then lifted away
    const q = (t - FEED - HOLD) / TEAR;
    if (q < 0.22) {
      const k = Math.sin((q / 0.22) * Math.PI * 0.5);
      return { x: 2.5 * k, y: 0, rot: -2.4 * k, opacity: 1, phase: "tear" };
    }
    const k = (q - 0.22) / 0.78;
    return { x: 2.5 + 22 * k, y: -150 * k * k, rot: -2.4 - 7 * k * k, opacity: Math.min(1, (1 - k) * 2.2), phase: "tear" };
  }
  return { x: 0, y: p.height, rot: 0, opacity: 1, phase: "gap" };
}

/** Drives the receipt: steps it out of the slot line by line, holds it, tears
 *  it off and starts again. rAF only while active; still shows it all printed. */
export function useFeed(
  refs: { root: RefObject<HTMLDivElement | null>; lift: RefObject<HTMLDivElement | null>; paper: RefObject<HTMLDivElement | null> },
  active: boolean,
  still: boolean,
) {
  const { root, lift, paper } = refs;
  const clock = useRef(0);

  useEffect(() => {
    const rt = root.current;
    const el = lift.current;
    const pp = paper.current;
    if (!rt || !el || !pp) return;
    let p = plan(pp);
    const render = () => {
      const s = pose(clock.current, p, still);
      el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotate(${s.rot.toFixed(3)}deg)`;
      el.style.opacity = s.opacity.toFixed(3);
      if (rt.dataset.phase !== s.phase) rt.dataset.phase = s.phase;
    };
    rt.toggleAttribute("data-paused", !active && !still);
    let raf = 0;
    const ro = new ResizeObserver(() => {
      p = plan(pp);
      if (!raf) render();
    });
    ro.observe(pp);
    render();
    if (active && !still) {
      let prev = performance.now();
      const tick = (now: number) => {
        clock.current = (clock.current + Math.min(50, now - prev)) % LOOP;
        prev = now;
        render();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [root, lift, paper, active, still]);
}
