"use client";
import type { ReactNode } from "react";
import { LangSync } from "@/i18n/useT";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <LangSync />
      {children}
    </>
  );
}
