"use client";
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Types the text out once, with a blinking caret, then leaves the full text.
 *  Screen readers and reduced motion get the whole line at once. */
export function Typewriter({ text, delay = 700, cps = 45 }: { text: string; delay?: number; cps?: number }) {
  const [shown, setShown] = useState(text.length);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let i = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(0);
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
        <span className="invisible">{text.slice(shown)}</span>
      </span>
    </>
  );
}
