"use client";
import { useEffect, useRef, useState } from "react";
import type { FieldState } from "./field/HexField";
import s from "./load.module.css";

export type Stage = "sketch" | "wire" | "render" | "done";

/** The build-up, finished. */
export const FINISHED: FieldState = { stage: 2.45, rise: 1, draw: 1 };

const SKETCH_MS = 1000;
const WIRE_MS = 800;
const RENDER_MS = 1100;
const RISE_MS = 1500;
/** Never hold the page for slow fonts longer than this. */
const WAIT_MS = 2500;

const ease = (k: number) => k * k * (3 - 2 * k);

/**
 * The first screen builds itself, the way a game scene does: pencil sketch,
 * then wireframe, then the lit render. This drives the field's state, tells
 * the hero which stage its type is in, and counts it off at the foot of the
 * screen. It waits for the fonts and the field before the render, never
 * longer than a few seconds, and any click, key or scroll fast-forwards it.
 * With reduced motion the page simply starts finished.
 */
export function LoadIn({ state, still, ready, onStage, labels }: { state: FieldState; still: boolean; ready: boolean; onStage: (stage: Stage) => void; labels: readonly [string, string, string] }) {
  const count = useRef<HTMLSpanElement>(null);
  const isReady = useRef(ready);
  const [step, setStep] = useState(0);

  useEffect(() => {
    isReady.current = ready;
  }, [ready]);

  useEffect(() => {
    if (still) {
      Object.assign(state, FINISHED);
      onStage("done");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(3);
      return;
    }
    let fonts = false;
    document.fonts?.ready.then(() => (fonts = true), () => (fonts = true));
    let phase = 0;
    let phaseT = 0;
    let fast = 1;
    let last = performance.now();
    let raf = 0;

    const skip = () => {
      fast = 7;
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, skip, { passive: true, once: true });

    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) * fast;
      last = now;
      phaseT += dt;
      let progress = 0;
      if (phase === 0) {
        const k = Math.min(1, phaseT / SKETCH_MS);
        state.draw = ease(k);
        state.stage = 0.6 * k;
        progress = 40 * k;
        const go = (fonts && isReady.current) || fast > 1 || phaseT > SKETCH_MS + WAIT_MS;
        if (k >= 1 && go) {
          phase = 1;
          phaseT = 0;
          onStage("wire");
          setStep(1);
        }
      } else if (phase === 1) {
        const k = Math.min(1, phaseT / WIRE_MS);
        state.stage = 0.6 + 0.9 * ease(k);
        progress = 40 + 35 * k;
        if (k >= 1) {
          phase = 2;
          phaseT = 0;
          onStage("render");
          setStep(2);
        }
      } else {
        const k = Math.min(1, phaseT / RENDER_MS);
        state.stage = 1.5 + 0.95 * ease(k);
        state.rise = ease(Math.min(1, phaseT / RISE_MS));
        progress = 75 + 25 * k;
        if (phaseT >= RISE_MS) {
          Object.assign(state, FINISHED);
          if (count.current) count.current.textContent = "100";
          onStage("done");
          setStep(3);
          return;
        }
      }
      if (count.current) count.current.textContent = String(Math.round(progress)).padStart(3, "0");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      for (const e of events) window.removeEventListener(e, skip);
    };
  }, [state, still, onStage]);

  return (
    <div aria-hidden className={`${s.load} ${step === 3 ? s.gone : ""}`}>
      <ol className={s.steps}>
        {labels.map((label, i) => (
          <li key={label} className={i < step ? s.done : i === step ? s.now : ""}>
            <span className={s.num}>{`0${i + 1}`}</span>
            {label}
          </li>
        ))}
      </ol>
      <span ref={count} className={s.count}>
        000
      </span>
    </div>
  );
}
