import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { display, body } from "@/lib/fonts";
import GrainOverlay from "@/components/ui/GrainOverlay";
import SmoothScroll from "@/components/providers/SmoothScroll";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jasper.hyphosting.com"),
  title: "Jasper Pathuis · Developer",
  description:
    "Nineteen, Dutch, and my work already runs in production. A scroll journey through the systems I build: hosting platforms, AI assistants, and the infrastructure underneath.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-void text-bone">
        <SmoothScroll>{children}</SmoothScroll>
        <GrainOverlay />
      </body>
    </html>
  );
}
