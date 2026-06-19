# Portfolio Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the fresh, light "frosted glass + foliage" shell — theme, bilingual NL/EN engine, scroll-journey rig (horizontal desktop / vertical mobile), navigation, and stub sections — with build, lint, and tests green. No 3D and no real content yet; this is the skeleton every later phase plugs into.

**Architecture:** Single Next 16 App-Router route. A thin server `layout.tsx`/`page.tsx` shell mounts a `'use client'` provider tree (Lenis smooth-scroll + GSAP) that drives a Zustand `journeyStore`. Sections render in a `ScrollJourney` that translates a horizontal track on desktop (GSAP + matchMedia) and stacks vertically on mobile / reduced-motion. All copy comes from typed `nl`/`en` dictionaries via a `useT()` hook backed by a Zustand locale store; a build-failing parity test guarantees the two stay in lockstep (the scorecard's "one language, never mixed" line).

**Tech Stack:** Next 16.2.9 (App Router), React 19.2.4, TypeScript 5, Tailwind 4 (`@tailwindcss/postcss`, single `@import "tailwindcss"`), GSAP 3.15 + `@gsap/react` + ScrollTrigger, Lenis 1.3.23, Zustand 5, Zod 4.4, Vitest 4.1 (jsdom), Playwright 1.60.

## Global Constraints

- **Branch:** all work on `redesign/light-frosted` (already created). Frequent commits per task.
- **Next 16 (per `AGENTS.md`):** "This is NOT the Next.js you know." `params`/`searchParams` are `Promise`s; router hooks import from `next/navigation`; providers are a `'use client'` wrapper mounted inside the server layout; fonts via `next/font/local` exposing CSS vars through `variable`; CSS is a single `@import "tailwindcss"` with `@theme`; `next.config.ts` is `NextConfig`-typed. Verify any unfamiliar API against `node_modules/next/dist/docs/01-app/` before writing it.
- **Language:** Dutch (NL) is the default locale. Every user-visible string lives in BOTH `nl` and `en` dictionaries; nothing hardcoded in components. Proper-noun tech terms (TypeScript, Docker) stay identical across both.
- **Copy rule:** no em/en dashes, no rule-of-three, no AI-tells in any user-visible string (applies to placeholder copy too).
- **Color discipline:** light tokens only. Cyan reserved for the Cyber scene; amber reserved for orb/honeypot. No `--void`/`--ember`/`.grain`/`.vignette`/`color-scheme: dark` anywhere.
- **Accessibility/perf:** every interactive element keyboard-focusable with a visible `--focus-ring`; honor `prefers-reduced-motion`; no audio anywhere.
- **Salvage, don't break:** leave `src/components/world/{CyberGrid,WebsitePanes,AutomationGraph}.tsx`, `src/lib/journey-math.ts` (camera beats), `src/fonts/`, `src/lib/fonts.ts`, `src/lib/gsap.ts` in place for later phases. Remove only the EMBER-specific routes/components named in Task 1.

---

## File Structure

```
src/
  app/
    layout.tsx          # MODIFY: light theme, fonts, metadata, mount <Providers>
    page.tsx            # REWRITE: renders <ScrollJourney> with ordered <Section> stubs
    globals.css         # REWRITE: light tokens + @theme + .glass
    providers.tsx       # CREATE: 'use client' tree (SmoothScroll + future canvas slot)
  components/
    journey/
      ScrollJourney.tsx  # CREATE: horizontal track (desktop) / vertical (mobile)
      Section.tsx        # CREATE: frosted panel wrapper, registers id
      ProgressRail.tsx   # CREATE: chapter dots
    ui/
      Glass.tsx          # CREATE: frosted-glass primitive
      Nav.tsx            # CREATE: header nav, smooth-jump
      LangToggle.tsx     # CREATE: NL/EN switch
    sections/
      Hero.tsx Websites.tsx Ai.tsx Cyber.tsx About.tsx Contact.tsx  # CREATE: stubs
  i18n/
    types.ts            # CREATE: Dictionary type (the contract)
    nl.ts en.ts         # CREATE: dictionaries (skeleton: nav/hero/sections/ui)
    useT.ts             # CREATE: useLocale store + useT hook + LangSync
  lib/
    chapters.ts         # CREATE: new CHAPTERS + progressToChapter (adapted)
    store.ts            # REWRITE: journeyStore (progress/chapter/orbState/webglOk)
    scroll/
      SmoothScroll.tsx   # CREATE: 'use client' Lenis provider -> journeyStore
      useHorizontalScroll.ts  # CREATE: GSAP horizontal rig, matchMedia-gated
    motion.ts           # CREATE: prefers-reduced-motion helper
  test/
    unit/               # vitest: dict-parity, chapters, useT, nav
    e2e/                # playwright: foundation.spec.ts
```

Removed in Task 1 (EMBER-specific): `src/app/v2/`, `src/app/work/`, `src/components/journey/{Contact,Craft,Dream,Hero,Journey,Turn,Work}.tsx`, `src/components/v2/`, `src/components/ui/{GrainOverlay,ParallaxDrift,Preloader,ProgressHUD,RevealLines,ScrambleLabel}.tsx`, `src/components/world/{WorldCanvas,WorldRoot,CameraRig,DesertArmor,DreamFragment,Embers,HeroShard,MonolithField}.tsx`, `src/data/{story,skills}.ts`. (Keep `data/projects.ts` as seed; keep the 3 salvage world engines + `journey-math.ts`.)

---

## Task 1: Light theme reset + scaffold cleanup

Replace the dark EMBER shell with the light token system and a clean App-Router shell. Remove EMBER-only files so nothing imports the old world.

**Files:**
- Rewrite: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/app/providers.tsx`
- Rewrite: `src/app/page.tsx` (temporary minimal body; real assembly in Task 8)
- Create: `src/test/unit/theme.test.ts`
- Delete: the EMBER-specific files/dirs listed under "Removed in Task 1" above.

**Interfaces:**
- Produces: the `.glass` class + CSS tokens (`--canvas`, `--glass-*`, `--ink*`, `--sage`, `--leaf`, `--forest`, `--cyber-cyan`, `--honey`, `--glow-*`, `--focus-ring`) and Tailwind `@theme` color aliases; `<Providers>` client wrapper.

- [ ] **Step 1: Write the failing test** — assert the theme is light and the dark system is gone.

```ts
// src/test/unit/theme.test.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(resolve(__dirname, "../../app/globals.css"), "utf8");

describe("globals.css light theme", () => {
  it("declares the light color-scheme", () => {
    expect(css).toMatch(/color-scheme:\s*light/);
  });
  it("defines the core light tokens", () => {
    for (const t of ["--canvas", "--glass-bg", "--ink", "--leaf", "--cyber-cyan", "--honey", "--focus-ring"]) {
      expect(css).toContain(t);
    }
  });
  it("defines the .glass primitive", () => {
    expect(css).toMatch(/\.glass\s*\{/);
    expect(css).toMatch(/backdrop-filter:\s*blur/);
  });
  it("removed the dark EMBER system", () => {
    expect(css).not.toMatch(/--void/);
    expect(css).not.toMatch(/color-scheme:\s*dark/);
    expect(css).not.toMatch(/\.grain\b/);
    expect(css).not.toMatch(/\.vignette\b/);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/test/unit/theme.test.ts`
Expected: FAIL (current `globals.css` still has `--void`, `.grain`, `color-scheme: dark`).

- [ ] **Step 3: Rewrite `globals.css`** with the light token system (spec §3 values).

```css
@import "tailwindcss";

:root {
  --canvas: #f7faf6; --canvas-2: #eef4ef; --sky-top: #eaf2f7; --sky-bottom: #f3f7ee;
  --glass-bg: rgba(255,255,255,0.55); --glass-bg-soft: rgba(255,255,255,0.38);
  --glass-border: rgba(120,150,130,0.28); --glass-shadow: 0 8px 32px rgba(40,70,55,0.10);
  --glass-blur: 18px; --glass-sat: 1.4;
  --ink: #1c2a22; --ink-dim: #4a5b50; --ink-faint: #7e8d84;
  --sage: #8fb89a; --leaf: #4f9d69; --forest: #2f6b46; --moss: #6aa57e;
  --cyber-cyan: #18b4c4; --cyber-cyan-hi: #5fe3ef;
  --honey: #e0962b; --honey-hi: #f4b347;
  --glow-blue: #3aa0e8; --glow-green: #43c98a; --glow: 0 0 18px rgba(67,201,138,0.35);
  --focus-ring: #2f6b46;
}

@theme inline {
  --color-canvas: var(--canvas); --color-glass: var(--glass-bg); --color-glass-soft: var(--glass-bg-soft);
  --color-ink: var(--ink); --color-ink-dim: var(--ink-dim); --color-ink-faint: var(--ink-faint);
  --color-sage: var(--sage); --color-leaf: var(--leaf); --color-forest: var(--forest); --color-moss: var(--moss);
  --color-cyber: var(--cyber-cyan); --color-cyber-hi: var(--cyber-cyan-hi);
  --color-honey: var(--honey); --color-honey-hi: var(--honey-hi);
  --color-glow-blue: var(--glow-blue); --color-glow-green: var(--glow-green);
  --font-display: var(--font-display-var); --font-body: var(--font-body-var); --font-mono: var(--font-geist-mono);
}

html { color-scheme: light; background: var(--canvas); }

body {
  color: var(--ink);
  font-family: var(--font-body), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  background:
    radial-gradient(140% 100% at 50% -10%, var(--sky-top) 0%, transparent 55%),
    linear-gradient(180deg, var(--canvas) 0%, var(--canvas-2) 100%);
  min-height: 100dvh;
}

::selection { background: var(--leaf); color: #fff; }
:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }

.headline { font-family: var(--font-display), sans-serif; font-weight: 600; letter-spacing: -0.03em; line-height: 0.95; }

.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: rgba(255,255,255,0.86); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 4: Create `providers.tsx`** (client wrapper; SmoothScroll added in Task 5, so start as a passthrough that we extend).

```tsx
// src/app/providers.tsx
"use client";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 5: Modify `layout.tsx`** — light shell, fonts via existing `lib/fonts.ts`, metadata, mount `<Providers>`. (Geist mono is optional; if `--font-geist-mono` is unused, drop that `@theme` line. Keep `<html lang="nl">` as the NL default; Task 3's `LangSync` updates it live.)

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { displayFont, bodyFont } from "@/lib/fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jasper Pathuis — Developer",
  description: "Game artist turned developer. Web, AI and security projects.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Rewrite `page.tsx`** to a minimal light body (replaced in Task 8).

```tsx
// src/app/page.tsx
export default function Home() {
  return <main className="grid min-h-dvh place-items-center"><p className="headline text-2xl text-forest">Jasper Pathuis</p></main>;
}
```

- [ ] **Step 7: Delete the EMBER-specific files** listed under "Removed in Task 1".

```bash
git rm -r src/app/v2 src/app/work \
  src/components/journey src/components/v2 \
  src/components/ui/GrainOverlay.tsx src/components/ui/ParallaxDrift.tsx src/components/ui/Preloader.tsx \
  src/components/ui/ProgressHUD.tsx src/components/ui/RevealLines.tsx src/components/ui/ScrambleLabel.tsx \
  src/components/world/WorldCanvas.tsx src/components/world/WorldRoot.tsx src/components/world/CameraRig.tsx \
  src/components/world/DesertArmor.tsx src/components/world/DreamFragment.tsx src/components/world/Embers.tsx \
  src/components/world/HeroShard.tsx src/components/world/MonolithField.tsx \
  src/data/story.ts src/data/skills.ts
```

- [ ] **Step 8: Verify build, lint, test all green**

Run: `npx vitest run src/test/unit/theme.test.ts && npm run lint && npm run build`
Expected: theme test PASS; lint clean; build succeeds (no imports of deleted files remain — if any do, they were EMBER-only and are removed in this task).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: light frosted-glass theme + scaffold reset (remove EMBER world)"
```

---

## Task 2: i18n core — typed dictionaries + parity guarantee

The single most important correctness mechanism (scorecard 2.2.2). A typed `Dictionary` contract both languages must satisfy, plus a build-failing parity test.

**Files:**
- Create: `src/i18n/types.ts`, `src/i18n/nl.ts`, `src/i18n/en.ts`
- Create: `src/test/unit/dict-parity.test.ts`

**Interfaces:**
- Produces: `type Dictionary`; `nl: Dictionary`, `en: Dictionary`; key paths `nav.{home,websites,ai,cyber,about,contact}`, `hero.{name,role,identity,cta}`, `sections.{websites,ai,cyber}.{title,lead}`, `ui.{openCase,close,solo,team,school,refsOnRequest,langName}`.

- [ ] **Step 1: Write the failing parity test** (deep key-set equality, recursive).

```ts
// src/test/unit/dict-parity.test.ts
import { describe, it, expect } from "vitest";
import { nl } from "@/i18n/nl";
import { en } from "@/i18n/en";

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj).flatMap((k) => keyPaths((obj as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("dictionary parity (nl <-> en)", () => {
  it("has identical key sets", () => {
    const a = keyPaths(nl).sort();
    const b = keyPaths(en).sort();
    expect(a).toEqual(b);
  });
  it("has no empty strings", () => {
    for (const d of [nl, en]) {
      for (const p of keyPaths(d)) {
        const val = p.split(".").reduce<any>((o, k) => o?.[k], d);
        expect(typeof val === "string" && val.length > 0).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/test/unit/dict-parity.test.ts`
Expected: FAIL (modules `@/i18n/nl` / `@/i18n/en` do not exist yet).

- [ ] **Step 3: Define the `Dictionary` contract.**

```ts
// src/i18n/types.ts
export type Dictionary = {
  nav: { home: string; websites: string; ai: string; cyber: string; about: string; contact: string };
  hero: { name: string; role: string; identity: string; cta: string };
  sections: Record<"websites" | "ai" | "cyber", { title: string; lead: string }>;
  ui: { openCase: string; close: string; solo: string; team: string; school: string; refsOnRequest: string; langName: string };
};
```

- [ ] **Step 4: Write `nl.ts` (default) and `en.ts`.** Both annotated `: Dictionary` so a missing key is a compile error.

```ts
// src/i18n/nl.ts
import type { Dictionary } from "./types";
export const nl: Dictionary = {
  nav: { home: "Start", websites: "Websites", ai: "AI", cyber: "Cyber", about: "Over mij", contact: "Contact" },
  hero: { name: "Jasper Pathuis", role: "Game-artist die developer werd", identity: "Ik bouw met AI: assistenten, automatisering en agents.", cta: "Begin de tour" },
  sections: {
    websites: { title: "Websites", lead: "Producten die mensen echt gebruiken." },
    ai: { title: "AI", lead: "Systemen die met elkaar praten en het werk doen." },
    cyber: { title: "Cyber", lead: "Verdediging die zichtbaar aan het werk is." },
  },
  ui: { openCase: "Bekijk project", close: "Sluiten", solo: "Soloproject", team: "Teamproject", school: "Schoolproject", refsOnRequest: "Referenties op aanvraag", langName: "Nederlands" },
};
```

```ts
// src/i18n/en.ts
import type { Dictionary } from "./types";
export const en: Dictionary = {
  nav: { home: "Start", websites: "Websites", ai: "AI", cyber: "Cyber", about: "About", contact: "Contact" },
  hero: { name: "Jasper Pathuis", role: "Game artist turned developer", identity: "I build with AI: assistants, automation and agents.", cta: "Start the tour" },
  sections: {
    websites: { title: "Websites", lead: "Products people actually use." },
    ai: { title: "AI", lead: "Systems that talk to each other and get the work done." },
    cyber: { title: "Cyber", lead: "Defense you can watch working." },
  },
  ui: { openCase: "View project", close: "Close", solo: "Solo project", team: "Team project", school: "School project", refsOnRequest: "References on request", langName: "English" },
};
```

- [ ] **Step 5: Run test (PASS) and commit**

Run: `npx vitest run src/test/unit/dict-parity.test.ts`
Expected: PASS.

```bash
git add src/i18n src/test/unit/dict-parity.test.ts && git commit -m "feat: typed nl/en dictionaries + build-failing parity test"
```

---

## Task 3: Locale store + `useT()` + `LangToggle` + `LangSync`

Instant client text-swap, NL default, persisted to `localStorage`, `<html lang>` kept in sync.

**Files:**
- Create: `src/i18n/useT.ts` (store + hook + `LangSync`)
- Create: `src/components/ui/LangToggle.tsx`
- Create: `src/test/unit/useT.test.tsx`

**Interfaces:**
- Consumes: `nl`, `en` from Task 2.
- Produces: `useLocale()` (`{ locale: "nl"|"en"; set(l): void }`), `useT(): Dictionary`, `<LangSync/>`, `<LangToggle/>`.

- [ ] **Step 1: Write the failing test** (toggle swaps strings + persists).

```tsx
// src/test/unit/useT.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useT, useLocale } from "@/i18n/useT";

function Probe() { const t = useT(); return <span>{t.hero.role}</span>; }

describe("useT locale swap", () => {
  beforeEach(() => { localStorage.clear(); act(() => useLocale.setState({ locale: "nl" })); });
  it("defaults to NL", () => {
    render(<Probe />);
    expect(screen.getByText(/Game-artist die developer/)).toBeTruthy();
  });
  it("swaps to EN and persists", () => {
    render(<Probe />);
    act(() => useLocale.getState().set("en"));
    expect(screen.getByText(/Game artist turned developer/)).toBeTruthy();
    expect(localStorage.getItem("lang")).toBe("en");
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/test/unit/useT.test.tsx`
Expected: FAIL (`@/i18n/useT` missing). (If `@testing-library/react` / `@testing-library/jest-dom` are not installed, `npm i -D @testing-library/react @testing-library/jest-dom @testing-library/dom` and ensure `vitest.config.ts` uses `environment: "jsdom"`.)

- [ ] **Step 3: Implement the store + hook + sync.**

```tsx
// src/i18n/useT.ts
"use client";
import { create } from "zustand";
import { useEffect } from "react";
import type { Dictionary } from "./types";
import { nl } from "./nl";
import { en } from "./en";

type Locale = "nl" | "en";
const dicts: Record<Locale, Dictionary> = { nl, en };

export const useLocale = create<{ locale: Locale; set: (l: Locale) => void }>()((set) => ({
  locale: "nl",
  set: (locale) => {
    if (typeof window !== "undefined") localStorage.setItem("lang", locale);
    set({ locale });
  },
}));

export function useT(): Dictionary { return dicts[useLocale((s) => s.locale)]; }

/** Hydrate from localStorage once + keep <html lang> in sync. Render once in the layout/providers. */
export function LangSync() {
  const locale = useLocale((s) => s.locale);
  const set = useLocale((s) => s.set);
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "nl") set(saved);
  }, [set]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return null;
}
```

- [ ] **Step 4: Build `LangToggle`.**

```tsx
// src/components/ui/LangToggle.tsx
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
          className={`rounded-full px-3 py-1 ${locale === l ? "bg-leaf text-white" : "text-ink-dim"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Mount `<LangSync/>` in `providers.tsx`** (add inside the wrapper).

```tsx
// src/app/providers.tsx
"use client";
import type { ReactNode } from "react";
import { LangSync } from "@/i18n/useT";

export function Providers({ children }: { children: ReactNode }) {
  return (<><LangSync />{children}</>);
}
```

- [ ] **Step 6: Run test (PASS) and commit**

Run: `npx vitest run src/test/unit/useT.test.tsx`
Expected: PASS.

```bash
git add src/i18n/useT.ts src/components/ui/LangToggle.tsx src/app/providers.tsx src/test/unit/useT.test.tsx && git commit -m "feat: locale store, useT hook, LangToggle, LangSync"
```

---

## Task 4: New chapters + `journeyStore`

Replace EMBER chapters with the new six and adapt the proven `progressToChapter` mapping; rebuild the store with `orbState`.

**Files:**
- Create: `src/lib/chapters.ts`
- Rewrite: `src/lib/store.ts`
- Create: `src/test/unit/chapters.test.ts`

**Interfaces:**
- Produces: `CHAPTERS` (`hero,websites,ai,cyber,about,contact`), `ChapterId`, `progressToChapter(p) -> {index, local}`; `useJourney` store with `{ progress, chapter, chapterProgress, velocity, orbState, webglOk, setScroll(progress, velocity?), setOrbState(s), setWebglOk(v) }`; `OrbState = "idle"|"responding"`.

- [ ] **Step 1: Write the failing test.**

```ts
// src/test/unit/chapters.test.ts
import { describe, it, expect } from "vitest";
import { CHAPTERS, progressToChapter } from "@/lib/chapters";

describe("progressToChapter", () => {
  it("has six chapters in journey order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["hero", "websites", "ai", "cyber", "about", "contact"]);
  });
  it("maps 0 to hero start", () => { expect(progressToChapter(0)).toEqual({ index: 0, local: 0 }); });
  it("maps 1 to the last chapter end", () => { const r = progressToChapter(1); expect(r.index).toBe(5); expect(r.local).toBeCloseTo(1); });
  it("clamps out-of-range", () => { expect(progressToChapter(-0.5).index).toBe(0); expect(progressToChapter(2).index).toBe(5); });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/test/unit/chapters.test.ts`
Expected: FAIL (`@/lib/chapters` missing).

- [ ] **Step 3: Implement `chapters.ts`** (logic adapted verbatim from `journey-math.ts`'s `progressToChapter`, new chapter set).

```ts
// src/lib/chapters.ts
export const CHAPTERS = [
  { id: "hero", weight: 1 },
  { id: "websites", weight: 2 },
  { id: "ai", weight: 2.5 },
  { id: "cyber", weight: 2.5 },
  { id: "about", weight: 1.5 },
  { id: "contact", weight: 1.25 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
export const TOTAL_WEIGHT = CHAPTERS.reduce((a, c) => a + c.weight, 0);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function progressToChapter(progress: number): { index: number; local: number } {
  const p = clamp01(progress);
  let acc = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const span = CHAPTERS[i].weight / TOTAL_WEIGHT;
    if (p <= acc + span || i === CHAPTERS.length - 1) return { index: i, local: clamp01((p - acc) / span) };
    acc += span;
  }
  return { index: CHAPTERS.length - 1, local: 1 };
}
```

- [ ] **Step 4: Rewrite `store.ts`.**

```ts
// src/lib/store.ts
import { create } from "zustand";
import { progressToChapter } from "@/lib/chapters";

export type OrbState = "idle" | "responding";

type JourneyState = {
  progress: number;
  chapter: number;
  chapterProgress: number;
  velocity: number;
  orbState: OrbState;
  webglOk: boolean | null;
  setScroll: (progress: number, velocity?: number) => void;
  setOrbState: (s: OrbState) => void;
  setWebglOk: (v: boolean) => void;
};

export const useJourney = create<JourneyState>()((set) => ({
  progress: 0, chapter: 0, chapterProgress: 0, velocity: 0, orbState: "idle", webglOk: null,
  setScroll: (progress, velocity = 0) => {
    const { index, local } = progressToChapter(progress);
    set({ progress, chapter: index, chapterProgress: local, velocity });
  },
  setOrbState: (s) => set({ orbState: s }),
  setWebglOk: (v) => set({ webglOk: v }),
}));
```

- [ ] **Step 5: Run test (PASS), verify build, commit**

Run: `npx vitest run src/test/unit/chapters.test.ts && npm run build`
Expected: PASS; build ok (the salvage `journey-math.ts` is untouched and still exports its own `progressToChapter` for later camera use — no conflict since `store.ts` now imports from `chapters.ts`).

```bash
git add src/lib/chapters.ts src/lib/store.ts src/test/unit/chapters.test.ts && git commit -m "feat: new journey chapters + journeyStore with orbState"
```

---

## Task 5: Smooth-scroll provider (Lenis -> journeyStore)

Mount Lenis once, drive `journeyStore.setScroll`, wire GSAP's ticker, and respect reduced motion. No 3D yet.

**Files:**
- Create: `src/lib/motion.ts`
- Create: `src/lib/scroll/SmoothScroll.tsx`
- Modify: `src/app/providers.tsx`
- Create: `src/test/unit/motion.test.ts`

**Interfaces:**
- Consumes: `useJourney.setScroll`, `gsap` from `@/lib/gsap`.
- Produces: `prefersReducedMotion(): boolean`; `<SmoothScroll/>` provider.

- [ ] **Step 1: Write the failing test** (the one pure-logic bit here).

```ts
// src/test/unit/motion.test.ts
import { describe, it, expect, vi } from "vitest";
import { prefersReducedMotion } from "@/lib/motion";

describe("prefersReducedMotion", () => {
  it("reads the media query", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));
    expect(prefersReducedMotion()).toBe(true);
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/test/unit/motion.test.ts`
Expected: FAIL (`@/lib/motion` missing).

- [ ] **Step 3: Implement `motion.ts`.**

```ts
// src/lib/motion.ts
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

- [ ] **Step 4: Implement `SmoothScroll.tsx`** (Lenis singleton; reduced motion = no Lenis, native scroll).

```tsx
// src/lib/scroll/SmoothScroll.tsx
"use client";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useJourney } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/motion";

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return; // native scroll; rig falls back to vertical
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    const setScroll = useJourney.getState().setScroll;
    lenis.on("scroll", ({ scroll, limit, velocity }: { scroll: number; limit: number; velocity: number }) => {
      setScroll(limit ? scroll / limit : 0, velocity);
      ScrollTrigger.update();
    });
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); lenis.destroy(); };
  }, []);
  return <>{children}</>;
}
```

- [ ] **Step 5: Mount `<SmoothScroll>` in `providers.tsx`.**

```tsx
// src/app/providers.tsx
"use client";
import type { ReactNode } from "react";
import { LangSync } from "@/i18n/useT";
import { SmoothScroll } from "@/lib/scroll/SmoothScroll";

export function Providers({ children }: { children: ReactNode }) {
  return (<><LangSync /><SmoothScroll>{children}</SmoothScroll></>);
}
```

- [ ] **Step 6: Run test, build, commit**

Run: `npx vitest run src/test/unit/motion.test.ts && npm run build`
Expected: PASS; build ok. (If the Lenis scroll callback type errors, import the package's exported event type or type the arg inline as shown.)

```bash
git add src/lib/motion.ts src/lib/scroll/SmoothScroll.tsx src/app/providers.tsx src/test/unit/motion.test.ts && git commit -m "feat: Lenis smooth-scroll provider driving journeyStore"
```

---

## Task 6: `ScrollJourney` + `Section` (horizontal desktop / vertical mobile)

The journey rig: a pinned horizontal track translated by GSAP on desktop (≥900px, no reduced-motion); a plain vertical stack everywhere else.

**Files:**
- Create: `src/lib/scroll/useHorizontalScroll.ts`
- Create: `src/components/journey/Section.tsx`
- Create: `src/components/journey/ScrollJourney.tsx`
- Create: `src/test/unit/section.test.tsx`

**Interfaces:**
- Consumes: `gsap`, `useGSAP` from `@/lib/gsap`.
- Produces: `<Section id={ChapterId} label={string}>`; `<ScrollJourney>{children}</ScrollJourney>`; each `<Section>` renders `data-section={id}` for nav/e2e targeting.

- [ ] **Step 1: Write the failing test** (Section contract).

```tsx
// src/test/unit/section.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Section } from "@/components/journey/Section";

describe("Section", () => {
  it("renders children and a data-section anchor", () => {
    const { container, getByText } = render(<Section id="websites" label="Websites"><p>hi</p></Section>);
    expect(getByText("hi")).toBeTruthy();
    expect(container.querySelector('[data-section="websites"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/test/unit/section.test.tsx`
Expected: FAIL (`@/components/journey/Section` missing).

- [ ] **Step 3: Implement `Section.tsx`.**

```tsx
// src/components/journey/Section.tsx
import type { ReactNode } from "react";
import type { ChapterId } from "@/lib/chapters";

export function Section({ id, label, children }: { id: ChapterId; label: string; children: ReactNode }) {
  return (
    <section data-section={id} aria-label={label}
      className="journey-panel relative flex min-h-dvh w-screen shrink-0 flex-col items-center justify-center px-6 py-24 lg:min-h-screen">
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Implement `useHorizontalScroll.ts`** (matchMedia-gated GSAP rig).

```ts
// src/lib/scroll/useHorizontalScroll.ts
"use client";
import { useRef, type RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

export function useHorizontalScroll(): { pinRef: RefObject<HTMLDivElement | null>; trackRef: RefObject<HTMLDivElement | null> } {
  const pinRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  useGSAP(() => {
    const track = trackRef.current, pin = pinRef.current;
    if (!track || !pin) return;
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
      const getDist = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -getDist(), ease: "none",
        scrollTrigger: { trigger: pin, start: "top top", end: () => `+=${getDist()}`, scrub: true, pin: true, invalidateOnRefresh: true },
      });
      return () => { tween.scrollTrigger?.kill(); tween.kill(); };
    });
    return () => mm.revert();
  }, { scope: pinRef });
  return { pinRef, trackRef };
}
```

- [ ] **Step 5: Implement `ScrollJourney.tsx`.** Desktop = horizontal flex track inside the pin; mobile = the same flex stacks via CSS (`flex-col`), GSAP branch simply never runs so no transform is applied.

```tsx
// src/components/journey/ScrollJourney.tsx
"use client";
import type { ReactNode } from "react";
import { useHorizontalScroll } from "@/lib/scroll/useHorizontalScroll";

export function ScrollJourney({ children }: { children: ReactNode }) {
  const { pinRef, trackRef } = useHorizontalScroll();
  return (
    <div ref={pinRef} className="overflow-hidden">
      <div ref={trackRef} className="flex flex-col lg:h-dvh lg:flex-row lg:flex-nowrap">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run test, build, commit**

Run: `npx vitest run src/test/unit/section.test.tsx && npm run build`
Expected: PASS; build ok.

```bash
git add src/lib/scroll/useHorizontalScroll.ts src/components/journey && git commit -m "feat: ScrollJourney horizontal rig + Section (vertical mobile fallback)"
```

---

## Task 7: `Glass`, `Nav`, `ProgressRail`

The header nav (smooth-jump to any section, Contact at end) + a chapter progress rail + the reusable glass primitive.

**Files:**
- Create: `src/components/ui/Glass.tsx`
- Create: `src/components/ui/Nav.tsx`
- Create: `src/components/journey/ProgressRail.tsx`
- Create: `src/test/unit/nav.test.tsx`

**Interfaces:**
- Consumes: `useT`, `CHAPTERS`, `useJourney`, `LangToggle`.
- Produces: `<Glass as? className?>`, `<Nav/>`, `<ProgressRail/>`. Nav buttons carry `data-nav={ChapterId}` and scroll to the matching `[data-section]` via `el.scrollIntoView` (Lenis intercepts wheel but `scrollIntoView` still works; horizontal rig converts vertical offset to x).

- [ ] **Step 1: Write the failing test** (Nav lists every chapter label from the dict).

```tsx
// src/test/unit/nav.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Nav } from "@/components/ui/Nav";

describe("Nav", () => {
  it("renders a control for every chapter", () => {
    const { container } = render(<Nav />);
    for (const id of ["websites", "ai", "cyber", "about", "contact"]) {
      expect(container.querySelector(`[data-nav="${id}"]`)).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npx vitest run src/test/unit/nav.test.tsx`
Expected: FAIL (`@/components/ui/Nav` missing).

- [ ] **Step 3: Implement `Glass.tsx`.**

```tsx
// src/components/ui/Glass.tsx
import type { ElementType, ReactNode } from "react";
export function Glass({ as: Tag = "div", className = "", children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return <Tag className={`glass ${className}`}>{children}</Tag>;
}
```

- [ ] **Step 4: Implement `Nav.tsx`.** Maps `CHAPTERS` (skip `hero`) to nav buttons; clicking scrolls the matching section into view (works for both vertical stack and the pinned horizontal rig).

```tsx
// src/components/ui/Nav.tsx
"use client";
import { CHAPTERS, type ChapterId } from "@/lib/chapters";
import { useT } from "@/i18n/useT";
import { LangToggle } from "./LangToggle";

export function Nav() {
  const t = useT();
  const items = CHAPTERS.filter((c) => c.id !== "hero").map((c) => c.id as Exclude<ChapterId, "hero">);
  const jump = (id: ChapterId) => document.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "start" });
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4">
      <button type="button" data-nav="hero" onClick={() => jump("hero")} className="headline text-lg text-forest">JP</button>
      <nav className="glass flex items-center gap-1 rounded-full px-2 py-1 text-sm">
        {items.map((id) => (
          <button key={id} type="button" data-nav={id} onClick={() => jump(id)} className="rounded-full px-3 py-1 text-ink-dim hover:text-forest">
            {t.nav[id]}
          </button>
        ))}
      </nav>
      <LangToggle />
    </header>
  );
}
```

- [ ] **Step 5: Implement `ProgressRail.tsx`** (reads `useJourney.chapter`).

```tsx
// src/components/journey/ProgressRail.tsx
"use client";
import { CHAPTERS } from "@/lib/chapters";
import { useJourney } from "@/lib/store";

export function ProgressRail() {
  const chapter = useJourney((s) => s.chapter);
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-2" aria-hidden>
      {CHAPTERS.map((c, i) => (
        <span key={c.id} className={`h-1.5 rounded-full transition-all ${i === chapter ? "w-6 bg-leaf" : "w-1.5 bg-sage/50"}`} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run test, build, commit**

Run: `npx vitest run src/test/unit/nav.test.tsx && npm run build`
Expected: PASS; build ok.

```bash
git add src/components/ui/Glass.tsx src/components/ui/Nav.tsx src/components/journey/ProgressRail.tsx src/test/unit/nav.test.tsx && git commit -m "feat: Glass primitive, header Nav (smooth-jump), ProgressRail"
```

---

## Task 8: Stub sections + page assembly

Six section stubs rendering i18n copy in glass panels, assembled in journey order. This is the visible skeleton.

**Files:**
- Create: `src/components/sections/{Hero,Websites,Ai,Cyber,About,Contact}.tsx`
- Rewrite: `src/app/page.tsx`

**Interfaces:**
- Consumes: `Section`, `Glass`, `useT`, `Nav`, `ProgressRail`, `ScrollJourney`.
- Produces: `<Home>` page tree.

- [ ] **Step 1: Create the six stub sections.** Each is a `Section` with i18n heading + lead; later phases replace their bodies. Example for two (the rest follow the identical shape, swapping the dict keys — Hero uses `hero.*`, the three subjects use `sections.<id>.*`, About/Contact use `nav.*` placeholders until their phases):

```tsx
// src/components/sections/Hero.tsx
"use client";
import { Section } from "@/components/journey/Section";
import { useT } from "@/i18n/useT";

export function Hero() {
  const t = useT();
  return (
    <Section id="hero" label={t.nav.home}>
      <div className="max-w-2xl text-center">
        <h1 className="headline text-5xl text-forest sm:text-7xl">{t.hero.name}</h1>
        <p className="mt-4 text-lg text-ink-dim">{t.hero.role}</p>
        <p className="mt-2 text-ink">{t.hero.identity}</p>
        <p className="mt-8 text-sm text-ink-faint">{t.hero.cta}</p>
      </div>
    </Section>
  );
}
```

```tsx
// src/components/sections/Websites.tsx
"use client";
import { Section } from "@/components/journey/Section";
import { Glass } from "@/components/ui/Glass";
import { useT } from "@/i18n/useT";

export function Websites() {
  const t = useT();
  return (
    <Section id="websites" label={t.nav.websites}>
      <Glass className="max-w-xl p-10 text-center">
        <h2 className="headline text-4xl text-forest">{t.sections.websites.title}</h2>
        <p className="mt-3 text-ink-dim">{t.sections.websites.lead}</p>
      </Glass>
    </Section>
  );
}
```

`Ai.tsx` (`id="ai"`, `t.sections.ai.*`) and `Cyber.tsx` (`id="cyber"`, `t.sections.cyber.*`) copy the `Websites` shape with their keys. `About.tsx` (`id="about"`, heading `t.nav.about`) and `Contact.tsx` (`id="contact"`, heading `t.nav.contact`) copy it with a short placeholder lead string added to the dict (`about.lead`, `contact.lead`) — **remember to add those two keys to BOTH `nl.ts` and `en.ts` and the `Dictionary` type, or the parity test fails.**

- [ ] **Step 2: Add the `about`/`contact` lead keys** to `types.ts`, `nl.ts`, `en.ts`.

```ts
// types.ts — extend Dictionary
about: { lead: string };
contact: { lead: string };
```
```ts
// nl.ts        about: { lead: "Game-artist, nu developer. Dit is mijn werk." }, contact: { lead: "Laten we praten." },
// en.ts        about: { lead: "Game artist, now a developer. Here is my work." }, contact: { lead: "Let us talk." },
```

- [ ] **Step 3: Rewrite `page.tsx`** assembling everything in order.

```tsx
// src/app/page.tsx
import { Nav } from "@/components/ui/Nav";
import { ProgressRail } from "@/components/journey/ProgressRail";
import { ScrollJourney } from "@/components/journey/ScrollJourney";
import { Hero } from "@/components/sections/Hero";
import { Websites } from "@/components/sections/Websites";
import { Ai } from "@/components/sections/Ai";
import { Cyber } from "@/components/sections/Cyber";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <ScrollJourney>
          <Hero /><Websites /><Ai /><Cyber /><About /><Contact />
        </ScrollJourney>
      </main>
      <ProgressRail />
    </>
  );
}
```

- [ ] **Step 4: Run full unit suite + build, then eyeball it**

Run: `npx vitest run && npm run build && npm run dev`
Expected: all unit tests PASS; build ok; `localhost:3000` shows the light theme, NL copy, header nav + lang toggle, six panels (horizontal scroll on desktop, vertical on a narrow window), progress rail advancing.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections src/app/page.tsx src/i18n && git commit -m "feat: six stub sections assembled into the scroll journey"
```

---

## Task 9: Foundation e2e (Playwright)

Lock the foundation behaviors that map to scorecard lines: NL default + EN toggle persistence + `<html lang>`, nav reaches every section, no audio on arrival.

**Files:**
- Create: `src/test/e2e/foundation.spec.ts`
- Verify: `playwright.config.ts` `webServer` runs `npm run dev`/`build && start` and projects include chromium + firefox + webkit + a mobile viewport.

**Interfaces:**
- Consumes: the running app on the Playwright baseURL.

- [ ] **Step 1: Write the e2e spec.**

```ts
// src/test/e2e/foundation.spec.ts
import { test, expect } from "@playwright/test";

test("defaults to Dutch and persists an English toggle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page.getByText("Game-artist die developer werd")).toBeVisible();
  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Game artist turned developer")).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("nav reaches every section", async ({ page }) => {
  await page.goto("/");
  for (const id of ["websites", "ai", "cyber", "about", "contact"]) {
    await page.locator(`[data-nav="${id}"]`).click();
    await expect(page.locator(`[data-section="${id}"]`)).toBeInViewport({ timeout: 5000 });
  }
});

test("makes no sound on arrival", async ({ page }) => {
  await page.goto("/");
  const media = await page.evaluate(() => Array.from(document.querySelectorAll("audio,video")).length);
  expect(media).toBe(0);
});
```

- [ ] **Step 2: Confirm Playwright config** has a `webServer` and the four browser projects. If missing, add:

```ts
// playwright.config.ts (relevant fields)
webServer: { command: "npm run build && npm run start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120000 },
use: { baseURL: "http://localhost:3000" },
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  { name: "mobile", use: { ...devices["iPhone 13"] } },
],
```

- [ ] **Step 3: Run the e2e suite**

Run: `npx playwright test src/test/e2e/foundation.spec.ts`
Expected: all three tests PASS across projects. (On mobile project the sections stack vertically; `toBeInViewport` still holds after `scrollIntoView`.)

- [ ] **Step 4: Commit**

```bash
git add src/test/e2e/foundation.spec.ts playwright.config.ts && git commit -m "test: foundation e2e — language, nav reachability, silence"
```

---

## Self-Review (completed)

**Spec coverage (Phase 1 slice of spec §9.1):** theme reset → T1; i18n type-enforced NL/EN + parity → T2/T3; journeyStore + chapters → T4; Lenis smooth-scroll → T5; horizontal/vertical rig + reduced-motion → T6; Nav + ProgressRail + Glass → T7; ordered stub sections → T8; foundation e2e (2.2.2/2.2.4/2.2.6/2.2.7 basics) → T9. Later phases (orb, scenes, case overlay, About/Contact content, deploy) are out of this plan's scope by design.

**Placeholder scan:** no "TBD/TODO"; every step has real code or an exact command. The two spots that say "copy the X shape" (Task 8 Ai/Cyber/About/Contact) give the exact source component, the exact dict keys, and the explicit reminder to add keys to both dicts + the type — not vague.

**Type consistency:** `progressToChapter` shape `{index, local}` matches between `chapters.ts` and `store.ts`; `ChapterId` from `chapters.ts` is the type used by `Section`/`Nav`; `useLocale`/`useT` signatures match across Tasks 2/3/7/8; `data-section` (Section) and `data-nav` (Nav) attribute names match the e2e selectors in Task 9.

**Open follow-ups for later phases (not blockers):** install `@testing-library/*` if absent (noted in T3); confirm `vitest.config.ts` uses jsdom + a `@` alias to `src`; the GSAP horizontal rig's pixel correctness is verified by the T9 nav e2e rather than a unit test (GSAP/DOM layout isn't meaningfully unit-testable).
