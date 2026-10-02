import type { Metadata, Viewport } from "next";
import { displayFont, bodyFont } from "@/lib/fonts";
import { SITE } from "@/data/site";
import "./globals.css";

const title = "Jasper Pathuis, developer";
const description =
  "Portfolio van Jasper Pathuis. Game-artist die developer werd en complete producten bouwt: hostingplatforms, webshops, AI-assistenten en homelab-infrastructuur.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title,
  description,
  authors: [{ name: SITE.name, url: SITE.github }],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title,
    description,
    locale: "nl_NL",
    alternateLocale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#05080d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
      <head>
        {/* without scripts nothing gets typed out, so show the hero line in full */}
        <noscript>
          <style>{".typewriter-rest{opacity:1}[data-load] .hero-name{--fill:1!important}[data-load] .hero-name .split-char{-webkit-text-stroke-color:transparent!important}.scroll-cue{opacity:1!important}"}</style>
        </noscript>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
