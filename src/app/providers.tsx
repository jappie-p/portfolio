"use client";
import type { ReactNode } from "react";
import { LangSync } from "@/i18n/useT";
import { SmoothScroll } from "@/lib/scroll/SmoothScroll";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <LangSync />
      <SmoothScroll>{children}</SmoothScroll>
    </>
  );
}
