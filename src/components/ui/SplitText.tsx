import { Fragment, type CSSProperties } from "react";

// letters as people see them: keeps emoji like ❤️ in one piece
const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const letters = (word: string) => (segmenter ? Array.from(segmenter.segment(word), (g) => g.segment) : [...word]);

/** A headline whose letters rise out of a mask, one after another: when its
 *  panel comes into view (inside [data-reveal]), or on load with `intro`.
 *  Screen readers get the plain text; the letters are decorative copies. */
export function SplitText({
  text,
  as = "span",
  className = "",
  intro = false,
  delay = 0,
}: {
  text: string;
  as?: "span" | "h1" | "h2" | "h3";
  className?: string;
  intro?: boolean;
  /** extra delay before the first letter, in ms */
  delay?: number;
}) {
  const Tag = as as "span";
  const words = text.split(" ");
  let i = 0;
  return (
    <Tag className={`split-host ${intro ? "split-intro" : ""} ${className}`} style={{ "--split-delay": `${delay}ms` } as CSSProperties}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, w) => (
          <Fragment key={w}>
            <span className="split-word">
              {letters(word).map((ch) => (
                <span key={i} className="split-char" style={{ "--i": i++ } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            {w < words.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
