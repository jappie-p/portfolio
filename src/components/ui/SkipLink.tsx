"use client";
import { useT } from "@/i18n/useT";

export function SkipLink() {
  const t = useT();
  return (
    <a href="#journey-root" className="skip-link glass rounded-full text-sm text-ink">
      {t.ui.skipToContent}
    </a>
  );
}
