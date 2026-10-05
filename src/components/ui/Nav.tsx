"use client";
import { useEffect, useState } from "react";
import { TOPICS, type TopicId } from "@/lib/chapters";
import { useJourney } from "@/lib/store";
import { jumpTo } from "@/lib/scene";
import { useT } from "@/i18n/useT";
import { LangToggle } from "./LangToggle";

type NavId = Exclude<TopicId, "hero">;
const ITEMS = TOPICS.filter((c) => c.id !== "hero").map((c) => c.id as NavId);

/** Top bar: monogram home link, the topics (with the one you are in lit up),
 *  and the language switch. On phones the topics move into a full-screen menu. */
export function Nav() {
  const t = useT();
  const topic = useJourney((s) => s.topic);
  const current = TOPICS[topic]?.id;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (id: TopicId) => {
    setOpen(false);
    jumpTo(id);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex [view-transition-name:site-nav] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <button
        type="button"
        data-nav="hero"
        onClick={() => go("hero")}
        className="headline grid h-10 w-10 place-items-center rounded-full text-lg text-leaf transition hover:text-ink"
        aria-label={`JP, ${t.hero.name}, ${t.nav.home}`}
      >
        JP
      </button>

      <nav aria-label="Menu" className="glass hidden items-center gap-0.5 rounded-full p-1 text-sm sm:flex">
        {ITEMS.map((id) => {
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              data-nav={id}
              aria-current={active ? "location" : undefined}
              onClick={() => go(id)}
              className={`relative rounded-full px-3.5 py-1.5 transition-colors duration-300 ${active ? "text-ink" : "text-ink-dim hover:text-ink"}`}
            >
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"}`}
              />
              <span className="relative">{t.nav[id]}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <LangToggle />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="btn btn-ghost px-4 py-2 text-sm sm:hidden"
        >
          {t.nav.menu}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label={t.nav.menu} className="mobile-menu fixed inset-0 z-[60] flex flex-col bg-[#05080d]/95 px-6 py-5 backdrop-blur-xl sm:hidden">
          <div className="flex items-center justify-between">
            <span className="headline text-lg text-leaf">JP</span>
            <button type="button" autoFocus onClick={() => setOpen(false)} className="btn btn-ghost px-4 py-2 text-sm">
              {t.nav.close}
            </button>
          </div>
          <nav aria-label="Menu" className="mt-12 flex flex-col gap-2">
            {ITEMS.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                style={{ animationDelay: `${60 + i * 50}ms` }}
                className={`mobile-menu-item headline py-2 text-left text-5xl ${current === id ? "text-leaf" : "text-ink"}`}
              >
                {t.nav[id]}
              </button>
            ))}
          </nav>
          <div className="mt-auto">
            <LangToggle />
          </div>
        </div>
      )}
    </header>
  );
}
