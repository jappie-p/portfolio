# Plan: Portfolio "EMBER"

**Datum:** 12 juni 2026

## Het concept

Een portfolio als doorlopende scroll-ervaring: een donkere, warme 3D wereld waar de camera doorheen beweegt terwijl mijn verhaal zich afspeelt. Van de droom om game artist te worden, via de overstap naar code, naar de projecten die nu echt draaien. Grote cinematische typografie, filmkorrel en een enkel amber accent.

Vijf uitgelichte projecten krijgen een eigen case study pagina: HypHosting (platform, paneel en iOS app), Jarvis (AI-assistent), Homelab, Social Elephant (stagewerk, zonder bedrijfsgevoelige details) en Louisa Gemstones (klantwerk).

## Documenten

- **USP**: `docs/USP.md`
- **Inspiratie onderzoek**: `docs/inspiratie-onderzoek.md`
- **Schetsen**: `docs/schetsen/` (open de HTML bestanden in een browser)
- **Volledige technische spec** (Engels): `docs/superpowers/specs/2026-06-12-portfolio-ember-design.md`

## Fases

1. **Fundament** (vandaag): repo, boilerplate (Next.js 16, TypeScript, Tailwind 4), fonts, basisstructuur.
2. **World engine**: 3D canvas, camera op rails, scroll-koppeling, grain en deeltjes.
3. **De reis**: preloader en de zes hoofdstukken van de homepage.
4. **Case studies**: de vijf projectpagina's met overgangen vanuit de wereld.
5. **Content en media**: teksten, screenshots, geanonimiseerd Social Elephant materiaal.
6. **Performance en toegankelijkheid**: mobiele versie, reduced motion, Lighthouse.
7. **Live zetten**: deploy op eigen server met eigen subdomein.

## Techniek (samenvatting)

Next.js 16, TypeScript, Tailwind 4, GSAP (ScrollTrigger, SplitText, Flip), Lenis smooth scroll, React Three Fiber met drei en postprocessing, zustand. Volledige onderbouwing staat in de spec.
