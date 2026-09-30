"use client";

import { useEffect } from "react";
import type { CvLocale } from "@/data/cv";

/** The CV's language comes from the URL, not the site-wide toggle. The root
    layout always renders <html lang="nl">, and the site's own LangSync
    (src/i18n/useT.ts, mounted in Providers for every route) can reassert a
    stored preference after this runs. That only matters for a returning
    visitor whose stored language disagrees with the route; the common case
    (a fresh visit) ends up correct. */
export function CvLangSync({ lang }: { lang: CvLocale }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
