# Portfolio Redesign — "Light / Frosted Glass + Foliage"

**Date:** 19 June 2026
**Author:** Jasper Pathuis (GitHub `jappie-p`)
**Status:** Approved design, pre-implementation
**Supersedes the art direction of:** `2026-06-12-portfolio-ember-design.md` (the dark "EMBER" scroll-journey)

---

## 1. Summary

A fresh rebuild of the developer portfolio as a single continuous scroll experience in a **light "frosted glass + foliage"** art direction (AI + nature fusion), bilingual **NL/EN** with an instant toggle, structured around three signature themed scenes — **Websites, AI, Cyber** — plus full **About** and **Contact** sections. The site doubles as a graded school deliverable and must satisfy every line of the *Validatie formulier GLU* scorecard (mapped in §10).

The opening hero is the **ported Jarvis particle orb** carrying Jasper's name, role, and an "I build with AI" identity line — this is the graded Home. The journey then flows **Hero → Websites → AI → Cyber → About → Contact**.

### Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Foundation | **Fresh rebuild** — new architecture, light theme, new structure. Reuses the existing `portfolio-v2` repo + tooling + dependency set (already the exact target stack); `src/` is rebuilt fresh, specific engines ported selectively. |
| Art direction | **Light, frosted glass + foliage.** Off-white sage-tinted canvas, frosted glass panels, sage/forest greens, reserved cyan (cyber only) + amber (orb/honeypot only), blue-green data glow. No dark theme, no film grain, no vignette. |
| Language | **NL default, full EN toggle.** Instant client-side text-swap (Zustand + localStorage), no `/nl` `/en` routes. Every string in both dictionaries; type-enforced so it can never render mixed-language. |
| Projects | **4–5 deep case studies** (HypHosting, Jarvis, Homelab, Social Elephant, Louisa) + a **light "school & team" strip** (Zelda ALttP Pygame, Utrecht Festival PWA, Happy Herbivore Kiosk) to satisfy school-projects + collaboration rubric lines. |
| Scene order | Hero (orb / AI identity) → **Websites → AI → Cyber** → About → Contact. |
| Scroll | **Two-axis grid (revised 2026-06-21).** Scroll DOWN = move between topics; scroll SIDEWAYS = move through that topic's projects. Independent axes: sideways clamps at a topic's ends, you scroll down for the next topic. Built with native CSS scroll-snap on both axes (`overscroll-behavior: contain`, `scroll-snap-stop: always`); Lenis dropped (it hijacked horizontal wheel); `IntersectionObserver` drives the store. Mobile = same model (vertical scroll + horizontal swipe). Each topic plays a "wake up" scene on entry, then you scroll its projects against that scene. |
| Case studies | Open as **expanding frosted overlay panels** addressed by `?case=<slug>` (shareable, back-button friendly), not separate routes. |
| References | **None held yet.** Graceful "op aanvraag / on request" fallback; Jasper to obtain ≥1 (Social Elephant or teacher) before grading. |
| Public email | **Professional alias on an owned domain** (e.g. `jasper@hyphosting.com`), obfuscated against scraping. Not the personal Gmail. |
| Contact form | Zod-validated client form → Formspree (public form id, no secret) OR a thin endpoint on the SE bridge; swappable via `NEXT_PUBLIC_CONTACT_ENDPOINT`. |
| Region map | Lightweight inline **SVG world silhouette** with an Utrecht/NL marker. No Mapbox/Google, no API key, no tracking. |

### Tech stack (verified from `package.json`)

Next **16.2.9** (App Router), React **19.2.4**, TypeScript 5, Tailwind **4**, React Three Fiber **9.6.1** + drei **10.7.7** + postprocessing **3.0.4**, GSAP **3.15** (+`@gsap/react`), Lenis **1.3.23**, Zustand **5.0.14**, Zod **4.4.3**, Vitest **4.1.8**, Playwright **1.60**.

> **Next 16 caveat** (from `AGENTS.md`): "This is NOT the Next.js you know." Before writing any layout/metadata/config/font/Canvas-boundary code, read the relevant guide under `node_modules/next/dist/docs/` and heed deprecation notices. All scroll/3D/i18n logic lives in client components; the App Router shell stays a thin server component.

---

## 2. Information architecture

A **single rendered route**. The scorecard "pages" (Home, Projects, About, Contact) are scroll sections, not URLs. Deep case studies are URL-addressable via `?case=<slug>` so they stay linkable and back-button-friendly without breaking the single-scroll DOM. Locale is client state, not a route.

**The journey is a 2-axis grid (revised 2026-06-21):** vertical = topics (rows), horizontal = projects within a topic (columns). Hero / About / Contact are single-panel topics with no horizontal track.

```
            [ Hero — orb, name, AI identity ]   ← graded "Home"
                        │ scroll ↓ (topic)
   WEBSITES   ⟵→  cover  ⟵→  HypHosting  ⟵→  Louisa          ← scroll sideways (projects)
                        │ scroll ↓
   AI         ⟵→  cover  ⟵→  Jarvis  ⟵→  Social Elephant
                        │ scroll ↓
   CYBER      ⟵→  cover  ⟵→  Homelab  ⟵→ …
                        │ scroll ↓
   [ School & team strip ]   (Zelda playable, Utrecht Festival, Kiosk)
                        │ scroll ↓
   [ About ]            photo, story, future, skills, CV, links, references
                        │ scroll ↓
   [ Contact ]          email, validated form, SVG region map, footer

Overlay (any time):  ?case=<slug>  → expanding frosted case-study panel
```

Each subject topic opens on a **cover panel** (topic title + lead + "scroll sideways" hint), then its project panels follow horizontally. Header nav jumps vertically to a topic (and resets it to its cover); a 2-tier **ProgressRail** shows the topic position (outer dots) and the active project within it (inner dots).

---

## 3. Visual system — frosted glass + foliage

Replaces the entire dark token set in `src/app/globals.css` (`--void`, `--coal`, `--ember`, `.grain`, `.vignette`, `color-scheme: dark`). All of that is deleted.

### Design tokens (`globals.css`, `:root` + `@theme inline`)

```css
:root {
  /* canvas / sky */
  --canvas:        #f7faf6;  --canvas-2: #eef4ef;
  --sky-top:       #eaf2f7;  --sky-bottom: #f3f7ee;

  /* frosted glass panel */
  --glass-bg:      rgba(255,255,255,0.55);
  --glass-bg-soft: rgba(255,255,255,0.38);
  --glass-border:  rgba(120,150,130,0.28);
  --glass-shadow:  0 8px 32px rgba(40,70,55,0.10);
  --glass-blur:    18px;     --glass-sat: 1.4;

  /* ink (text on light) */
  --ink: #1c2a22;  --ink-dim: #4a5b50;  --ink-faint: #7e8d84;

  /* foliage greens (primary accent) */
  --sage: #8fb89a;  --leaf: #4f9d69;  --forest: #2f6b46;  --moss: #6aa57e;

  /* reserved subject accents (discipline-enforced) */
  --cyber-cyan: #18b4c4;  --cyber-cyan-hi: #5fe3ef;   /* CYBER battle only */
  --honey:      #e0962b;  --honey-hi:      #f4b347;    /* orb + honeypot only */

  /* data glow */
  --glow-blue: #3aa0e8;  --glow-green: #43c98a;
  --focus-ring: #2f6b46;
}
```

`html { color-scheme: light; background: var(--canvas); }`. `body` paints a soft sky gradient (radial cool top + linear sage bottom) so the fixed `-z` WorldCanvas isn't overpainted (same layering trick the old file documented). `::selection` uses `--leaf`; `:focus-visible` uses `--focus-ring` (accessibility, 2.2.6).

### The glass primitive (`Glass.tsx` → `.glass`)

```css
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
}
@supports not (backdrop-filter: blur(1px)) {   /* keeps 2.2.6 on old browsers */
  .glass { background: rgba(255,255,255,0.86); }
}
```

### Ambient foliage

One shared `FoliageAmbient` layer: a fixed, Lenis-parallaxed SVG/`<canvas>` of soft out-of-focus leaf silhouettes drifting at ~8% opacity in `--sage`. Pure 2D, frozen under `prefers-reduced-motion`. This is the "nature" half of the fusion; the only motion-decoration; mobile downgrades it to a static image.

### Color discipline (enforced in code, §6)

- **Cyan** appears only in the Cyber scene. **Amber** appears only on the orb + honeypot. Per-project accents reference a **reserved-token enum** (`leaf` | `cyber` | `honey`), never a raw hex, so the discipline can't be violated by a stray project record. A Vitest test asserts this.

---

## 4. Signature scenes

### 4.1 Websites zone (first subject)

**Subject:** "Ik bouw producten die mensen écht gebruiken" / "I build products people actually use." Anchored by two live, paying products: **HypHosting** (server panel) and **Louisa Edelstenen** (webshop, Stripe).

**Core interaction — draggable filmstrip carousel (NOT before/after wipe).** A scrubber/handle on a horizontal rail; dragging scrubs `progress 0→1` that slides a strip of framed device shots laterally, snapping to the nearest. Each settled frame is independently clickable. (A before/after clip-path wipe was rejected: the two products have different aspect ratios and the gesture must scale to N products and "visit different live sites.")

- Pointer + keyboard: handle is `role="slider"` with `aria-valuetext={projectTitle}`, ArrowLeft/Right step between frames. Tick marks under the rail double as a position indicator (serves 4.4 + 2.2.4).
- `progress` drives a GSAP `quickTo` translate (decoupled from React re-renders); `pointerup` eases to the nearest frame and writes the settled index to a Zustand `useShowcase` slice. Active frame in focus (scale 1.0, glow); off-axis frames recede (scale 0.92, more frost) — a depth-of-field stack.

**Framing — CSS device frames baseline, GLB optional.** `DeviceFrame` = a frosted-glass bezel with faux browser chrome (traffic-light dots + the real URL) wrapping a `next/image` screenshot (or a short muted hover `.webm`). Crisp, zoomable, cross-browser. The optional **"Showcase Display" GLB** maps the active screenshot as a `VideoTexture`, capability-gated with a CSS-frame fallback. `WebsitePanes.tsx` is **repurposed as a ghosted parallax backdrop** (relit to the light palette, `AdditiveBlending`→`NormalBlending`), implying "many sites built" behind the two sharp real frames — it cannot render real screenshots itself (it draws procedural wireframe chrome).

**Affordances per frame:** whole-frame hover → bezel brightens + sage glow + URL chip; **Visit live** (primary, new tab, `rel="noopener"`); **Read case** (secondary → opens the case overlay without leaving the scroll). Clicking the screenshot area = Visit live, with a discoverable tooltip.

**Secondary strip:** smaller cards for Utrecht Festival PWA, Amorphophallus, Webshop Backend (visual hierarchy = the 4.3 "importance" signal; HypHosting + Louisa get the hero frames).

**Mobile:** horizontal off; native swipe strip (`scroll-snap-type: x mandatory`), dots = the same Zustand index; buttons stack at ≥44px tap targets.

### 4.2 AI zone (middle subject) + the hero orb

**One persistent orb instance, two roles.** A single `<OrbStage>` mounts the ported `OrbParticles` once in a fixed full-viewport `<Canvas>` behind the DOM (mirrors how `world/` mounts at `-z-10`). It is **never unmounted on scroll** (that would re-seed the `useMemo` buffers and pop). An **outer positioning group** moves/scales the orb per frame from the journey store (so position doesn't fight the internal breathing pulse):

| Phase | Orb target | Behavior |
|---|---|---|
| Hero / Home | center, scale 1.0 | full orb, `idle` drift; name/role/AI-line DOM overlaid |
| → Websites | drifts top-right, scale 0.45, z−3 | recedes/blurs (DOF) while panes own the screen |
| Websites | parked corner, dim | decorative, pointer-events none |
| → AI | eases back center-left, scale 1.0 | "returns"; flips to `responding` (green-tinted nucleus) = "AI online" |
| AI | center-left anchor | flow graph fans out to its right |
| → Cyber | recedes, cools to `idle` | hands stage to the Cyber viewport |

`@react-three/postprocessing` Bloom (low threshold) makes additive particles read as glow; mild DepthOfField blurs the parked orb.

**Porting the orb** (`jarvis/web/src/components/orb/OrbParticles.tsx`, `OrbContainer.tsx`):
- **(a) Replace `useAppStore`:** the orb reads `jarvisState` (`idle/thinking/responding/error/listening`). Wire it to **journey position** instead — add `orbState` to the journey store, set `idle` at hero, `responding` entering the AI zone. Keep the `stateRef` pattern so the `useFrame` loop is untouched. Only the store import changes; the particle math is copy-paste.
- **(b) Drop `framer-motion`** (only `OrbContainer` used it for a HUD fade). The portfolio uses GSAP/Lenis.
- **(c) Strip `HudRingSvg` + Orbitron + fake live data** ("INBOX 12 NEW" etc. would leak an app UI and create mixed-language strings). Recommended: drop the HUD entirely — the flow graph is the surrounding ring of meaning. Do not keep `NODE_TO_PANEL`/`flashPanelById`/`setPage` (Jarvis app routes).
- **(d) Retint cyan→amber** for the warm Jarvis identity on light: shift `surfaceData`/`innerData`/`atmosphereData` tints warm; `pointLight 0x00C8FF`→`0xF59E0B`; keep the white-hot nucleus + thin blue voice-wave ring (reads as "data" on the warm orb). Lower `OrbContainer`'s `brightness(1.3)`→~1.0.
- **(e) Light-bg readability:** additive particles authored for black wash out on off-white. Render the orb inside a **frosted dark-glass containment disc** (radial dark-amber vignette) so the additive glow still pops while reading as a premium glass object on the sage page.

**Hero content (DOM overlay, graded 3.1):** name **Jasper Pathuis**, role line ("Game-artist die developer werd" / "Game artist turned developer"), and the AI identity line typed character-by-character keyed off the orb's wave ("Ik bouw met AI — assistenten, automatisering, agents." / "I build with AI — assistants, automation, agents."). A nav chip rail (Websites · AI · Cyber · Over mij · Contact) gives one-click access (2.2.4). The orb is silent — the voice-wave is visual geometry, no `AudioContext` (2.2.7).

**Automation flow graph** (`<OrbFlowGraph>`, light reskin of `AutomationGraph.tsx`): reuse the deterministic seed, sagging `QuadraticBezierCurve3` wires, single-draw-call edges/nodes, and the pulse-arrival energy-kick (the literal "a program just talked to another program" beat). Re-author node positions as a **left→right pipeline** at eye level; anchor node 0 **on the orb** (the source). Add frosted drei `<Html>` labels (NL/EN):

```
            ┌─ [Mail] ──┐
[ORB:Jarvis]┤            ├─[Claude agent]─┬─[Server]──[Status]
   (source) ├─[MCP bridge]┤              └─[Code]────[Deploy]
            └─[Simplicate]┘   (Social Elephant lane)
```

Two lanes — a **Jarvis lane** (mail → agent → server/code) and a **Social Elephant lane** (MCP bridge → Simplicate/ClickUp) — so one graph tells both AI stories. Pulses recolored green/blue (data) on amber nodes (lit by the orb); wires soft sage at low opacity.

**Mobile:** keep one small reduced-particle orb (`OrbParticles` already has `frameSkipRef`; bump skip + drop `N_BODY` 3000→1200 via a prop). Replace the WebGL graph with a **2D SVG/CSS pulse graph** (`stroke-dashoffset` animation) — same labels, ~zero GPU. `prefers-reduced-motion` freezes everything to a static frame.

### 4.3 Cyber zone (final subject, dramatic closer)

A calm frosted control room where the defense is visibly working: blue defender-code vs red attacker-code, the **Firewall Sentinel** holding center, a **Honeypot** quietly swallowing leakers. Reads as *competence under attack, composed* — never a dark "hacker" cliché. Home of the **Homelab** case study + the **HypHosting panel security system** proof.

**The readability rule (core constraint):** `CyberGrid`/`OrbParticles`/`WebsitePanes` all use `AdditiveBlending`, which is **invisible on off-white** (white + cyan ≈ white), and cyan/red are the worst offenders. So:

- The battle runs **inside a dark "screen" viewport**, not on the page: a rounded **frosted-glass bezel** (site `--glass` + sage trim) whose *interior* is a deep blue-slate gradient (`#1a2942`→`#0f1d33`, ~92%). This is the one justified dark surface (a screen/HUD). All cyan/red is composited over this dark interior where additive works. The light page + foliage continue around the bezel.
- **Outside the viewport** (radar on the floor, blip labels, honeypot, copy): `NormalBlending` with explicit **deep-ink** colors — cyan→teal-ink `#0e7490`, red→crimson-ink `#b91c1c` (both WCAG-AA on off-white). Bloom is masked to the viewport rect only.

```
CYBER tokens (added to globals.css):
--cyber-glass-bezel: rgba(255,255,255,0.55)
--cyber-screen-top: #1a2942   --cyber-screen-bot: #0f1d33
--cyber-defend: #38bdf8 (in-screen, additive)   --cyber-defend-ink: #0e7490 (on-page)
--cyber-attack: #f87171 (in-screen, additive)   --cyber-attack-ink: #b91c1c (on-page)
--cyber-honey:  #f59e0b (amber catch glow)       --cyber-sage-trim: #7B9E87
```

**Scene:** **Firewall Sentinel GLB** centered above a radar disc, lit by a teal key (defender side) + faint crimson fill (attacker side) so the model itself reads blue-vs-red; a Fresnel rim gives an energized edge; idle bob + a sharp brace on impact. **Honeypot GLB** lower-left, dim amber breathing; on a **catch**, a leaked red particle curves in, the honeypot **flashes amber and snaps shut** (scale-punch + bloom pop) and writes a line to the Canary feed. **Radar disc + shield dome + blips** ported near-verbatim from `CyberGrid` (recolored teal; honeypot catch-beam recolored crimson→amber; caught blip's beam terminates at the honeypot).

**Blue-vs-red code battle (procedural):** two `<points>` streams (~2000 each) driven by a **single vertex shader** (motion on GPU, not CPU loops). Defenders (blue) flow left→right in tidy lanes (orderly = defense); attackers (red) flow inward in jittery diagonals (chaotic = attack). Fragment shader samples a small **code-glyph atlas** (`{ } < > ; / 0 1 $ # &`) so streams literally read as flowing code (or, cheaper, procedural SDF ticks reusing `scanline()` from `WebsitePanes`). A contact plane in front of the sentinel kills crossing attackers (collapse to a white-hot flash = code shattering on the shield); a small `LEAK_LANE` fraction passes → routed to the honeypot. A deterministic timer triggers an **attack wave every ~8s**: density/speed spike, sentinel braces, dome ripples, deflect ring flares, 1 leaker caught → calm. A repeating ~8s mini-narrative.

**Security proofs (frosted HUD cards, page surface):**
1. **Homelab — OpenCanary honeypot** (the zone's deep case study). A live-styled **Canary feed** of fake intrusion events synced to in-scene catches; hardening chips (Mullvad WG kill-switch, Tailscale admin/family ACL, fail2ban, NVIDIA MOK/Secure Boot). CTA → Homelab overlay.
2. **HypHosting panel security system** — a "Login Protection" readout echoing the real panel (rate-limit 3→5s→15min lockout, DB-persisted locks, bot detection, IP bans). Links into the HypHosting case.

Both bilingual. **All Canary IPs/events are fake/illustrative** (2.5).

**Scroll choreography** (this section's ScrollTrigger progress `0→1`): 0–0.2 arrival (viewport unblurs, radar starts) → 0.2–0.45 build (defender lanes fill, sentinel resolves, first deflect) → 0.45–0.7 peak assault → 0.7–0.85 the catch (amber snap + Canary line) → 0.85–1.0 resolve (CTA active). Wave/honeypot timers run on `clock.elapsedTime` so the scene is alive when paused — silently (2.2.7).

**Mobile:** viewport becomes a fixed 4:3 hero card; halved particle counts, bloom off; Sentinel/Honeypot low-poly LOD; on low-end/no-WebGL → a **poster + muted looping MP4** of the battle (which doubles as the 4.6 trailer clip). No scroll-scrub. `prefers-reduced-motion` → static composed frame.

### 4.4 School & team strip

A light, rated row (not heavy pages) to satisfy **4.2** (school projects) and **4.5** (collaboration). Items: **Zelda ALttP Pygame** (school, solo, **playable** — the downloadable/try anchor), **Utrecht Festival PWA** (team), **Happy Herbivore Kiosk** (team). Each card carries title, year, solo/team badge, role, optional link. Explicitly labeled "Schoolprojecten / School projects" so the grader sees the line is hit.

---

## 5. About + Contact

These two sections deliberately drop the heavy 3D so the journey *exhales* into calm, human content. Frosted glass + foliage stays; depth is CSS glass + the shared `FoliageAmbient`.

### 5.1 About (rubric section 5 — every line)

Frosted bento grid (desktop) / single column (mobile):

- **AboutIntro** — nice **photo** (`public/about/jasper.webp`+`.avif`, squircle, sage ring, `next/image` sized to avoid CLS), name, role, 2-sentence dev description. No age/birth-year (2.5).
- **AboutStory** — "Waarom ik dit doe / Why I build": the game-artist→coder arc, ~70 words, first-person, no AI-tells (no em/en dashes, no rule-of-three).
- **AboutFuture** — "Wat ik nog wil leren / What I still want to learn": leaf-bullet chips (e.g. Rust, deeper GPU/shaders, distributed systems at scale, offensive security).
- **SkillsBoard** — two **visually separate** columns: **Hard skills** (blue data-glow meters) and **Soft skills** (leaf meters), each with its own header so the separation is unmistakable. `level: 1–5` meters (honest, no invented percentages). Hard-skill proper nouns (TypeScript, Docker) stay language-neutral so EN never shows a stray Dutch word.
- **CredentialsRow** — **CV (PDF)** download button (`public/cv/...pdf`, privacy-scrubbed); **professional media** (GitHub `jappie-p`, LinkedIn, live deployments — no personal socials, 2.2.8); **recommendations**: render `RecommendationCard`s when present, else a graceful "**Referenties op aanvraag / References on request**" state (Jasper to obtain ≥1 before grading — flagged as a likely lost point until then).

Skill + about data live in typed `data/` files with `{ nl, en }` prose moved to the dictionaries (§6).

### 5.2 Contact (rubric section 6 — every line)

- **ContactDetails** — `mailto:` chip to the **professional alias** (e.g. `jasper@hyphosting.com`), obfuscated against scraping; region label "Utrecht, Nederland".
- **ContactForm** — name / email / message, **Zod**-validated client-side, inline i18n errors, hidden honeypot `company` field (bot trap). Submit → `NEXT_PUBLIC_CONTACT_ENDPOINT` (Formspree public id by default, or a thin SE-bridge endpoint — one env swap, no rewrite). States idle → submitting (green particle pulse) → success / error, all visual, no sound (2.2.7). Keeps the site a static deploy (2.2.6).
- **RegionGlobe** — a **lightweight inline SVG world silhouette** (`--sage`, ~10kb simplified `world-110m`) with a pulsing `--leaf` marker over the Netherlands + "Utrecht, NL" label. A *region on a global map*, exactly the rubric phrasing. No tiles, no network, no key, identical across browsers (2.5 + 2.2.6). Replaces `public/globe.svg`.
- **Footer** — copyright, mirrored lang toggle, "Terug naar boven / Back to top" (Lenis to hero) so the end is one click from the start (2.2.4).

---

## 6. Architecture, i18n, data

### 6.1 Folder structure (fresh `src/` in the existing repo)

```
src/
  app/
    layout.tsx          # SERVER shell; mounts Providers, SmoothScroll, WorldCanvas, LangSync; sets <html lang>
    page.tsx            # SERVER; renders <ScrollJourney> with ordered section children
    globals.css         # light tokens + @theme (§3)
    opengraph-image.tsx # static OG (link previews)
    robots.ts, sitemap.ts
  components/
    canvas/
      WorldCanvas.tsx          # one fixed -z R3F <Canvas>, frameloop="demand"
      Orb/                     # ported orb (OrbParticles light-recolor) + OrbStage
      scenes/{WebsitesScene,AiScene,CyberScene}.tsx
      sentinel/{FirewallSentinel,Honeypot}.tsx   # drei useGLTF
      battle/CodeBattle.tsx                       # blue-vs-red shader
    journey/{ScrollJourney,Section,ProgressRail}.tsx
    sections/{Hero,Websites,Ai,Cyber,About,Contact,SchoolStrip}.tsx
    case/{CaseOverlay,CaseTrailer,CaseGallery,CodeSnippet,CaseMeta}.tsx
    ui/{Glass,LangToggle,Nav,ContactForm,RegionMap,FoliageAmbient}.tsx
  data/{projects,school,about,sections}.ts        # language-neutral facts only
  i18n/{types,nl,en,useT}.ts                       # typed dictionaries + hook + locale store
  lib/{scroll/*, store/*, motion, seo}.ts          # lenis singleton, gsap register, journey/case stores
  test/{unit, e2e}/
public/
  models/{firewall-sentinel,honeypot,showcase-display}.glb
  trailers/*.{mp4,webm}     about/jasper.{webp,avif}     cv/cv.pdf
```

`?case=<slug>` keeps deep content linkable while the scroll stays one DOM (3.3 / 4.4 / 2.2.4).

### 6.2 Horizontal scroll engine

A single Zustand `journeyStore` holds `progress 0..1`, derived `chapter`/`chapterProgress`, `velocity`, and `orbState`. Lenis drives it; GSAP + R3F read via `.getState()` inside `useFrame` (no per-frame React re-renders — the pattern `CyberGrid` already uses).

```ts
// SmoothScroll.tsx (client, mounted once)
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
lenis.on('scroll', ({ scroll, limit, velocity }) => {
  journeyStore.getState().setScroll(limit ? scroll/limit : 0, velocity)
  ScrollTrigger.update(); WorldCanvas.invalidate()   // frameloop="demand"
})
gsap.ticker.add((t) => lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0)
```

```ts
// useHorizontalScroll.ts — desktop only, matchMedia-gated
gsap.matchMedia().add('(min-width:900px) and (prefers-reduced-motion: no-preference)', () => {
  const dist = track.scrollWidth - innerWidth
  gsap.to(track, { x: -dist, ease: 'none',
    scrollTrigger: { trigger: pin, start: 'top top', end: `+=${dist}`, scrub: true, pin: true, invalidateOnRefresh: true } })
})
```

- **< 900px / reduced-motion:** the branch never runs → vertical CSS flow, same components (2.2.6). Reduced-motion also downgrades Lenis to native and pins the orb to one frame.
- **Nav** maps section ids → horizontal offsets → `lenis.scrollTo`. Contact = last offset.

### 6.3 i18n (instant text-swap, type-enforced)

Copy never lives in components — they call `useT()` with a typed key. A single `Dictionary` type is the contract; `en.ts` must satisfy the exact shape `nl.ts` does, so a missing key is a **compile error**.

```ts
export type Dictionary = {
  nav: { home; websites; ai; cyber; about; contact: string };
  hero: { name; role; identity; cta: string };
  sections: Record<'websites'|'ai'|'cyber', { title; lead: string }>;
  projects: Record<ProjectSlug, { tagline; role; description: string; highlights: string[] }>;
  about: { bio; whyCraft; future; cvLabel: string; softSkills; hardSkills: string[] };
  contact: { heading; email; region; formName; formMsg; send: string };
  ui: { openCase; close; solo; team; school; refsOnRequest: string };
};
```

```ts
export const useLocale = create<{locale:'nl'|'en'; set:(l)=>void}>()((set)=>({
  locale: 'nl',
  set: (locale) => { localStorage.setItem('lang', locale); set({ locale }) },
}))
export function useT(){ return dicts[useLocale(s=>s.locale)] }
```

`<LangToggle>` flips the store → every consumer re-renders with the other dictionary in one tick. `<LangSync>` reads `localStorage.lang` on mount and sets `document.documentElement.lang`. **Guarantees** (the rubric's hardest line, 2.2.2): type-parity at compile time + a Vitest deep-key-parity test + a Playwright test asserting no NL-sentinel string survives an EN toggle.

### 6.4 Data model

Language-neutral facts in `data/`; prose by slug in the dictionaries. Zod validates at module load + in tests.

```ts
export const PROJECT_SLUGS = ['hyphosting','jarvis','homelab','social-elephant','louisa-gemstones'] as const
export const Project = z.object({
  slug: z.enum(PROJECT_SLUGS),
  important: z.boolean(),                       // 4.3 star
  scene: z.enum(['websites','ai','cyber']),
  dates: z.object({ start: z.string(), end: z.string() }),     // 4.1 dates ("2025-now", NO em dash)
  hero: z.object({ type: z.enum(['image','video']), src: z.string() }),
  trailer: z.object({ mp4: z.string(), webm: z.string(), poster: z.string() }).optional(),  // 4.6
  gallery: z.array(z.object({ type: z.enum(['image','video']), src: z.string(), altKey: z.string() })),
  tech: z.array(z.string()),
  links: z.object({ live: z.string().url().optional(), repo: z.string().url().optional() }),
  snippets: z.array(z.object({ lang: z.string(), file: z.string(), code: z.string(), captionKey: z.string() })),
  collab: z.enum(['solo','team']),              // 4.1 solo/team flag
  accent: z.enum(['leaf','cyber','honey']),     // reserved token, not raw hex
})
```

Seed from the current `projects.ts`: HypHosting/Louisa → `websites`/`leaf`; Jarvis → `ai`/`honey`; Social Elephant → `ai`/`leaf`; Homelab → `cyber`/`cyber`. `data/school.ts` holds the strip (zelda-alttp-pygame solo/school, utrecht-festival-pwa team, happy-herbivore-kiosk team) with role keys. `data/about.ts` holds `cvPdf`, `photo`, `recommendations[]` (may be empty → on-request state), `professionalLinks[]` (allowlisted, no socials), `softSkills`/`hardSkills` keys.

> **Privacy scrub (2.5), enforced during content build:** no real IPs (93.115.18.174, 167.233.42.144, 192.168.x, Tailscale hostnames), SSH users, ports, admin tokens, DB creds in any screenshot or snippet; no birth year/age anywhere. Fix the existing `year: "2025—now"` em dash.

---

## 7. Case-study overlay

`caseStore` (`activeSlug | null`) synced to `?case=<slug>` via `history.pushState`/`useSearchParams` (no route change). Open = pushState; close = `back()`; deep-link `?case=jarvis` opens on load. GSAP **Flip** from the section card to a full-bleed `.glass` sheet; `lenis.stop()` while open, `Esc`/close restores. Content = the full per-project rubric table: `CaseTrailer` (muted autoplay-on-open) · `CaseGallery` · description + highlights (dictionary) · `CodeSnippet` (sanitized, syntax-highlighted, "view on GitHub" → `jappie-p`) · `CaseMeta` (dates, solo/team badge, role). Focus-trapped, `aria-modal`, returns focus on close.

---

## 8. Testing

**Vitest (jsdom):** `dict-parity` (nl/en deep-key equality — **fails build** on mismatch → 2.2.2); `projects.schema` / `school.schema` (every featured project has hero, dates, collab, ≥1 snippet, prose in both languages → 4.1 table complete); `tokens` (accent enums only; cyan⊂cyber, honey⊂orb/honeypot); `journey-math`; `useT` (toggle swaps strings).

**Playwright (chromium + firefox + webkit + mobile viewport → 2.2.6):** `lang` (NL→EN toggle, persistence, `<html lang>`); `silence` (no audio/unmuted-autoplay on arrival → 2.2.7); `nav` (every section ≤ one jump, Contact at end → 2.2.4); `case` (overlay shows trailer/snippet/dates/badge/role, `Esc` closes, `?case=` deep-links); **`scorecard.spec`** — a data-driven `SCORECARD` map (line → DOM assertion): name+role visible (3.1), projects reachable (3.3), CV pdf resolves 200 (2.2.5), form+email+region map present, GitHub link present + no `instagram/tiktok/facebook` host (2.2.8), no PII mailto beyond the public alias (2.5). This spec is the auditable rubric→DOM map.

---

## 9. Implementation roadmap (phased)

Each phase ends green (build + lint + relevant tests) before the next.

1. **Foundation** — branch, strip dark theme, write light tokens + `Glass`, fonts, `SmoothScroll` + `journeyStore`, horizontal-scroll rig + mobile/reduced-motion fallback, empty ordered sections, `Nav` + `ProgressRail`, i18n store + `Dictionary` type + skeleton `nl`/`en` + parity test.
2. **Hero + orb port** — port `OrbParticles` (store swap, amber retint, frosted disc), `OrbStage` single canvas, hero DOM (name/role/AI line), nav chips. Mobile reduced-particle path.
3. **Websites zone** — `DeviceFrame`, `DragRail` (a11y slider), `ShowcaseFrame`, ghosted `WebsitePanesLight` backdrop, Visit/Read affordances, secondary strip, swipe fallback.
4. **AI zone** — `OrbFlowGraph` (relabel + light recolor), `<Html>` labels, Jarvis + SE cards, 2D mobile graph fallback.
5. **Cyber zone** — glass viewport + dark interior, port radar/dome/blips (teal), `CodeBattle` shader, Sentinel/Honeypot GLB loaders + catch animation, Canary feed + panel-security card, poster/MP4 mobile fallback.
6. **Case overlay + data** — `CaseOverlay` (Flip, `?case=`), full project/school/about Zod data + both dictionaries, code snippets (sanitized).
7. **About + Contact** — bento About, SkillsBoard, CredentialsRow (CV/links/refs-on-request), ContactForm (Zod + Formspree/bridge), `RegionGlobe` SVG, footer.
8. **Content, polish, a11y, perf** — real copy (NL+EN human pass), sanitized screenshots, trailers, foliage ambient, reduced-motion sweep, Lighthouse, cross-browser pass.
9. **Deploy** — own subdomain on the panel VPS (own Linux user under systemd, per VPS-isolation pattern); push-then-pull.

**Content Jasper supplies (long-lead — start now):** the two GLBs (Firewall Sentinel, Honeypot — image→3D prompts already provided); a professional headshot; a privacy-scrubbed CV PDF; ≥1 recommendation (SE/teacher); muted trailer videos (HypHosting, Jarvis, 3D scenes, Zelda game); sanitized screenshots (HypHosting panel, Louisa); a hosted/web playable of the Zelda Pygame game; confirmation of which school projects were team + roles; the professional email alias + (optional) Formspree id; real LinkedIn URL.

---

## 10. Scorecard coverage (Validatie formulier GLU)

Status: **C** = covered by design · **A** = needs a specific build/content action · **R** = risk / depends on Jasper-supplied content.

### Portfolio site (2.x)
| Line | Where | St |
|---|---|---|
| 2.2.1 no spelling/grammar errors | centralized `nl`/`en` dicts → single proof pass each | A |
| 2.2.2 one language (not mixed) | type-parity + parity test + lang e2e | A (highest-effort correctness item) |
| 2.2.3 neat/tidy | frosted-glass system, consistent scale | C |
| 2.2.4 few clicks | single scroll + nav jump + overlays | C |
| 2.2.5 pdf/online only | CV pdf, online media, Zelda as web playable (not zip) | A |
| 2.2.6 browsers + mobile | matchMedia vertical fallback, `@supports` glass fallback, WebGL feature-detect + poster fallback, multi-browser Playwright | R (R3F/GSAP is the fragility zone) |
| 2.2.7 no sound on arrival | no audio anywhere; orb voice-wave is visual; trailers muted | C |
| 2.2.8 professional media (not social) | GitHub + live deployments + LinkedIn; allowlist + e2e host check | A |
| 2.4 up-to-date | light frosted R3F/Next 16 aesthetic | C |
| 2.5 no privacy-sensitive info | public-only data model; scrub IPs/creds/birth-year; region (not home) map | R (authenticity vs privacy tension) |

### Home (3.x)
3.1 name+function (Hero DOM text) **C** · 3.2 clear structure (ordered journey + rail) **C** · 3.3 access to projects (nav + cards + overlays) **C** · attractive (orb + glass) **C**.

### Project (4.x)
4.1 per-project table (overlay, see below) **A** · 4.2 school projects (strip) **C** · 4.2 own projects (featured 5) **C** · 4.3 important (`important` star on HypHosting + Jarvis) **A** · 4.4 organized access (scene grouping) **C** · 4.5 collaboration (SE + team school projects + soft skills) **R** · 4.6 trailer videos **R (none exist yet)** · 4.7 neat code (sanitized snippets + the portfolio's own codebase) **C**.

### Per-project detail table (each featured)
title **C** · draw-in image/video **A** (need sanitized shots; Homelab/SE use the 3D scenes) · short powerful video **R** (none yet) · short description **A** (rewrite + translate) · highlights **A** (new field, 3–4 each ×2 langs) · code snippets **A** (sanitized) · dates **C** (fix em dash) · downloadable/try **R** (Zelda web playable + live URLs as "try online") · solo flag **A** · team flag **R** (only SE among featured; school strip carries real team work) · role explained **A** (thin now; explain other roles for team projects).

### About (5)
nice photo **R** (supply) · short description **A** · CV link **R** (produce pdf) · professional media **C** · recommendations **R** (none yet → on-request fallback) · why-craft **A** · future/learning **A** · soft skills **A** · hard skills **C** (derive from `tech[]`).

### Contact (6)
email **A** (pro alias) · online form **A** (endpoint + bilingual labels + spam) · region + global map **R** (privacy: region not home; lightweight SVG, mobile-safe).

### Top risks / open items for Jasper
1. **One-language integrity (2.2.2)** — biggest correctness risk; type + tests enforce it, but all copy must exist in both dicts.
2. **Recommendations** — none held; obtain ≥1 (SE/teacher) or lose the point.
3. **CV PDF + headshot** — neither exists; privacy-scrubbed.
4. **Trailer videos (4.6)** — none exist; record muted screen-captures.
5. **Downloadable/try** — host the Zelda Pygame game as a web playable; live URLs count as try-online.
6. **Collaboration/team (4.5)** — featured 5 are solo-heavy; surface SE + named team roles from school projects.
7. **Privacy vs authenticity (2.5)** — scrub all infra detail + birth year from screenshots/snippets.
8. **Cross-browser/mobile WebGL (2.2.6)** — mobile particle reduction + feature-detect + poster fallback; verify the retinted orb reads on off-white.
9. **AI-reading copy** — human rewrite in both languages (no em/en dashes; remove `2025—now` em dash).
10. **Email + map endpoints** — pro alias chosen; lightweight key-free region map.

---

## 11. Salvage map (files referenced)

- **Port + relight:** `jarvis/web/src/components/orb/{OrbParticles,OrbContainer}.tsx` (orb), `portfolio-v2/src/components/world/{CyberGrid,WebsitePanes,AutomationGraph}.tsx` (cyber radar/dome/blips, web backdrop, flow graph).
- **Pattern reuse:** `portfolio-v2/src/lib/store.ts` + `journey-math.ts` (journey store), SDF helpers in `WebsitePanes.tsx` (`scanline`/`circle`/`rectFill`).
- **Replace:** `portfolio-v2/src/app/globals.css` (dark→light tokens), `public/globe.svg` (→ true world silhouette).
- **Seed content:** `portfolio-v2/src/data/projects.ts` (slugs, years, tech, accents — move prose to dictionaries, fix em dash, replace raw-hex accents with the token enum).
- **Read before building:** `node_modules/next/dist/docs/` (Next 16 breaking changes, per `AGENTS.md`).
