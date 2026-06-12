# EMBER — Jasper Pathuis Portfolio — Design Spec

**Date:** 2026-06-12
**Status:** Approved design, pending spec review
**Codename:** EMBER (working title; the live site is simply "Jasper Pathuis")

## 1. Overview

A ground-up rebuild of Jasper's portfolio as an award-grade, scroll-driven experience: one continuous journey through a dark, warm 3D void ("The World", inspired by igloo.inc) dressed in cinematic editorial typography and film grain ("Darkroom" aesthetic). Built as a hybrid: persistent WebGL world behind real HTML content.

The previous portfolio (`Sites/localhost/portfolio/`, Next.js 16) is retired as a codebase. Its `src/data/projects.ts` content is ported and updated. New repo: `Sites/localhost/portfolio-v2/`.

## 2. Goals & Audience

- **Audiences, in order:** (1) personal flex / creative statement, (2) employers & internship companies, (3) other developers.
- The site itself is the primary proof of skill. Content must still be readable, indexable, and navigable for recruiters.
- Tells Jasper's story as a narrative thread: game-artist dream → chose code → rough start → AI-accelerated growth → builds everything.

## 3. Creative Direction

- **Structure:** B "The World" — one-page scroll journey, camera on rails through chapters.
- **Skin:** D "Darkroom" — massive cropped editorial type, film grain, restrained high-end studio energy.
- **Palette "Void & Ember":** warm near-black `#070605`, stone `#292524`, ember amber `#d97706` (single accent), bone white `#f5f0ea`. Supporting warm greys from the stone scale.
- **Type:** Clash Display (display), Satoshi (body), Geist Mono (small labels/meta) — all self-hosted via `next/font/local`.
- **Texture:** film grain overlay site-wide; embers/dust particles in the world.
- **Language:** English.
- **Sound:** subtle ambience + interaction ticks. Off by default, corner toggle, respects autoplay policies. Nice-to-have: ships only if it doesn't threaten the launch.

## 4. Experience Design

### Preloader
- 0→100 counter, bone type on black, grain. Genuinely gates on preloading 3D assets/fonts.
- At 100: single ember ignites, screen "burns open" (shader dissolve / clip-path + Flip handoff) into hero.
- Max ~3s perceived; skippable on click/key. Shown once per session (sessionStorage).

### Chapters (single page `/`)
| # | Chapter | World (WebGL) | DOM layer |
|---|---------|---------------|-----------|
| 0 | Hero | Void, drifting embers, distant monolith silhouettes, fog | `JASPER PATHUIS` oversized editorial type; scramble-in meta labels (`developer — builder — nederland`); scroll hint |
| 1 | The Dream | Low-poly game-world fragment emerges from fog | Story text, line-by-line SplitText reveals: wanting to make games |
| 2 | The Turn | Fragment shatters; shards reassemble into clean geometry | Story: chose code as a challenge, rough start, AI, rapid growth. Scramble-text accents |
| 3 | The Work | Field of 5 monoliths; hover ignites amber core; click = camera dive + shader dissolve into case page | Floating project cards (title, year, stack) synced to monolith positions |
| 4 | The Craft | Ember particles swarm into skill constellations | Skill clusters (Web · Infra · AI · Mobile · Security) + GitHub stats count-up |
| 5 | Contact | Particle field morphs into shapes under cursor (igloo footer homage) | "Let's build something." Contact form, email, GitHub; archive index of smaller projects |

- Camera moves on rails driven by scroll progress (Lenis + ScrollTrigger → zustand → R3F camera path). Scene transitions use displacement/dissolve shaders, never hard cuts.
- Chapter copy is short — a few lines each. The world carries the narrative weight.

### Case pages `/work/[slug]`
Pure Darkroom editorial, no 3D world (fast, content-first), but same grain/type/palette plus scroll-velocity image distortion shaders.

Layout: huge cropped title → meta grid (year / role / stack / links) → narrative sections (Context, Build, Challenges, Outcome) → media with distortion-on-scroll → prev/next project loop (never dead-ends).

Transition from journey: camera dives into monolith → full-screen shader dissolve → case page mounts underneath. Back navigation returns to CH3 scroll position.

### Featured projects (5 case pages)
1. **HypHosting Ecosystem** — platform + server panel + iOS app as one story (commercial platform, security system, real-time console, SwiftUI app).
2. **Jarvis** — personal AI assistant wrapping Claude Code; iOS app + VPS server.
3. **Homelab** — Proxmox, GPU transcoding media server, VPN-killswitched download stack, Vaultwarden, honeypot + monitoring, Cloudflare tunnel.
4. **Social Elephant** — work experience: internal automation, AI tooling, system integrations. **See §5 sanitization.**
5. **Louisa Gemstones** — client e-commerce, Stripe, admin panel.

### Archive (in CH5)
Simple elegant index, no case pages: Windsurf Speed (SuuntoPlus), Zelda ALttP remake (Pygame), Amorphophallus plant showcase, Utrecht Festival PWA, Happy Herbivore kiosk, selected school work. One line + tech tags each.

## 5. Social Elephant Sanitization (hard constraint)

- No client names, no internal URLs/domains, no credentials, no real data in any screenshot or copy.
- Visuals: abstract renders/diagrams only — no actual dashboard screenshots.
- Copy describes the *kind* of work (MCP/AI integrations, workflow automation, internal tooling) generically.
- Jasper reviews and approves the Social Elephant case copy + visuals before deploy. Blocking gate.

## 6. Tech Stack

| Concern | Choice | Version (verified 2026-06-12) |
|---|---|---|
| Framework | Next.js App Router + TypeScript | next 16.x |
| Styling | Tailwind | 4.x |
| Animation engine | GSAP (ScrollTrigger, SplitText, ScrambleText, Flip — all free since 3.13) + `@gsap/react` | gsap 3.15, @gsap/react 2.1 |
| Smooth scroll | Lenis (`lenis/react`) synced via `lenis.on('scroll', ScrollTrigger.update)` + gsap ticker, `lagSmoothing(0)` | lenis 1.3 |
| 3D | React Three Fiber + drei + postprocessing | fiber 9.6, drei 10.7, @react-three/postprocessing 3.0, three 0.184 |
| DOM↔canvas state | zustand | 5.x |
| Page transitions | Custom GSAP curtain/dissolve around `router.push` (AnimatePresence route-exit is broken in App Router; `next-view-transitions` optional progressive enhancement) | — |
| Fonts | `next/font/local`: Clash Display, Satoshi, Geist Mono | — |
| Contact delivery | API route + zod validation + in-memory rate limit → Resend; mailto fallback if `RESEND_API_KEY` unset | — |

Note: Next.js 16 conventions differ from training data — read `node_modules/next/dist/docs/` before coding (carried over from old repo's AGENTS.md).

## 7. Architecture

```
src/
  app/
    layout.tsx            // fonts, providers, grain overlay, sound toggle
    page.tsx              // the journey (CH0–CH5 sections)
    work/[slug]/page.tsx  // case pages (generateStaticParams from data)
    api/contact/route.ts
  components/
    world/                // R3F: WorldCanvas, CameraRig, scenes per chapter, shaders/
    journey/              // DOM sections CH0–CH5
    case/                 // case-page building blocks (CaseHero, MediaDistort, MetaGrid…)
    ui/                   // Preloader, GrainOverlay, SoundToggle, TransitionProvider, Marquee
  data/
    projects/             // one typed TS module per project + archive list
    story.ts              // chapter copy
    skills.ts
  lib/                    // lenis setup, gsap registration, zustand stores, utils
```

- **One persistent `<Canvas>`** mounted in the journey route, client-only via dynamic import inside a client wrapper (`ssr:false` constraint in Next 15+). Case pages unmount the world.
- **Scroll state contract:** ScrollTrigger writes normalized chapter progress to zustand; world reads it in `useFrame`. DOM never re-renders per scroll frame (refs/quickTo only).
- **Each unit independently testable:** data modules pure; scenes take progress props; journey sections render without canvas (fallback mode = same components, world absent).

## 8. Performance Budget & Strategy

- **LCP:** hero headline is HTML — target <2.0s desktop / <2.5s mobile. Canvas loads after first paint.
- **INP:** transform/opacity-only DOM animation, `gsap.quickTo` for pointer-driven values, no layout thrash.
- **Assets:** Draco/KTX2-compressed geometry/textures; total 3D payload budget ≤ 4MB; DPR capped [1,2]; drei `PerformanceMonitor` + `AdaptiveDpr`.
- **Mobile:** reduced world (fixed camera + parallax instead of full rails, particle counts slashed, postprocessing off), `syncTouch: false` on Lenis.
- **Fallbacks:** no WebGL → static gradient + grain version, all content intact. `prefers-reduced-motion` → no scroll choreography, instant content, world idles.
- Lighthouse targets before launch: ≥90 desktop perf, ≥75 mobile perf, ≥95 accessibility/SEO/best-practices.

## 9. SEO & Accessibility

- Per-route metadata + OpenGraph images (case pages get generated OG cards in palette/type).
- Sitemap + robots; semantic landmarks; all journey copy real HTML.
- Keyboard: journey navigable by keyboard (sections focusable, skip-to-content link); form fully accessible; SplitText uses its built-in aria handling.

## 10. Contact Flow

Form (name, email, message) → zod validation client+server → rate limit (per-IP, in-memory) → Resend email to `pathuisjasper@gmail.com`. Honeypot field for bots. On failure or missing key: show direct email + GitHub links. No data stored server-side.

## 11. Deployment

- **Target:** hyphosting VPS (`93.115.18.174`), pattern per existing projects: dedicated Linux user `portfolio`, systemd service, Next `output: 'standalone'`, nginx vhost + certbot TLS.
- **Domain:** `jasper.hyphosting.com` — verify unused in DNS before configuring; fallback `portfolio.hyphosting.com`. (Custom domain can be pointed later without code changes.)
- **Process:** git push to GitHub (`jappie-p`) → SSH pull on server → `npm ci && npm run build` → restart service. Never deploy uncommitted code. Credentials/SSH per project `local.md` (gitignored).

## 12. Testing & Error Handling

- **Static:** `npm run build`, `lint`, `tsc --noEmit` green at every milestone.
- **Playwright smoke:** journey renders all chapters; every case route 200s + renders title; contact form validates + honeypot blocks; WebGL-disabled context still shows all content; reduced-motion mode renders.
- **Manual gates:** visual QA round with Jasper per milestone; Safari + Firefox + Chrome desktop, iOS Safari + Android Chrome mobile.
- **Runtime errors:** R3F error boundary → fallback mode (never a blank page); contact API returns typed errors; 404 page in-theme.

## 13. Out of Scope (explicit)

- CMS / admin UI (content = typed TS modules)
- Blog
- Dev-CV download (current CV is a part-time-job CV; a dev CV may be generated later as a separate task)
- Analytics (can add later; privacy-friendly option like Plausible if wanted)
- Dutch translation
- Full WebGL text rendering (SDF) — deliberately rejected

## 14. Open Items (resolved during build)

1. Subdomain availability check on the VPS/DNS (deploy milestone).
2. Resend account + API key (contact milestone; mailto fallback works without it).
3. Social Elephant case copy approval by Jasper (content milestone, blocking).
4. Project media: gather/sanitize screenshots per case; abstract renders for SE.
5. Sound design assets (nice-to-have; ship without if time-boxed out).
