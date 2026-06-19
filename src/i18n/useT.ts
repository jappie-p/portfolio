"use client";
import { create } from "zustand";
import { useEffect } from "react";
import type { Dictionary } from "./types";
import { nl } from "./nl";
import { en } from "./en";

export type Locale = "nl" | "en";
const dicts: Record<Locale, Dictionary> = { nl, en };

export const useLocale = create<{ locale: Locale; set: (l: Locale) => void }>()((set) => ({
  locale: "nl",
  set: (locale) => {
    if (typeof window !== "undefined") localStorage.setItem("lang", locale);
    set({ locale });
  },
}));

export function useT(): Dictionary {
  return dicts[useLocale((s) => s.locale)];
}

/** Hydrate from localStorage once and keep <html lang> in sync. Render once in providers. */
export function LangSync() {
  const locale = useLocale((s) => s.locale);
  const set = useLocale((s) => s.set);
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "nl") set(saved);
  }, [set]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
