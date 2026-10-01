"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { BASE_PATH } from "@/data/site";
import styles from "./ZeldaPlayable.module.css";

export type ZeldaPlayableProps = {
  /** what shows until the visitor presses play, e.g. the looping trailer */
  poster: ReactNode;
  playLabel: string;
  stopLabel: string;
  /** e.g. "WASD lopen · spatie slaan · E praten" */
  controlsLabel: string;
  /** accessible name of the game frame */
  title: string;
  /** shown and announced while the game boots */
  loadingLabel: string;
  className?: string;
};

type State = "idle" | "loading" | "playing";

const GAME_SRC = `${BASE_PATH}/play/zelda/index.html`;

function PlayGlyph() {
  return (
    <svg viewBox="0 0 9 9" className="h-[18px] w-[18px]" shapeRendering="crispEdges" aria-hidden>
      <path d="M0 0h2v1h2v1h2v1h2v1h1v1h-1v1h-2v1h-2v1h-2v1h-2z" fill="currentColor" />
    </svg>
  );
}

function StopGlyph() {
  return (
    <svg viewBox="0 0 7 7" className="h-2.5 w-2.5" shapeRendering="crispEdges" aria-hidden>
      <path d="M0 0h7v7h-7z" fill="currentColor" />
    </svg>
  );
}

/** The real game in the page, one click away. Before the click only the
 *  poster renders (nothing of the game is fetched); the click swaps in the
 *  pygbag build in an iframe and focuses it, and Stop unmounts it again. */
export function ZeldaPlayable({ poster, playLabel, stopLabel, controlsLabel, title, loadingLabel, className = "" }: ZeldaPlayableProps) {
  const [state, setState] = useState<State>("idle");
  const frame = useRef<HTMLIFrameElement>(null);
  const play = useRef<HTMLButtonElement>(null);
  const played = useRef(false);
  const hintId = useId();

  useEffect(() => {
    if (state === "loading") frame.current?.focus();
    // back from a game: hand focus back to the play button, not the page top
    if (state === "idle" && played.current) play.current?.focus();
    played.current = state !== "idle";
  }, [state]);

  return (
    <div className={`relative aspect-[16/10] w-full overflow-hidden bg-[#070b12] ${className}`}>
      {state === "idle" ? (
        <>
          {poster}
          <button
            ref={play}
            type="button"
            aria-label={playLabel}
            aria-describedby={hintId}
            onClick={() => setState("loading")}
            className={`group absolute inset-0 flex cursor-pointer ${styles.play} flex-col items-center justify-center gap-4 bg-[radial-gradient(55%_55%_at_50%_50%,rgba(5,8,13,0.5),rgba(5,8,13,0.12)_75%)] transition-colors duration-300 hover:bg-[radial-gradient(55%_55%_at_50%_50%,rgba(5,8,13,0.3),rgba(5,8,13,0)_75%)] focus-visible:outline-offset-[-6px]`}
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-[#05080d]/75 py-2 pl-2.5 pr-4 text-sm font-medium text-ink shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-md transition duration-300 group-hover:scale-[1.04] group-hover:border-leaf/60 group-hover:shadow-[0_0_36px_rgba(74,222,128,0.35)] sm:gap-3 sm:py-3 sm:pl-4 sm:pr-5 sm:text-[0.95rem]">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-leaf pl-0.5 text-[#04130a] sm:h-8 sm:w-8">
                <PlayGlyph />
              </span>
              {playLabel}
            </span>
            <span id={hintId} className="label rounded-md bg-[#05080d]/60 px-2.5 py-1 text-[0.56rem] tracking-[0.14em] text-ink-dim backdrop-blur-sm sm:text-[0.62rem] sm:tracking-[0.22em]">
              {controlsLabel}
            </span>
          </button>
        </>
      ) : (
        <>
          <iframe
            ref={frame}
            src={GAME_SRC}
            title={title}
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setState("playing")}
            className="absolute inset-0 block h-full w-full border-0 bg-black"
          />
          {/* stays up until the game page has loaded, then fades and leaves the accessibility tree */}
          <div
            role="status"
            aria-live="polite"
            className={`absolute inset-0 grid place-items-center bg-[#070b12] bg-[radial-gradient(60%_60%_at_50%_45%,rgba(74,222,128,0.07),transparent_70%)] transition-[opacity,visibility] duration-500 ${state === "loading" ? "visible opacity-100" : `pointer-events-none invisible opacity-0 ${styles.done}`}`}
          >
            <div className="flex flex-col items-center gap-6">
              <span aria-hidden className={styles.walker} style={{ backgroundImage: `url(${BASE_PATH}/art/zelda/link.png)` }} />
              <span aria-hidden className={styles.meter}>
                <span className={styles.fill} />
              </span>
              <span className="label text-[0.68rem] text-ink-dim">{loadingLabel}</span>
              <span aria-hidden className="label text-[0.6rem] tracking-[0.2em] text-ink-faint">
                {controlsLabel}
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
            {state === "playing" ? (
              <span aria-hidden className={`label rounded-md bg-[#05080d]/70 px-2.5 py-1.5 text-[0.6rem] tracking-[0.2em] text-ink-dim backdrop-blur-sm ${styles.hint}`}>
                {controlsLabel}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setState("idle")}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#05080d]/75 px-3 py-1.5 text-xs font-medium text-ink backdrop-blur-md transition-colors hover:border-white/35 hover:bg-[#05080d]/90"
            >
              <StopGlyph />
              {stopLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
