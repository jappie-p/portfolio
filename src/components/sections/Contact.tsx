"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { TopicRow } from "@/components/journey/panels";
import { ContactForm } from "@/components/contact/ContactForm";
import { WorldMap } from "@/components/contact/WorldMap";
import { LangToggle } from "@/components/ui/LangToggle";
import { SITE, BASE_PATH } from "@/data/site";
import { jumpTo, useInView, useNearOnce, useSceneMode } from "@/lib/scene";
import { useLocale, useT } from "@/i18n/useT";

const HexHorizon = dynamic(() => import("@/components/scenes/HexHorizon").then((m) => m.HexHorizon), { ssr: false });

/** The address is only written out in the browser, so scrapers reading the
 *  server HTML get "name [at] domain" instead of something to spam. */
function useEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(SITE.email);
  }, []);
  return email;
}

/** The close: a form, the ways to reach me, where I am on the map, and the
 *  honeycomb horizon back as a bookend. */
export function Contact() {
  const t = useT();
  const c = t.contact;
  const locale = useLocale((s) => s.locale);
  const ref = useRef<HTMLElement>(null);
  const mode = useSceneMode();
  const inView = useInView(ref);
  const near = useNearOnce(ref);
  const email = useEmail();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${SITE.email}`;
    }
  };

  const links = [
    { href: SITE.github, label: c.github },
    { href: SITE.linkedin, label: c.linkedin },
    { href: `${BASE_PATH}${SITE.cv[locale]}`, label: c.cv },
    { href: SITE.repo, label: c.repo },
  ].filter((l) => l.href);

  return (
    <TopicRow id="contact" label={t.nav.contact} ref={ref} className="overflow-hidden">
      {mode !== "off" && near && <HexHorizon tone="contact" active={inView} still={mode === "still"} />}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_40%,rgba(5,8,13,0.78),transparent_80%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#05080d] to-transparent" />

      {/* one panel that scrolls on its own when a phone is too short for it */}
      <div data-panel className="relative z-10 h-full overflow-y-auto [scrollbar-width:none]">
        <div className="flex min-h-full flex-col">
          <div className="flex flex-1 items-center justify-center px-6 pb-10 pt-24 sm:px-12">
            <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
              <div data-reveal className="flex flex-col items-start">
                <p className="label text-leaf">{t.nav.contact}</p>
                <h2 className="hero-name headline mt-5 text-5xl sm:text-6xl">{c.title}</h2>
                <p className="mt-5 max-w-md text-lg text-ink-dim">{c.lead}</p>
                <div className="mt-7 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (window.location.href = `mailto:${SITE.email}`)}
                    className="btn btn-ghost font-mono text-sm"
                    aria-label={`${c.email}: ${email ?? ""}`}
                  >
                    <span aria-hidden className="text-leaf">
                      ✉
                    </span>
                    {email ?? SITE.email.replace("@", " [at] ")}
                  </button>
                  <button type="button" onClick={copy} className="btn btn-ghost text-sm" aria-live="polite">
                    {copied ? `${c.copied} ✓` : c.copy}
                  </button>
                </div>
                <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-ink-dim underline-offset-4 transition-colors hover:text-leaf hover:underline">
                        {l.label} <span aria-hidden>↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 w-full">
                  <WorldMap label={c.mapLabel} alt={c.mapAlt} />
                  <p className="label mt-3 text-ink-faint">{c.region}</p>
                </div>
              </div>
              <div data-reveal>
                <ContactForm />
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-t from-[#05080d] via-[#05080d]/85 to-transparent px-6 pb-5 pt-10 text-xs text-ink-dim sm:px-10">
            <p>© 2026 {c.built}</p>
            <div className="flex items-center gap-4">
              <LangToggle />
              <button type="button" onClick={() => jumpTo("hero")} className="transition-colors hover:text-leaf">
                {c.top} ↑
              </button>
            </div>
          </footer>
        </div>
      </div>
    </TopicRow>
  );
}
