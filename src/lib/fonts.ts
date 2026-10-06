import { Caveat, Fraunces } from "next/font/google";
import localFont from "next/font/local";

export const displayFont = localFont({
  src: "../fonts/ClashDisplay-Variable.woff2",
  variable: "--font-display-var",
  display: "swap",
  weight: "200 700",
});

export const bodyFont = localFont({
  src: "../fonts/Satoshi-Variable.woff2",
  variable: "--font-body-var",
  display: "swap",
  weight: "300 900",
});

/** About's warm editorial serif: high contrast, with a true italic and an
 *  optical-size axis, so the big headlines get the tight display cut. Not
 *  preloaded: the first screen never shows it. */
export const serifFont = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

/** A hand, for the note on the desk. */
export const handFont = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
  preload: false,
});
