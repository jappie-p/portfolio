import type { Metadata } from "next";
import { displayFont, bodyFont } from "@/lib/fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://jasper.hyphosting.com"),
  title: "Jasper Pathuis — Developer",
  description:
    "Game artist turned developer. A journey through the web, AI and security projects I build.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
