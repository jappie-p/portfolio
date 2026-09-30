"use client";
import { useLocale } from "@/i18n/useT";

export function LangToggle() {
  const locale = useLocale((s) => s.locale);
  const set = useLocale((s) => s.set);
  return (
    <div className="glass inline-flex rounded-full p-1 text-sm" role="group" aria-label="Taal / Language">
      {(["nl", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          onClick={() => set(l)}
          className={`rounded-full px-3 py-1 transition-colors ${locale === l ? "bg-leaf font-medium text-[#04130a]" : "text-ink-dim hover:text-ink"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
