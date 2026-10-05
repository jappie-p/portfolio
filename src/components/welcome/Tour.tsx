"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Typewriter } from "@/components/ui/Typewriter";
import { useLocale, useT } from "@/i18n/useT";
import { markTourDone } from "./enter";
import { play, setSound, soundOn } from "./sound";
import { TourMap, type Cell } from "./TourMap";
import { speak } from "./voice";
import s from "./tour.module.css";

export type Step = "down" | "side" | "dive" | "done";
const STEPS: Step[] = ["down", "side", "dive", "done"];

/** Where the frame stands when a step starts, and where doing it takes you. */
const FROM: Record<Step, Cell> = { down: { row: 0, col: 0 }, side: { row: 2, col: 0 }, dive: { row: 5, col: 0 }, done: { row: 0, col: 0 } };
const TO: Record<Exclude<Step, "done">, Cell> = { down: { row: 1, col: 0 }, side: { row: 2, col: 1 }, dive: { row: 5, col: 1 } };

/** How long a done step lingers before the next one, and how long before
 *  a plain "next" offers itself to someone stuck on a step. */
const LINGER_MS = 1150;
const STUCK_MS = 7000;
/** How far a wheel or a finger has to go to count. */
const WHEEL = 40;
const SWIPE = 40;

const coarseQuery = () => window.matchMedia("(pointer: coarse)");
function useCoarse() {
  return useSyncExternalStore(
    (cb) => {
      const m = coarseQuery();
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => coarseQuery().matches,
    () => false,
  );
}

function Key({ children }: { children: string }) {
  return <kbd className={s.key}>{children}</kbd>;
}

/** A finger sliding the way the step wants, on touch screens. */
function Gesture({ way }: { way: "up" | "side" | "tap" }) {
  return (
    <span aria-hidden className={s.gesture} data-way={way}>
      <span />
    </span>
  );
}

/**
 * The how-to, like the first minute of a game: three moves taught on a map
 * of the site (down for the next topic, sideways for its projects, a click
 * into a work in the gallery), each one waiting until you have done it for
 * real, with a chime and a tick of the map. Escape closes it, "skip" goes
 * straight in, and the end grows the map's first tile into the experience.
 */
export function Tour({ onClose, onEnter }: { onClose: () => void; onEnter: (from: HTMLElement | null) => void }) {
  const t = useT();
  const tt = t.tour;
  const locale = useLocale((st) => st.locale);
  const coarse = useCoarse();
  const [step, setStep] = useState<Step>("down");
  const [done, setDone] = useState(false);
  const [at, setAt] = useState<Cell>(FROM.down);
  const [stuck, setStuck] = useState(false);
  const [picked, setPicked] = useState(-1);
  const [sound, setSoundState] = useState(soundOn);
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLSpanElement>(null);
  const go = useRef<HTMLButtonElement>(null);
  const index = STEPS.indexOf(step);

  // the page behind stays put while the how-to runs
  useEffect(() => {
    root.current?.focus();
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = was;
    };
  }, []);

  // each step: the narrator speaks; the last one is the way in
  useEffect(() => {
    speak(locale, step);
    if (step !== "done") return;
    markTourDone();
    go.current?.focus();
  }, [step, locale]);

  // someone stuck on a step gets a plain "next" after a while
  useEffect(() => {
    if (done || step === "done") return;
    const id = window.setTimeout(() => setStuck(true), STUCK_MS);
    return () => window.clearTimeout(id);
  }, [step, done]);

  // a step done: the map moves, a chime, and a moment later the next step
  const advance = useCallback(() => {
    if (step === "done") return;
    setDone(true);
    setAt(TO[step]);
    play("done");
  }, [step]);

  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => {
      const next = STEPS[index + 1];
      play("move");
      setStep(next);
      setAt(FROM[next]);
      setDone(false);
      setStuck(false);
    }, LINGER_MS);
    return () => window.clearTimeout(id);
  }, [done, index]);

  const enter = useCallback(() => {
    markTourDone();
    play("enter");
    onEnter(hero.current);
  }, [onEnter]);

  // the moves themselves, for real: wheel, keys and fingers
  useEffect(() => {
    if (done || step === "done" || step === "dive") return;
    let wheel = 0;
    let x0 = 0;
    let y0 = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (step === "down" && !sideways) wheel += Math.max(e.deltaY, 0);
      if (step === "side" && sideways) wheel += Math.abs(e.deltaX);
      if (wheel > WHEEL) advance();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement && (e.key === " " || e.key === "Enter")) return;
      const down = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ";
      const side = e.key === "ArrowRight" || e.key === "ArrowLeft";
      if ((step === "down" && down) || (step === "side" && side)) {
        e.preventDefault();
        advance();
      }
    };
    const onStart = (e: TouchEvent) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - x0;
      const dy = e.touches[0].clientY - y0;
      if (step === "down" && dy < -SWIPE && -dy > Math.abs(dx)) advance();
      if (step === "side" && Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) advance();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
    };
  }, [step, done, advance]);

  // Escape closes the how-to, back to the two choices
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleSound = () => {
    setSound(!sound);
    setSoundState(!sound);
  };

  const pick = (i: number) => {
    setPicked(i);
    advance();
  };

  const copy = step === "done" ? null : tt[step];
  const say = step === "done" ? tt.done.say : tt[step].say;

  return (
    <div ref={root} className={s.tour} role="dialog" aria-modal="true" aria-labelledby="tour-title" tabIndex={-1} data-step={step}>
      <div className={s.bar}>
        <div className={s.head}>
          <p id="tour-title" className={s.title}>
            {tt.title}
          </p>
          <ol className={s.pips} aria-label={`${tt.step} ${Math.min(index + 1, 3)} / 3`}>
            {STEPS.slice(0, 3).map((st, i) => (
              <li key={st} data-on={i < index || (i === index && done) || undefined} data-now={i === index || undefined} />
            ))}
          </ol>
        </div>
        <div className={s.tools}>
          <button type="button" className={s.tool} aria-pressed={sound} onClick={toggleSound} aria-label={sound ? tt.soundOff : tt.soundOn}>
            <svg aria-hidden viewBox="0 0 20 20">
              <path d="M3.5 8h3l4-3.5v11L6.5 12h-3z" />
              {sound ? <path d="M13.5 7.2a4 4 0 0 1 0 5.6M15.6 5a7 7 0 0 1 0 10" /> : <path d="M14 8l4 4M18 8l-4 4" />}
            </svg>
          </button>
          <button type="button" className={s.skip} onClick={enter}>
            {tt.skip}
          </button>
        </div>
      </div>

      <div className={s.stage}>
        <TourMap at={at} labels={{ ...t.nav, hero: t.nav.home }} you={tt.you} pick={step === "dive" && !done ? pick : null} picked={picked} lit={step === "done" ? 7 : 0} heroRef={hero} />
      </div>

      <div className={s.panel} aria-live="polite">
        {copy ? (
          <>
            <p className={s.count}>
              {tt.step} {index + 1} / 3
            </p>
            <h2 className={s.ask}>
              {copy.title}
              {done && (
                <span aria-hidden className={s.check}>
                  ✓
                </span>
              )}
            </h2>
            <p className={s.how}>
              {coarse ? (
                <>
                  <Gesture way={step === "down" ? "up" : step === "side" ? "side" : "tap"} />
                  {copy.touch}
                </>
              ) : (
                <>
                  {copy.mouse}
                  {step === "down" && <Key>↓</Key>}
                  {step === "side" && <Key>→</Key>}
                </>
              )}
            </p>
          </>
        ) : (
          <>
            <h2 className={s.ask}>{tt.done.title}</h2>
            <button ref={go} type="button" className={s.go} onClick={enter}>
              {tt.done.go}
              <span aria-hidden>→</span>
            </button>
          </>
        )}
        <p className={s.say}>
          <svg aria-hidden viewBox="0 0 20 20" className={s.mic}>
            <path d="M3.5 8h3l4-3.5v11L6.5 12h-3z" />
          </svg>
          <span key={`${step}-${locale}`}>
            <Typewriter text={say} delay={350} cps={52} />
          </span>
        </p>
        {stuck && !done && copy && (
          <button type="button" className={s.next} onClick={advance}>
            {tt.next}
          </button>
        )}
      </div>
    </div>
  );
}
