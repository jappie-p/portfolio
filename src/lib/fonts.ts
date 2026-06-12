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
