import localFont from "next/font/local";

export const display = localFont({
  src: "../fonts/ClashDisplay-Variable.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "200 700",
});

export const body = localFont({
  src: "../fonts/Satoshi-Variable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "300 900",
});
