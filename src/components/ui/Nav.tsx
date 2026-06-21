"use client";
import { TOPICS, type TopicId } from "@/lib/chapters";
import { useT } from "@/i18n/useT";
import { LangToggle } from "./LangToggle";

type NavId = Exclude<TopicId, "hero">;

export function Nav() {
  const t = useT();
  const items = TOPICS.filter((c) => c.id !== "hero").map((c) => c.id as NavId);
  const jump = (id: TopicId) => {
    const row = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "start" });
    // always enter a topic at its first project
    row.querySelector<HTMLElement>(".project-track")?.scrollTo({ left: 0 });
  };
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4">
      <button type="button" data-nav="hero" onClick={() => jump("hero")} className="headline text-lg text-forest">
        JP
      </button>
      <nav className="glass flex items-center gap-1 rounded-full px-2 py-1 text-sm">
        {items.map((id) => (
          <button
            key={id}
            type="button"
            data-nav={id}
            onClick={() => jump(id)}
            className="rounded-full px-3 py-1 text-ink-dim hover:text-forest"
          >
            {t.nav[id]}
          </button>
        ))}
      </nav>
      <LangToggle />
    </header>
  );
}
