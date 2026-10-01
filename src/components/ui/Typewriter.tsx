"use client";
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Types the text out once over a dimmed copy of itself, with a blinking
 *  caret. Screen readers and reduced motion get the whole line at once. */
export function Typewriter({ text, delay = 700, cps = 45 }: { text: string; delay?: number; cps?: number }) {
  // the whole line paints at once (dimmed), so it is readable before any
  // script runs and counts for first paint; the typing lights it up
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(text.length);
      return;
    }
    let i = 0;
    let timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= text.length) window.clearInterval(timer);
      }, 1000 / cps);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [text, delay, cps]);
  const typing = shown < text.length;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, shown)}
        <span className={`typewriter-caret ${typing ? "" : "typewriter-caret--done"}`}>▍</span>
        <span className="typewriter-rest">{text.slice(shown)}</span>
      </span>
    </>
  );
}
