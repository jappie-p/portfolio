"use client";
import { useEffect, useRef } from "react";
import { SplitText } from "@/components/ui/SplitText";
import { PROJECT_NAMES, type ProjectSlug } from "@/lib/chapters";
import { PROJECTS } from "@/data/projects";
import { BASE_PATH, SITE } from "@/data/site";
import { caseFromUrl, closeCase, openCase, useCase } from "@/lib/case";
import { useT } from "@/i18n/useT";
import { BrowserFrame, KioskFrame, PhoneFrame } from "./Frames";
import { ProjectMeta } from "./ProjectMeta";
import { SystemDiagram } from "./SystemDiagram";
import { Trailer } from "./Trailer";

/** A code sample from data/snippets.ts, highlighted at build time by Shiki
 *  (lib/highlight.ts). The HTML is generated from our own source strings, with
 *  the code escaped by Shiki, so it is safe to inject. */
export type CaseSnippet = { file: string; html: string };

/** The picture of a project: its video in a browser window, its screens, or
 *  (for work without a public screen) how it fits together. */
function CaseVisual({ slug }: { slug: ProjectSlug }) {
  const t = useT();
  const p = PROJECTS[slug];
  const name = PROJECT_NAMES[slug];
  const video = p.trailer && <Trailer name={p.trailer} label={`${t.work.video} ${name}`} />;

  if (p.trailer && p.shots && p.live)
    return (
      <div className="flex items-end gap-4">
        <BrowserFrame url={p.live} className="min-w-0 flex-[4]">
          {video}
        </BrowserFrame>
        <PhoneFrame src={p.shots.mobile} alt="" sizes="(min-width: 900px) 160px, 22vw" className="min-w-0 flex-1" />
      </div>
    );
  if (p.trailer && p.play) return <BrowserFrame url={`${SITE.url}${BASE_PATH}${p.play.replace("/index.html", "")}`}>{video}</BrowserFrame>;
  if (p.screens) {
    const Frame = slug === "kiosk" ? KioskFrame : PhoneFrame;
    return (
      <div className="flex items-end justify-center gap-4">
        {p.screens.map((src, i) => (
          <Frame key={i} src={src} alt={i === 0 ? name : ""} sizes="(min-width: 900px) 200px, 30vw" className={slug === "kiosk" ? "w-[38%] max-w-[240px]" : "w-[30%] max-w-[190px]"} />
        ))}
      </div>
    );
  }
  if (p.diagram)
    return (
      <figure className="glass flex flex-col items-center p-4 sm:p-6">
        <SystemDiagram id={p.diagram} />
        <figcaption className="label mt-2 text-ink-faint">{t.work.architecture}</figcaption>
      </figure>
    );
  return null;
}

/** The full story of one project, over the page: what it is, my role and
 *  contribution, the highlights, a piece of the code, the stack and the links.
 *  Opened by "View project", closed with the button, Escape, a click outside
 *  or the browser's back button. */
export function CaseOverlay({ snippets }: { snippets: Partial<Record<ProjectSlug, CaseSnippet>> }) {
  const t = useT();
  const slug = useCase((s) => s.slug);
  const panel = useRef<HTMLElement>(null);

  // the URL is the source of truth: shared links open the case, back closes it
  useEffect(() => {
    const sync = () => useCase.getState().set(caseFromUrl());
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (!slug) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // everything behind the dialog goes inert: no focus, no screen reader
    const root = panel.current?.closest<HTMLElement>("[role=dialog]");
    const behind = root?.parentElement ? [...root.parentElement.children].filter((el): el is HTMLElement => el !== root && el instanceof HTMLElement) : [];
    behind.forEach((el) => (el.inert = true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeCase();
      if (e.key !== "Tab" || !panel.current) return;
      // move focus ourselves, so it cycles inside the panel whatever the
      // browser's own tab order (Safari skips links and buttons by default)
      const focusable = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) return;
      e.preventDefault();
      const i = focusable.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? focusable.length - 1 : i - 1) : i === -1 || i === focusable.length - 1 ? 0 : i + 1;
      focusable[next].focus();
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      behind.forEach((el) => (el.inert = false));
      opener?.focus();
    };
  }, [slug]);

  if (!slug) return null;
  const p = PROJECTS[slug];
  const c = t.projects[slug];
  const name = PROJECT_NAMES[slug];
  const snippet = snippets[slug];
  const caption = (t.snippets as Partial<Record<ProjectSlug, string>>)[slug];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="case-title" className="case-overlay fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      {/* a click outside closes too; the close button is the accessible way */}
      <div aria-hidden onClick={closeCase} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <article ref={panel} className="case-panel glass relative max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-b-none rounded-t-3xl bg-[#0a0f16]/[0.97] p-6 pt-16 sm:m-6 sm:rounded-3xl sm:p-10 sm:pt-12">
        <button type="button" autoFocus onClick={closeCase} className="btn btn-ghost absolute right-4 top-4 px-4 py-2 text-sm">
          {t.work.close}
          <span aria-hidden>✕</span>
        </button>

        <ProjectMeta slug={slug} />
        <h2 id="case-title" className="headline mt-3 text-4xl text-ink sm:text-6xl">
          <SplitText intro text={name} />
        </h2>
        <p className="mt-3 text-ink-dim">
          <span className="text-ink-faint">{t.work.role}: </span>
          {c.role}
        </p>

        <div className="mt-8">
          <CaseVisual slug={slug} />
        </div>

        <p className="mt-8 text-lg leading-relaxed text-ink">{c.what}</p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <section>
            <h3 className="label text-ink-faint">{t.work.did}</h3>
            <p className="mt-3 leading-relaxed text-ink-dim">{c.did}</p>
          </section>
          <section>
            <h3 className="label text-ink-faint">{t.work.highlights}</h3>
            <ul className="mt-3 space-y-2.5">
              {[c.h1, c.h2, c.h3].map((h) => (
                <li key={h} className="flex gap-3 text-ink-dim">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  {h}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-8">
          <h3 className="label text-ink-faint">{t.work.fromCode}</h3>
          {snippet ? (
            <figure className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#05080d]/80">
              <figcaption className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 font-mono text-xs text-ink-faint">
                <span aria-hidden className="h-2 w-2 rounded-full bg-leaf/70" />
                {snippet.file}
              </figcaption>
              <div className="code-block max-h-[340px] overflow-auto px-4 py-3" dangerouslySetInnerHTML={{ __html: snippet.html }} />
              {caption && <p className="border-t border-white/10 px-4 py-2.5 text-sm text-ink-dim">{caption}</p>}
            </figure>
          ) : (
            <p className="mt-3 text-sm text-ink-faint">{t.work.privateCode}</p>
          )}
        </section>

        <h3 className="label mt-8 text-ink-faint">{t.work.stack}</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.tech.map((x) => (
            <li key={x} className="chip">
              {x}
            </li>
          ))}
        </ul>

        {(p.live || p.code || p.play) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {p.play && (
              <a href={`${BASE_PATH}${p.play}`} target="_blank" rel="noopener" className="btn btn-primary">
                {t.work.play}
                <span aria-hidden>▶</span>
              </a>
            )}
            {p.live && (
              <a href={p.live} target="_blank" rel="noopener noreferrer" className={`btn ${p.play ? "btn-ghost" : "btn-primary"}`}>
                {t.work.live}
                <span aria-hidden>↗</span>
              </a>
            )}
            {p.code && (
              <a href={p.code} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                {t.work.code}
              </a>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

/** Opens a project's case panel. */
export function OpenCaseButton({ slug, className = "" }: { slug: ProjectSlug; className?: string }) {
  const t = useT();
  return (
    <button type="button" onClick={() => openCase(slug)} className={`btn btn-ghost ${className}`}>
      {t.work.open}
      <span aria-hidden className="btn-arrow">
        →
      </span>
    </button>
  );
}
