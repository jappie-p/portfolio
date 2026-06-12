# EMBER Phase 1: Foundation & World Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The complete one-page scroll journey working end to end: design system, smooth-scroll + GSAP infrastructure, persistent WebGL world with camera-on-rails, preloader, and all six chapters with real copy and animation.

**Architecture:** Hybrid DOM+WebGL. One persistent R3F `<Canvas>` fixed behind the DOM; a single ScrollTrigger writes normalized scroll progress into a zustand store; the camera rig reads it transiently in `useFrame` (no React re-renders per frame). DOM chapters animate themselves with GSAP/SplitText. Everything degrades: no WebGL → gradient fallback; `prefers-reduced-motion` → content visible without choreography.

**Tech Stack:** Next.js 16 (App Router, TS), Tailwind 4, GSAP 3.15 (ScrollTrigger, SplitText, ScrambleText), Lenis 1.3 (`lenis/react`), React Three Fiber 9.6 + three 0.184, zustand 5, Vitest + Playwright.

**Scope note:** This is Plan 1 of 3 for the EMBER spec (`docs/superpowers/specs/2026-06-12-portfolio-ember-design.md`). Plan 2 = case-study pages, world interactions/polish, media. Plan 3 = contact form/API, performance hardening, a11y audit, VPS deploy. Case routes exist here only as stubs so links resolve.

**Next.js 16 gotchas (verified in `node_modules/next/dist/docs/`):** dynamic `params` is a Promise (must `await`); `ssr: false` in `next/dynamic` is only allowed inside Client Components; fonts via `next/font/local` with CSS variables; Tailwind 4 theme tokens via `@theme inline` in `globals.css`.

---

## File Structure

```
src/
  fonts/                       # ClashDisplay-Variable.woff2, Satoshi-Variable.woff2
  lib/
    fonts.ts                   # next/font/local exports (display, body)
    gsap.ts                    # single gsap plugin registration + re-exports
    store.ts                   # zustand journey store (scroll/chapter/loaded/webgl)
    journey-math.ts            # chapter weights, progress→chapter, camera path sampling
  data/
    projects.ts                # featured projects + archive (typed)
    story.ts                   # all chapter copy
    skills.ts                  # skill clusters + stats
  components/
    providers/SmoothScroll.tsx # Lenis root + ScrollTrigger sync
    ui/GrainOverlay.tsx
    ui/Preloader.tsx
    ui/RevealLines.tsx         # SplitText masked line reveals
    ui/ScrambleLabel.tsx       # decrypt-style label
    world/WorldRoot.tsx        # client wrapper: WebGL detect + dynamic ssr:false
    world/WorldCanvas.tsx      # Canvas, fog, lights, scene composition
    world/CameraRig.tsx
    world/Embers.tsx           # GPU particle embers (custom shaders)
    world/MonolithField.tsx    # project monoliths + ambient silhouettes
    world/DreamFragment.tsx    # CH1/CH2 geometry
    journey/Journey.tsx        # section wrappers + global progress ScrollTrigger
    journey/Hero.tsx … Contact.tsx  # chapter inner content
  app/
    layout.tsx                 # fonts, metadata, grain, smooth scroll
    page.tsx                   # WorldRoot + Preloader + Journey
    work/[slug]/page.tsx       # stub case pages
tests/
  journey-math.test.ts
  store.test.ts
  data.test.ts                 # includes Social Elephant sanitization guard
e2e/
  journey.spec.ts
```

---

### Task 1: Fonts & Design Tokens

**Files:**
- Create: `src/fonts/ClashDisplay-Variable.woff2`, `src/fonts/Satoshi-Variable.woff2`
- Create: `src/lib/fonts.ts`
- Modify: `src/app/globals.css` (full replace)
- Modify: `src/app/layout.tsx` (full replace)

- [ ] **Step 1: Download fonts from Fontshare (free license)**

```bash
cd /Users/jasper/Sites/localhost/portfolio-v2
mkdir -p src/fonts /tmp/fontdl && cd /tmp/fontdl
curl -sL -o clash.zip "https://api.fontshare.com/v2/fonts/download/clash-display"
curl -sL -o satoshi.zip "https://api.fontshare.com/v2/fonts/download/satoshi"
unzip -qo clash.zip -d clash && unzip -qo satoshi.zip -d satoshi
find clash -name "ClashDisplay-Variable.woff2" -exec cp {} /Users/jasper/Sites/localhost/portfolio-v2/src/fonts/ \;
find satoshi -name "Satoshi-Variable.woff2" -exec cp {} /Users/jasper/Sites/localhost/portfolio-v2/src/fonts/ \;
ls -la /Users/jasper/Sites/localhost/portfolio-v2/src/fonts/
```

Expected: both `.woff2` files listed, each >50KB. If the API URL fails, download manually from https://www.fontshare.com/fonts/clash-display and /fonts/satoshi (zips contain `Fonts/WEB/fonts/*-Variable.woff2`).

- [ ] **Step 2: Create `src/lib/fonts.ts`**

```ts
import localFont from "next/font/local";

export const display = localFont({
  src: "../fonts/ClashDisplay-Variable.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "200 700",
});

export const body = localFont({
  src: "../fonts/Satoshi-Variable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "300 900",
});
```

- [ ] **Step 3: Replace `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  --void: #070605;
  --coal: #0d0b09;
  --stone: #292524;
  --stone-soft: #44403c;
  --ember: #d97706;
  --ember-bright: #f59e0b;
  --bone: #f5f0ea;
  --bone-dim: #a8a29e;
  --bone-faint: #78716c;
}

@theme inline {
  --color-void: var(--void);
  --color-coal: var(--coal);
  --color-stone: var(--stone);
  --color-stone-soft: var(--stone-soft);
  --color-ember: var(--ember);
  --color-ember-bright: var(--ember-bright);
  --color-bone: var(--bone);
  --color-bone-dim: var(--bone-dim);
  --color-bone-faint: var(--bone-faint);
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-mono: var(--font-geist-mono);
}

html {
  background: var(--void);
  color-scheme: dark;
}

body {
  background: var(--void);
  color: var(--bone);
  font-family: var(--font-body), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: var(--ember);
  color: var(--void);
}

/* Editorial display headline helper */
.headline {
  font-family: var(--font-display), sans-serif;
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 0.86;
  text-transform: uppercase;
}

.headline-outline {
  color: transparent;
  -webkit-text-stroke: 1.5px var(--bone-faint);
}

/* Film grain (SVG turbulence tile, animated in steps) */
.grain {
  position: fixed;
  inset: -100px;
  z-index: 40;
  pointer-events: none;
  opacity: 0.07;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 220px 220px;
  animation: grain-shift 0.9s steps(8) infinite;
}

@keyframes grain-shift {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-40px, 30px); }
  50% { transform: translate(30px, -50px); }
  75% { transform: translate(-30px, -20px); }
  100% { transform: translate(0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .grain { animation: none; }
}
```

- [ ] **Step 4: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { display, body } from "@/lib/fonts";
import GrainOverlay from "@/components/ui/GrainOverlay";
import SmoothScroll from "@/components/providers/SmoothScroll";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jasper.hyphosting.com"),
  title: "Jasper Pathuis · Developer",
  description:
    "Nineteen, Dutch, and my work already runs in production. A scroll journey through the systems I build: hosting platforms, AI assistants, and the infrastructure underneath.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-void text-bone">
        <SmoothScroll>{children}</SmoothScroll>
        <GrainOverlay />
      </body>
    </html>
  );
}
```

Note: `GrainOverlay` and `SmoothScroll` are created in Task 6. To keep this task buildable on its own, create both as minimal stubs now; Task 6 fills them in:

`src/components/ui/GrainOverlay.tsx`:
```tsx
export default function GrainOverlay() {
  return <div aria-hidden className="grain" />;
}
```

`src/components/providers/SmoothScroll.tsx` (stub, replaced in Task 6):
```tsx
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds, no font resolution errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Void & Ember design tokens, Clash Display + Satoshi fonts, grain overlay"
```

---

### Task 2: Test Infrastructure + Chapter Math (TDD)

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/journey-math.test.ts`
- Create: `src/lib/journey-math.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install vitest**

```bash
npm i -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`.

- [ ] **Step 3: Write the failing test `tests/journey-math.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  CHAPTERS,
  TOTAL_WEIGHT,
  progressToChapter,
} from "@/lib/journey-math";

describe("CHAPTERS", () => {
  it("defines the six chapters in order", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual([
      "hero",
      "dream",
      "turn",
      "work",
      "craft",
      "contact",
    ]);
  });

  it("total weight is the sum of chapter weights", () => {
    const sum = CHAPTERS.reduce((a, c) => a + c.weight, 0);
    expect(TOTAL_WEIGHT).toBeCloseTo(sum);
  });
});

describe("progressToChapter", () => {
  it("returns hero at progress 0", () => {
    expect(progressToChapter(0)).toEqual({ index: 0, local: 0 });
  });

  it("returns contact end at progress 1", () => {
    const r = progressToChapter(1);
    expect(r.index).toBe(CHAPTERS.length - 1);
    expect(r.local).toBeCloseTo(1);
  });

  it("clamps out-of-range progress", () => {
    expect(progressToChapter(-0.5)).toEqual({ index: 0, local: 0 });
    expect(progressToChapter(1.5).index).toBe(CHAPTERS.length - 1);
  });

  it("maps the midpoint of a chapter to local 0.5", () => {
    // start of 'dream' = weight(hero)/TOTAL, dream spans weight(dream)/TOTAL
    const start = CHAPTERS[0].weight / TOTAL_WEIGHT;
    const span = CHAPTERS[1].weight / TOTAL_WEIGHT;
    const r = progressToChapter(start + span / 2);
    expect(r.index).toBe(1);
    expect(r.local).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `@/lib/journey-math`.

- [ ] **Step 5: Implement `src/lib/journey-math.ts`**

```ts
export const CHAPTERS = [
  { id: "hero", weight: 1 },
  { id: "dream", weight: 2 },
  { id: "turn", weight: 2 },
  { id: "work", weight: 2.5 },
  { id: "craft", weight: 2 },
  { id: "contact", weight: 1.5 },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];

export const TOTAL_WEIGHT = CHAPTERS.reduce((a, c) => a + c.weight, 0);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Map global scroll progress (0..1) to a chapter index + local progress within it. */
export function progressToChapter(progress: number): {
  index: number;
  local: number;
} {
  const p = clamp01(progress);
  let acc = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const span = CHAPTERS[i].weight / TOTAL_WEIGHT;
    if (p <= acc + span || i === CHAPTERS.length - 1) {
      return { index: i, local: clamp01((p - acc) / span) };
    }
    acc += span;
  }
  return { index: CHAPTERS.length - 1, local: 1 };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: chapter weights and progress mapping with vitest infra"
```

---

### Task 3: Camera Path Sampling (TDD)

**Files:**
- Modify: `tests/journey-math.test.ts` (append)
- Modify: `src/lib/journey-math.ts` (append)

- [ ] **Step 1: Append failing tests to `tests/journey-math.test.ts`**

```ts
import { Vector3 } from "three";
import { sampleCamera } from "@/lib/journey-math";

describe("sampleCamera", () => {
  const out = { position: new Vector3(), target: new Vector3() };

  it("starts at the hero viewpoint", () => {
    sampleCamera(0, out);
    expect(out.position.z).toBeCloseTo(8, 1);
  });

  it("moves the camera forward (negative z) as progress increases", () => {
    sampleCamera(0, out);
    const zStart = out.position.z;
    sampleCamera(1, out);
    expect(out.position.z).toBeLessThan(zStart - 10);
  });

  it("target is always distinct from position", () => {
    for (const p of [0, 0.2, 0.5, 0.8, 1]) {
      sampleCamera(p, out);
      expect(out.position.distanceTo(out.target)).toBeGreaterThan(0.5);
    }
  });

  it("clamps progress outside 0..1", () => {
    sampleCamera(0, out);
    const z0 = out.position.z;
    sampleCamera(-1, out);
    expect(out.position.z).toBeCloseTo(z0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, `sampleCamera` is not exported.

- [ ] **Step 3: Append implementation to `src/lib/journey-math.ts`**

```ts
import { CatmullRomCurve3, Vector3 } from "three";

// One keyframe per chapter boundary (7 points for 6 chapters).
const POSITION_KEYS = [
  new Vector3(0, 0.6, 8), // hero
  new Vector3(-0.6, 0.7, 5), // → dream
  new Vector3(1.4, 0.9, 1.5), // → turn
  new Vector3(-1.2, 1.1, -3.5), // → work
  new Vector3(0.4, 1.8, -8), // → craft
  new Vector3(0, 1.4, -12), // → contact approach
  new Vector3(0, 1.2, -15), // contact end
];

const TARGET_KEYS = [
  new Vector3(0, 0.5, 0),
  new Vector3(-1.2, 0.6, -2),
  new Vector3(0.8, 0.7, -5),
  new Vector3(-0.5, 1.0, -9),
  new Vector3(0, 1.6, -14),
  new Vector3(0, 1.2, -18),
  new Vector3(0, 1.0, -22),
];

const positionCurve = new CatmullRomCurve3(POSITION_KEYS, false, "catmullrom", 0.4);
const targetCurve = new CatmullRomCurve3(TARGET_KEYS, false, "catmullrom", 0.4);

/** Sample camera position + look-at target for progress 0..1. Mutates `out`. */
export function sampleCamera(
  progress: number,
  out: { position: Vector3; target: Vector3 }
): void {
  const p = clamp01(progress);
  positionCurve.getPoint(p, out.position);
  targetCurve.getPoint(p, out.target);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: camera rail path with Catmull-Rom sampling"
```

---

### Task 4: Journey Store (TDD)

**Files:**
- Create: `tests/store.test.ts`
- Create: `src/lib/store.ts`

- [ ] **Step 1: Write the failing test `tests/store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useJourney } from "@/lib/store";

describe("journey store", () => {
  beforeEach(() => {
    useJourney.setState({
      loaded: false,
      progress: 0,
      chapter: 0,
      chapterProgress: 0,
      webglOk: null,
    });
  });

  it("has sane defaults", () => {
    const s = useJourney.getState();
    expect(s.loaded).toBe(false);
    expect(s.progress).toBe(0);
    expect(s.webglOk).toBeNull();
  });

  it("setScroll updates progress and derived chapter", () => {
    useJourney.getState().setScroll(0);
    expect(useJourney.getState().chapter).toBe(0);
    useJourney.getState().setScroll(0.99);
    const s = useJourney.getState();
    expect(s.progress).toBeCloseTo(0.99);
    expect(s.chapter).toBe(5); // contact
    expect(s.chapterProgress).toBeGreaterThan(0.5);
  });

  it("setLoaded and setWebglOk flip flags", () => {
    useJourney.getState().setLoaded(true);
    useJourney.getState().setWebglOk(true);
    expect(useJourney.getState().loaded).toBe(true);
    expect(useJourney.getState().webglOk).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, cannot resolve `@/lib/store`.

- [ ] **Step 3: Implement `src/lib/store.ts`**

```ts
import { create } from "zustand";
import { progressToChapter } from "@/lib/journey-math";

type JourneyState = {
  /** Preloader finished, intro may play. */
  loaded: boolean;
  /** Global scroll progress 0..1 across the whole journey. */
  progress: number;
  chapter: number;
  chapterProgress: number;
  /** null = not yet detected. */
  webglOk: boolean | null;
  setLoaded: (v: boolean) => void;
  setScroll: (progress: number) => void;
  setWebglOk: (v: boolean) => void;
};

export const useJourney = create<JourneyState>()((set) => ({
  loaded: false,
  progress: 0,
  chapter: 0,
  chapterProgress: 0,
  webglOk: null,
  setLoaded: (v) => set({ loaded: v }),
  setScroll: (progress) => {
    const { index, local } = progressToChapter(progress);
    set({ progress, chapter: index, chapterProgress: local });
  },
  setWebglOk: (v) => set({ webglOk: v }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: zustand journey store with derived chapter state"
```

---

### Task 5: Content Data + Sanitization Guard (TDD)

**Files:**
- Create: `tests/data.test.ts`
- Create: `src/data/projects.ts`
- Create: `src/data/story.ts`
- Create: `src/data/skills.ts`

- [ ] **Step 1: Write the failing test `tests/data.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { featured, archive } from "@/data/projects";
import { story } from "@/data/story";
import { skills, stats } from "@/data/skills";

describe("projects", () => {
  it("has exactly the five featured projects in order", () => {
    expect(featured.map((p) => p.slug)).toEqual([
      "hyphosting",
      "jarvis",
      "homelab",
      "social-elephant",
      "louisa-gemstones",
    ]);
  });

  it("every featured project is complete", () => {
    for (const p of featured) {
      expect(p.title.length).toBeGreaterThan(2);
      expect(p.tagline.length).toBeGreaterThan(10);
      expect(p.tech.length).toBeGreaterThanOrEqual(3);
      expect(p.year).toMatch(/20\d\d/);
    }
  });

  it("has archive items", () => {
    expect(archive.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Social Elephant sanitization (spec §5, hard constraint)", () => {
  // Forbidden: client names, colleague names, internal tools/URLs.
  const FORBIDDEN = [
    "broekman",
    "rode winkel",
    "derodewinkel",
    "vincent",
    "nico",
    "mart",
    "timo",
    "simplicate",
    "clickup",
    "vraagposten",
    "socialelephant.nl",
    "bridge.hyphosting",
    "podcast jungle",
    "podcastjungle",
  ];

  it("no forbidden internal terms anywhere in site content", () => {
    const blob = JSON.stringify({ featured, archive, story, skills, stats }).toLowerCase();
    for (const term of FORBIDDEN) {
      expect(blob, `forbidden term "${term}" found in content`).not.toContain(term);
    }
  });
});

describe("story", () => {
  it("has copy for all six chapters", () => {
    for (const key of ["hero", "dream", "turn", "work", "craft", "contact"] as const) {
      expect(story[key]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL, cannot resolve `@/data/projects`.

- [ ] **Step 3: Create `src/data/projects.ts`**

```ts
export type FeaturedProject = {
  slug: string;
  title: string;
  year: string;
  role: string;
  tagline: string;
  tech: string[];
  accent: string;
};

export type ArchiveItem = {
  title: string;
  year: string;
  tech: string[];
  href?: string;
};

export const featured: FeaturedProject[] = [
  {
    slug: "hyphosting",
    title: "HypHosting",
    year: "2025—now",
    role: "Founder, everything",
    tagline:
      "A commercial Minecraft hosting platform: website, payments, server panel with real-time console, security system, and a native iOS app.",
    tech: ["Node.js", "Express", "MySQL", "Docker", "Mollie", "WebSocket", "SwiftUI"],
    accent: "#22c55e",
  },
  {
    slug: "jarvis",
    title: "Jarvis",
    year: "2026",
    role: "Design & build",
    tagline:
      "A personal AI assistant with its own iOS app and server, built around Claude. It reads my mail, manages my day, and ships my ideas.",
    tech: ["Claude", "Express", "SwiftUI", "MySQL", "VPS"],
    accent: "#d97706",
  },
  {
    slug: "homelab",
    title: "Homelab",
    year: "2026",
    role: "Infrastructure & security",
    tagline:
      "A Proxmox server running a GPU-transcoding media stack, password vault, monitoring, and a honeypot that catches intruders for fun.",
    tech: ["Proxmox", "Docker", "Tailscale", "WireGuard", "NVENC", "Linux"],
    accent: "#7dd3fc",
  },
  {
    slug: "social-elephant",
    title: "Social Elephant",
    year: "2026",
    role: "Automation engineer (work experience)",
    tagline:
      "Real work for a marketing agency: AI tooling, workflow automation, and integrations that connect their daily systems into one bridge.",
    tech: ["TypeScript", "Node.js", "MCP", "AI agents", "REST APIs"],
    accent: "#11b958",
  },
  {
    slug: "louisa-gemstones",
    title: "Louisa Gemstones",
    year: "2025",
    role: "Client work",
    tagline:
      "An elegant e-commerce site for a gemstone collector: catalog, admin panel, and Stripe checkout in a calm sage-green design.",
    tech: ["Node.js", "Express", "MySQL", "Stripe"],
    accent: "#7B9E87",
  },
];

export const archive: ArchiveItem[] = [
  { title: "Windsurf Speed", year: "2026", tech: ["SuuntoPlus", "GPS"] },
  { title: "Zelda ALttP Remake", year: "2025", tech: ["Python", "Pygame"] },
  { title: "Amorphophallus Collection", year: "2025", tech: ["HTML", "CSS", "JS"], href: "https://amorphophallus.nl" },
  { title: "Utrecht Festival PWA", year: "2026", tech: ["Vite", "PWA"] },
  { title: "Happy Herbivore Kiosk", year: "2026", tech: ["Node.js", "systemd"] },
  { title: "Webshop Backend", year: "2024", tech: ["Node.js", "CRUD", "MySQL"] },
];
```

- [ ] **Step 4: Create `src/data/story.ts`**

```ts
export const story = {
  hero: {
    name: ["JASPER", "PATHUIS"],
    meta: ["developer", "builder", "the netherlands"],
    tagline: "I build systems that run.",
    hint: "scroll",
  },
  dream: {
    label: "chapter 01 — the dream",
    lines: [
      "It started with game worlds.",
      "I wanted to be a game artist. Characters, levels, whole places that only existed because I made them.",
      "Then I touched code for the first time. It was the hardest thing I had ever tried.",
    ],
  },
  turn: {
    label: "chapter 02 — the turn",
    lines: [
      "The start was rough. Nothing worked and I understood almost none of it.",
      "Then AI changed how I learn. The wall I kept hitting suddenly had doors.",
      "I stopped following tutorials and started shipping real things.",
    ],
  },
  work: {
    label: "chapter 03 — the work",
    heading: "Proof, not promises.",
    sub: "Five things I built that are real: real users, real payments, real uptime.",
  },
  craft: {
    label: "chapter 04 — the craft",
    heading: "What I work with.",
  },
  contact: {
    label: "chapter 05 — what's next",
    heading: "Let's build something.",
    sub: "Open for internships, work, and ideas that sound impossible.",
    email: "pathuisjasper@gmail.com",
    github: "https://github.com/jappie-p",
  },
} as const;
```

- [ ] **Step 5: Create `src/data/skills.ts`**

```ts
export const skills = [
  { cluster: "Web", items: ["TypeScript", "Node.js", "Next.js", "Express", "MySQL"] },
  { cluster: "Infra", items: ["Linux", "Docker", "Proxmox", "nginx", "systemd"] },
  { cluster: "AI", items: ["Claude", "AI agents", "MCP", "automation"] },
  { cluster: "Mobile", items: ["Swift", "SwiftUI"] },
  { cluster: "Security", items: ["auth systems", "rate limiting", "hardening", "honeypots"] },
];

export const stats = [
  { label: "projects shipped", value: 15, suffix: "+" },
  { label: "servers in production", value: 4, suffix: "" },
  { label: "years of building", value: 3, suffix: "" },
];
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. The sanitization test must pass with zero forbidden terms.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: site content data with Social Elephant sanitization guard"
```

---

### Task 6: GSAP Registration + Smooth Scroll + Grain

**Files:**
- Create: `src/lib/gsap.ts`
- Modify: `src/components/providers/SmoothScroll.tsx` (replace stub)

- [ ] **Step 1: Create `src/lib/gsap.ts`**

```ts
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
```

- [ ] **Step 2: Replace `src/components/providers/SmoothScroll.tsx`**

```tsx
"use client";

import { ReactLenis } from "lenis/react";
import type { LenisRef } from "lenis/react";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lenis.destroy();
      return;
    }

    lenis.on("scroll", ScrollTrigger.update);
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis
      root
      options={{ autoRaf: false, anchors: true, syncTouch: false }}
      ref={lenisRef}
    >
      {children}
    </ReactLenis>
  );
}
```

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: both green.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: gsap plugin registration and Lenis smooth scroll synced to ScrollTrigger"
```

---

### Task 7: Journey Skeleton + Global Progress

**Files:**
- Create: `src/components/journey/Journey.tsx`
- Create: `src/components/journey/Hero.tsx`, `Dream.tsx`, `Turn.tsx`, `Work.tsx`, `Craft.tsx`, `Contact.tsx` (skeletons, filled in Tasks 13–14)
- Modify: `src/app/page.tsx` (full replace)

- [ ] **Step 1: Create six skeleton chapter components**

Each chapter exports inner content only; `Journey.tsx` owns the outer section wrapper. Create all six with this identical pattern (shown for `Hero.tsx`; repeat for Dream/Turn/Work/Craft/Contact changing only the name and text):

```tsx
export default function Hero() {
  return (
    <div className="sticky top-0 flex h-screen items-center justify-center">
      <p className="font-mono text-bone-faint">[hero]</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/journey/Journey.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { CHAPTERS } from "@/lib/journey-math";
import { useJourney } from "@/lib/store";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import Hero from "./Hero";
import Dream from "./Dream";
import Turn from "./Turn";
import Work from "./Work";
import Craft from "./Craft";
import Contact from "./Contact";

const CHAPTER_COMPONENTS: Record<string, React.ComponentType> = {
  hero: Hero,
  dream: Dream,
  turn: Turn,
  work: Work,
  craft: Craft,
  contact: Contact,
};

export default function Journey() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => useJourney.getState().setScroll(self.progress),
      });
      // Reduced motion still gets correct chapter state; gsap.matchMedia is
      // used for *visual* choreography inside chapters, not for this wiring.
    },
    { scope: ref }
  );

  return (
    <main ref={ref} className="relative">
      {CHAPTERS.map(({ id, weight }) => {
        const Chapter = CHAPTER_COMPONENTS[id];
        return (
          <section
            key={id}
            id={id}
            style={{ height: `${weight * 100}vh` }}
            className="relative"
          >
            <Chapter />
          </section>
        );
      })}
    </main>
  );
}
```

- [ ] **Step 3: Replace `src/app/page.tsx`**

```tsx
import Journey from "@/components/journey/Journey";

export default function Home() {
  return <Journey />;
}
```

(`WorldRoot` and `Preloader` are added to this page in Tasks 8 and 11.)

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`
Expected: green. `npm run dev`, open http://localhost:3000 — six labeled sections scroll smoothly (Lenis easing noticeable).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: journey skeleton with global scroll progress into store"
```

---

### Task 8: World Canvas, Camera Rig, WebGL Fallback

**Files:**
- Create: `src/components/world/WorldRoot.tsx`
- Create: `src/components/world/WorldCanvas.tsx`
- Create: `src/components/world/CameraRig.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/world/WorldRoot.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useJourney } from "@/lib/store";

// ssr:false is only valid inside a Client Component (Next 16 rule).
const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

export default function WorldRoot() {
  const webglOk = useJourney((s) => s.webglOk);
  const setWebglOk = useJourney((s) => s.setWebglOk);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebglOk(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebglOk(false);
    }
  }, [setWebglOk]);

  if (webglOk === false) {
    // Spec §8: no-WebGL fallback keeps full content on a static backdrop.
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 110% at 30% 110%, #1c1410 0%, #070605 70%)",
        }}
      />
    );
  }
  if (webglOk === null) return null;
  return <WorldCanvas />;
}
```

- [ ] **Step 2: Create `src/components/world/CameraRig.tsx`**

```tsx
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useRef } from "react";
import { sampleCamera } from "@/lib/journey-math";
import { useJourney } from "@/lib/store";

export default function CameraRig() {
  const camera = useThree((s) => s.camera);
  const sample = useRef({ position: new Vector3(), target: new Vector3() });
  const smoothedTarget = useRef<Vector3 | null>(null);

  useFrame((_, dt) => {
    const { progress } = useJourney.getState();
    sampleCamera(progress, sample.current);

    if (!smoothedTarget.current) {
      smoothedTarget.current = sample.current.target.clone();
      camera.position.copy(sample.current.position);
    }

    const k = Math.min(1, dt * 3.2);
    camera.position.lerp(sample.current.position, k);
    smoothedTarget.current.lerp(sample.current.target, k);
    camera.lookAt(smoothedTarget.current);
  });

  return null;
}
```

- [ ] **Step 3: Create `src/components/world/WorldCanvas.tsx`**

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import CameraRig from "./CameraRig";

export default function WorldCanvas() {
  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 42, near: 0.1, far: 60, position: [0, 0.6, 8] }}
      >
        <color attach="background" args={["#070605"]} />
        <fog attach="fog" args={["#070605", 6, 28]} />
        <ambientLight intensity={0.15} color="#f5f0ea" />
        <directionalLight position={[3, 6, 2]} intensity={0.25} color="#f5e0c8" />
        <Suspense fallback={null}>
          <CameraRig />
          {/* Embers (Task 9), MonolithField + DreamFragment (Task 10) mount here */}
        </Suspense>
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 4: Mount in `src/app/page.tsx`**

```tsx
import Journey from "@/components/journey/Journey";
import WorldRoot from "@/components/world/WorldRoot";

export default function Home() {
  return (
    <>
      <WorldRoot />
      <Journey />
    </>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run build && npm test`
Expected: green. In dev: near-black warm canvas behind the sections, no console errors. Scrolling visibly eases the camera (skeleton text parallaxes against background fog tones).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: persistent world canvas with camera rig and WebGL fallback"
```

---

### Task 9: Ember Particles (Custom Shader)

**Files:**
- Create: `src/components/world/Embers.tsx`
- Modify: `src/components/world/WorldCanvas.tsx` (mount)

- [ ] **Step 1: Create `src/components/world/Embers.tsx`**

```tsx
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
} from "three";

const VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSeed;
  varying float vFade;

  void main() {
    vec3 p = position;
    float h = 7.0;
    p.y = mod(position.y + uTime * (0.12 + aSeed * 0.22), h);
    p.x += sin(uTime * (0.2 + aSeed * 0.3) + aSeed * 40.0) * 0.45;
    vFade = smoothstep(0.0, 0.9, p.y) * (1.0 - smoothstep(h - 1.6, h, p.y));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.0 + aSeed * 5.0) * (14.0 / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying float vFade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.05, d) * vFade;
    vec3 col = mix(vec3(0.85, 0.47, 0.02), vec3(0.96, 0.62, 0.04), vFade);
    gl_FragColor = vec4(col, a * 0.8);
  }
`;

// Deterministic PRNG so the field is stable across renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Embers() {
  const material = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const isSmall =
      typeof window !== "undefined" && window.innerWidth < 768;
    const count = isSmall ? 140 : 450;
    const rand = mulberry32(1337);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 18; // x
      positions[i * 3 + 1] = rand() * 7; // y (cycled in shader)
      positions[i * 3 + 2] = 9 - rand() * 34; // z along the camera path
      seeds[i] = rand();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
    const uniforms = { uTime: { value: 0 } };
    return { geometry, uniforms };
  }, []);

  useFrame((state) => {
    if (material.current) {
      material.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
```

- [ ] **Step 2: Mount in `WorldCanvas.tsx`** — inside `<Suspense>`, after `<CameraRig />`:

```tsx
import Embers from "./Embers";
// …
<Embers />
```

- [ ] **Step 3: Verify**

Run: `npm run build`. In dev: warm amber embers drift upward through the whole journey, denser near the camera, fading at top/bottom of their cycle. No console warnings about shaders.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: GPU ember particle field with custom shaders"
```

---

### Task 10: Monolith Field + Dream Geometry

**Files:**
- Create: `src/components/world/MonolithField.tsx`
- Create: `src/components/world/DreamFragment.tsx`
- Modify: `src/components/world/WorldCanvas.tsx` (mount both)

- [ ] **Step 1: Create `src/components/world/MonolithField.tsx`**

```tsx
"use client";

import { featured } from "@/data/projects";

// Five project monoliths flank the camera path through the work chapter
// (camera z ≈ -3.5 → -8 there), plus ambient silhouettes deeper in the fog.
const PROJECT_SLOTS: [number, number, number, number][] = [
  // x, z, height, rotationY
  [-2.6, -4.0, 2.6, 0.18],
  [2.4, -5.2, 3.1, -0.22],
  [-2.2, -6.4, 2.2, 0.4],
  [2.8, -7.6, 2.8, -0.1],
  [-2.9, -8.8, 3.4, 0.28],
];

const AMBIENT_SLOTS: [number, number, number, number][] = [
  [-6, -12, 4.5, 0.5],
  [7, -14, 6, -0.3],
  [-8, -18, 8, 0.2],
  [5, -20, 7, 0.7],
  [-4, -24, 9, -0.5],
  [9, -26, 8, 0.1],
  [0, -30, 11, 0.3],
  [-10, -28, 7, -0.2],
];

function Monolith({
  slot,
  emissive = 0,
}: {
  slot: [number, number, number, number];
  emissive?: number;
}) {
  const [x, z, h, ry] = slot;
  return (
    <mesh position={[x, h / 2 - 0.2, z]} rotation={[0, ry, 0]}>
      <boxGeometry args={[h * 0.28, h, h * 0.2]} />
      <meshStandardMaterial
        color="#14110e"
        roughness={0.92}
        metalness={0.05}
        emissive="#d97706"
        emissiveIntensity={emissive}
      />
    </mesh>
  );
}

export default function MonolithField() {
  return (
    <group>
      {featured.map((p, i) => (
        <group key={p.slug}>
          <Monolith slot={PROJECT_SLOTS[i]} emissive={0.06} />
          {/* faint ember core light per project monolith */}
          <pointLight
            position={[PROJECT_SLOTS[i][0], 1.1, PROJECT_SLOTS[i][1] + 0.6]}
            color="#d97706"
            intensity={1.4}
            distance={4}
            decay={2}
          />
        </group>
      ))}
      {AMBIENT_SLOTS.map((slot, i) => (
        <Monolith key={`ambient-${i}`} slot={slot} />
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Create `src/components/world/DreamFragment.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { useJourney } from "@/lib/store";

// CH1: a floating low-poly "game world" fragment (the dream).
// CH2: a clean assembled stack (the turn). Both fade by chapter.
export default function DreamFragment() {
  const dream = useRef<Group>(null);
  const turn = useRef<Group>(null);

  useFrame((state) => {
    const { chapter, chapterProgress } = useJourney.getState();
    const t = state.clock.elapsedTime;

    if (dream.current) {
      dream.current.rotation.y = t * 0.15;
      dream.current.position.y = 0.9 + Math.sin(t * 0.6) * 0.12;
      // Visible through hero + dream, gone by mid-turn.
      const vis =
        chapter < 2 ? 1 : chapter === 2 ? Math.max(0, 1 - chapterProgress * 2) : 0;
      dream.current.scale.setScalar(0.001 + vis);
    }
    if (turn.current) {
      turn.current.rotation.y = -t * 0.08;
      const vis =
        chapter === 2
          ? Math.min(1, chapterProgress * 2)
          : chapter > 2
            ? 1
            : 0;
      turn.current.scale.setScalar(0.001 + vis * 0.9);
    }
  });

  return (
    <>
      <group ref={dream} position={[-1.6, 0.9, 2.2]}>
        <mesh>
          <icosahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color="#0d0b09" roughness={0.85} wireframe />
        </mesh>
        <mesh position={[0.8, 0.4, -0.3]} rotation={[0.4, 0.3, 0.1]}>
          <boxGeometry args={[0.28, 0.28, 0.28]} />
          <meshStandardMaterial color="#a8a29e" roughness={0.9} wireframe />
        </mesh>
        <mesh position={[-0.7, -0.4, 0.2]} rotation={[0.2, 0.8, 0.3]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} wireframe />
        </mesh>
      </group>

      <group ref={turn} position={[1.5, 0.5, -1.2]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, i * 0.34, 0]} rotation={[0, i * 0.18, 0]}>
            <boxGeometry args={[0.9 - i * 0.16, 0.26, 0.9 - i * 0.16]} />
            <meshStandardMaterial color="#1c1917" roughness={0.88} />
          </mesh>
        ))}
      </group>
    </>
  );
}
```

- [ ] **Step 3: Mount both in `WorldCanvas.tsx`** inside `<Suspense>`:

```tsx
import MonolithField from "./MonolithField";
import DreamFragment from "./DreamFragment";
// …
<MonolithField />
<DreamFragment />
```

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`. In dev, scroll the journey: wireframe fragment floats during dream, swaps to the assembled stack during turn, ember-lit monoliths line the path through work, giant silhouettes loom in the fog beyond.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: project monolith field and dream/turn geometry driven by chapter state"
```

---

### Task 11: Preloader

**Files:**
- Create: `src/components/ui/Preloader.tsx`
- Modify: `src/app/page.tsx` (mount)

- [ ] **Step 1: Create `src/components/ui/Preloader.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useJourney } from "@/lib/store";

const SESSION_KEY = "ember-preloaded";

export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const emberRef = useRef<HTMLDivElement>(null);
  const [skipped] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const tl = useRef<gsap.core.Timeline>(null);

  useGSAP(
    () => {
      if (skipped) {
        useJourney.getState().setLoaded(true);
        return;
      }

      const counter = { v: 0 };
      const timeline = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem(SESSION_KEY, "1");
          useJourney.getState().setLoaded(true);
          if (root.current) root.current.style.display = "none";
        },
      });
      tl.current = timeline;

      // Counter gates on real loading: fonts ready before it may finish.
      timeline.to(counter, {
        v: 100,
        duration: 1.8,
        ease: "steps(24)",
        onUpdate: () => {
          if (counterRef.current) {
            counterRef.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
          }
        },
      });
      timeline.addPause("+=0", () => {
        document.fonts.ready.then(() => timeline.play());
      });
      // Ignition: the ember flares, the void burns open.
      timeline.to(emberRef.current, {
        scale: 28,
        opacity: 0.9,
        duration: 0.7,
        ease: "power3.in",
      });
      timeline.to(
        root.current,
        { clipPath: "inset(0 0 100% 0)", duration: 0.8, ease: "power4.inOut" },
        "-=0.15"
      );
    },
    { scope: root }
  );

  if (skipped) return null;

  return (
    <div
      ref={root}
      data-preloader
      onClick={() => tl.current?.progress(1)}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-void"
      style={{ clipPath: "inset(0 0 0% 0)" }}
    >
      <div
        ref={emberRef}
        className="absolute h-2 w-2 rounded-full bg-ember opacity-60"
        style={{ boxShadow: "0 0 24px 6px rgba(217,119,6,.55)" }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <span
          ref={counterRef}
          className="headline text-bone tabular-nums"
          style={{ fontSize: "clamp(4rem, 14vw, 11rem)" }}
        >
          000
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-bone-faint">
          igniting
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount in `src/app/page.tsx`**

```tsx
import Journey from "@/components/journey/Journey";
import WorldRoot from "@/components/world/WorldRoot";
import Preloader from "@/components/ui/Preloader";

export default function Home() {
  return (
    <>
      <WorldRoot />
      <Preloader />
      <Journey />
    </>
  );
}
```

- [ ] **Step 3: Verify**

`npm run build` green. In dev (fresh tab or after `sessionStorage.clear()`): counter steps 000→100, ember flares, screen wipes upward into the hero. Click skips instantly. Reloading in the same session skips it entirely.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: ignition preloader gated on font loading with session skip"
```

---

### Task 12: Text Animation Components

**Files:**
- Create: `src/components/ui/RevealLines.tsx`
- Create: `src/components/ui/ScrambleLabel.tsx`

- [ ] **Step 1: Create `src/components/ui/RevealLines.tsx`**

Masked line-by-line reveal on scroll. Children that should animate get `data-lines`. Without JS or with reduced motion, text is simply visible (animation is built `from`, so the resting state is final).

```tsx
"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

export default function RevealLines({
  children,
  className,
  start = "top 75%",
}: {
  children: React.ReactNode;
  className?: string;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const targets = ref.current!.querySelectorAll("[data-lines]");
        if (!targets.length) return;
        const split = SplitText.create(targets, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
        });
        gsap.from(split.lines, {
          yPercent: 115,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start },
        });
        return () => split.revert();
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/ScrambleLabel.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export default function ScrambleLabel({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(ref.current, {
          duration: 1.1,
          delay,
          scrambleText: {
            text,
            chars: "upperCase",
            speed: 0.4,
          },
          scrollTrigger: { trigger: ref.current, start: "top 90%" },
        });
      });
    },
    { scope: ref }
  );

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
```

- [ ] **Step 3: Verify build + tests**

Run: `npm run build && npm test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: SplitText line reveals and scramble labels with reduced-motion gating"
```

---

### Task 13: Chapters 0–2 Content (Hero, Dream, Turn)

**Files:**
- Modify: `src/components/journey/Hero.tsx` (replace skeleton)
- Modify: `src/components/journey/Dream.tsx` (replace skeleton)
- Modify: `src/components/journey/Turn.tsx` (replace skeleton)

- [ ] **Step 1: Replace `Hero.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { useJourney } from "@/lib/store";
import { story } from "@/data/story";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const loaded = useJourney((s) => s.loaded);

  useGSAP(
    () => {
      if (!loaded) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(".hero-name", {
          type: "chars",
          mask: "chars",
        });
        gsap.from(split.chars, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.035,
          ease: "power4.out",
          delay: 0.1,
        });
        gsap.from(".hero-fade", {
          opacity: 0,
          y: 14,
          duration: 0.9,
          stagger: 0.12,
          delay: 0.9,
        });
        return () => split.revert();
      });
    },
    { scope: ref, dependencies: [loaded] }
  );

  return (
    <div
      ref={ref}
      className="sticky top-0 flex h-screen flex-col justify-center px-6 md:px-14"
    >
      <p className="hero-fade mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ember">
        portfolio — 2026
      </p>
      <h1 className="headline text-bone" style={{ fontSize: "clamp(4rem, 16.5vw, 15rem)" }}>
        <span className="hero-name block">{story.hero.name[0]}</span>
        <span className="hero-name headline-outline block">
          {story.hero.name[1]}
        </span>
      </h1>
      <div className="hero-fade mt-8 flex items-end justify-between">
        <p className="max-w-xs text-lg text-bone-dim">{story.hero.tagline}</p>
        <div className="hidden flex-col items-end gap-1 font-mono text-xs uppercase tracking-[0.25em] text-bone-faint md:flex">
          {story.hero.meta.map((m) => (
            <ScrambleLabel key={m} text={m} />
          ))}
        </div>
      </div>
      <div className="hero-fade absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-bone-faint">
        {story.hero.hint}
        <span className="ml-2 inline-block animate-pulse text-ember">▾</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `Dream.tsx`**

```tsx
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Dream() {
  return (
    <div className="sticky top-0 flex h-screen items-center px-6 md:px-14">
      <RevealLines className="max-w-2xl">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.dream.label} />
        </p>
        {story.dream.lines.map((line, i) => (
          <p
            key={i}
            data-lines
            className={
              i === 0
                ? "headline mb-6 text-bone"
                : "mb-5 text-xl leading-relaxed text-bone-dim md:text-2xl"
            }
            style={i === 0 ? { fontSize: "clamp(2.4rem, 6vw, 5rem)" } : undefined}
          >
            {line}
          </p>
        ))}
      </RevealLines>
    </div>
  );
}
```

- [ ] **Step 3: Replace `Turn.tsx`** — identical structure to `Dream.tsx` with `story.turn` and content right-aligned for rhythm:

```tsx
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Turn() {
  return (
    <div className="sticky top-0 flex h-screen items-center justify-end px-6 md:px-14">
      <RevealLines className="max-w-2xl text-right">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.turn.label} />
        </p>
        {story.turn.lines.map((line, i) => (
          <p
            key={i}
            data-lines
            className={
              i === 0
                ? "headline mb-6 text-bone"
                : "mb-5 text-xl leading-relaxed text-bone-dim md:text-2xl"
            }
            style={i === 0 ? { fontSize: "clamp(2.4rem, 6vw, 5rem)" } : undefined}
          >
            {line}
          </p>
        ))}
      </RevealLines>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

`npm run build && npm test` green. In dev: hero chars rise out of masks after preloader; dream/turn copy reveals line by line as you scroll; labels scramble in.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: hero, dream and turn chapters with choreographed text"
```

---

### Task 14: Chapters 3–5 Content + Case Stubs

**Files:**
- Modify: `src/components/journey/Work.tsx`, `Craft.tsx`, `Contact.tsx` (replace skeletons)
- Create: `src/app/work/[slug]/page.tsx`

- [ ] **Step 1: Replace `Work.tsx`**

```tsx
import Link from "next/link";
import { featured } from "@/data/projects";
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Work() {
  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-24 md:px-14">
      <RevealLines>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.work.label} />
        </p>
        <h2
          data-lines
          className="headline mb-3 text-bone"
          style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
        >
          {story.work.heading}
        </h2>
        <p data-lines className="mb-16 max-w-md text-bone-dim">
          {story.work.sub}
        </p>
      </RevealLines>

      <ol>
        {featured.map((p, i) => (
          <li key={p.slug} className="border-t border-stone last:border-b">
            <Link
              href={`/work/${p.slug}`}
              className="group flex flex-col gap-2 py-8 transition-colors md:flex-row md:items-baseline md:gap-8"
            >
              <span className="font-mono text-xs text-bone-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="headline flex-1 text-bone transition-colors group-hover:text-ember"
                style={{ fontSize: "clamp(2rem, 7vw, 5.5rem)" }}
              >
                {p.title}
              </span>
              <span className="max-w-xs font-mono text-xs uppercase tracking-wider text-bone-faint">
                {p.year} · {p.role}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Replace `Craft.tsx`**

```tsx
import { skills, stats } from "@/data/skills";
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Craft() {
  return (
    <div className="sticky top-0 flex h-screen flex-col justify-center px-6 md:px-14">
      <RevealLines>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.craft.label} />
        </p>
        <h2
          data-lines
          className="headline mb-12 text-bone"
          style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
        >
          {story.craft.heading}
        </h2>
      </RevealLines>

      <div className="grid gap-8 md:grid-cols-5">
        {skills.map((s) => (
          <div key={s.cluster} className="border-t border-stone pt-4">
            <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-ember">
              {s.cluster}
            </h3>
            <ul className="space-y-1 text-sm text-bone-dim">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 flex gap-12">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="headline text-ember" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
              {s.value}
              {s.suffix}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone-faint">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

(Count-up animation for stats is Plan 2 polish; static numbers ship first.)

- [ ] **Step 3: Replace `Contact.tsx`**

```tsx
import { archive } from "@/data/projects";
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Contact() {
  return (
    <div className="flex min-h-full flex-col justify-end px-6 pb-16 pt-24 md:px-14">
      <RevealLines>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.contact.label} />
        </p>
        <h2
          data-lines
          className="headline mb-4 text-bone"
          style={{ fontSize: "clamp(3rem, 10vw, 9rem)" }}
        >
          {story.contact.heading}
        </h2>
        <p data-lines className="mb-10 max-w-md text-bone-dim">
          {story.contact.sub}
        </p>
      </RevealLines>

      <div className="mb-20 flex flex-wrap gap-8 font-mono text-sm">
        <a
          href={`mailto:${story.contact.email}`}
          className="border-b border-ember pb-1 text-bone transition-colors hover:text-ember"
        >
          {story.contact.email}
        </a>
        <a
          href={story.contact.github}
          target="_blank"
          rel="noreferrer"
          className="border-b border-stone pb-1 text-bone-dim transition-colors hover:text-ember"
        >
          github.com/jappie-p
        </a>
      </div>

      <div className="border-t border-stone pt-8">
        <h3 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-bone-faint">
          archive
        </h3>
        <ul className="grid gap-x-12 gap-y-3 md:grid-cols-2">
          {archive.map((a) => (
            <li
              key={a.title}
              className="flex items-baseline justify-between gap-4 text-sm"
            >
              <span className="text-bone-dim">
                {a.href ? (
                  <a href={a.href} target="_blank" rel="noreferrer" className="hover:text-ember">
                    {a.title}
                  </a>
                ) : (
                  a.title
                )}
              </span>
              <span className="font-mono text-[10px] text-bone-faint">
                {a.year} · {a.tech.join(" / ")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.3em] text-bone-faint">
          © 2026 jasper pathuis — built from scratch, runs on my own server
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create stub `src/app/work/[slug]/page.tsx`** (full case pages are Plan 2; Next 16: `params` is a Promise)

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { featured } from "@/data/projects";

export function generateStaticParams() {
  return featured.map((p) => ({ slug: p.slug }));
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = featured.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 md:px-14">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
        case study — coming soon
      </p>
      <h1 className="headline text-bone" style={{ fontSize: "clamp(3rem, 12vw, 11rem)" }}>
        {project.title}
      </h1>
      <p className="mt-6 max-w-xl text-bone-dim">{project.tagline}</p>
      <p className="mt-2 font-mono text-xs uppercase tracking-wider text-bone-faint">
        {project.year} · {project.role} · {project.tech.join(" / ")}
      </p>
      <Link href="/#work" className="mt-12 inline-block font-mono text-sm text-ember">
        ← back to the journey
      </Link>
    </main>
  );
}
```

- [ ] **Step 5: Verify**

`npm run build && npm test` green. Build output lists `/work/[slug]` with 5 static params. In dev: work rows hover to ember, clicking lands on a styled stub, back link returns.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: work, craft and contact chapters plus case page stubs"
```

---

### Task 15: Playwright Smoke Tests + Final Verify

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/journey.spec.ts`
- Modify: `package.json` (script)

- [ ] **Step 1: Install Playwright (chromium only — disk is tight)**

```bash
npm i -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run build && npm run start",
    port: 3000,
    timeout: 240_000,
    reuseExistingServer: true,
  },
});
```

Add script: `"test:e2e": "playwright test"`.

- [ ] **Step 3: Create `e2e/journey.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("journey renders all chapters and hero name", async ({ page }) => {
  await page.goto("/");
  // Preloader completes (or was skipped) within 8s.
  await expect(page.locator("[data-preloader]")).toBeHidden({ timeout: 8000 });
  await expect(page.locator("h1")).toContainText("JASPER");
  for (const id of ["hero", "dream", "turn", "work", "craft", "contact"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
});

test("case stub pages resolve", async ({ page }) => {
  await page.goto("/work/hyphosting");
  await expect(page.locator("h1")).toContainText("HypHosting");
  await page.goto("/work/jarvis");
  await expect(page.locator("h1")).toContainText("Jarvis");
});

test("content survives without WebGL (fallback mode)", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    // Force the WebGL detection to fail.
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("JASPER", { timeout: 15000 });
  await expect(page.locator("#contact")).toHaveCount(1);
});
```

- [ ] **Step 4: Run the full suite**

```bash
npm test && npm run test:e2e
```

Expected: vitest PASS, all 3 Playwright tests PASS.

- [ ] **Step 5: Final commit + push**

```bash
git add -A && git commit -m "test: playwright smoke suite for journey, case stubs and WebGL fallback"
git push
```

---

## Self-Review Notes

- **Spec coverage (Plan 1 scope):** §3 tokens/type (T1), §4 preloader (T11), chapters table (T7, T13, T14), camera rails + world (T3, T8–T10), §5 sanitization enforced by test (T5), §6 stack (T2, T6), §7 architecture (T7–T8), §8 fallbacks + reduced motion (T6, T8, T12, e2e), §12 testing (T2, T15). Deferred to Plan 2: case-study content, monolith hover ignition + camera dive transition, count-up stats, marquee, sound. Plan 3: contact form/API (§10), perf hardening (§8 budgets), deploy (§11).
- **Type consistency:** store hook is `useJourney` everywhere; `sampleCamera(p, out)` mutating signature used in both test and rig; `CHAPTERS`/`TOTAL_WEIGHT`/`progressToChapter` names consistent; chapter components are default exports composed only by `Journey.tsx`.
- **No placeholders:** every code step contains complete code; chapter skeletons in T7 are intentional scaffolding replaced by T13–T14 within this same plan.
