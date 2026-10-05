# Portfolio van Jasper Pathuis

Live: **https://jasper.hyphosting.com**

De voordeur is een witte pagina die vraagt hoe je wilt kijken. Kies je de ervaring, dan leert een korte uitleg je eerst de bewegingen, zoals de eerste minuut van een game. Daarna is het één pagina als reis: naar beneden scroll je door de onderdelen, opzij door de projecten. Elk onderdeel en elk project heeft een eigen wereld, helemaal in code gebouwd: geen stockbeelden, alleen screenshots van mijn eigen werk, korte trailers en mijn portret.

## Wat je ziet

| Onderdeel | De wereld | Gebouwd met |
|---|---|---|
| Start | Een veld van honingraatkolommen tot aan de horizon, dat zichzelf opbouwt van schets via wireframe tot render. | WebGL 2 met eigen shaders |
| Over mij | Een sterrenhemel die meeschuift: elke groep skills is een sterrenbeeld, en hoe groot een ster is hangt af van in hoeveel van mijn projecten die techniek echt zit. | Canvas 2D en SVG |
| Websites | Browservensters in een nevel; HypHosting tussen zwevende Minecraft-eilanden; Louisa Edelstenen tussen de stenen die ze verkoopt, van agaat tot amethist. | Canvas 2D, React Three Fiber |
| AI | Jarvis als kern in een netwerk, Go to Guy als hub waar agents het werk rondbrengen. | React Three Fiber |
| Cyber | Een firewall onder een DDoS-aanval, mijn homelab. | React Three Fiber |
| School | Een galerij bij nacht: elk project hangt als print aan zijn eigen gekleurde muur en stukjes van het werk ontsnappen uit de lijst. Klik een print en je duikt erin; vanuit een project veeg je terug de galerij in en door naar het volgende. Daarachter de Zelda-avond met de echte game speelbaar in het paneel, het restaurant met een bonnetje uit de printer en het festivalpodium. | three.js met eigen shaders, view transitions, Canvas 2D, pygbag (WebAssembly) |
| Contact | Utrecht bij nacht met de Domtoren, die als een baken oplicht zodra je een bericht stuurt. | Canvas 2D |

## Keuzes

- **Next.js 16** (App Router) met React 19, TypeScript en Tailwind CSS 4: echte routes (cv per taal, contact-API, OG-beeld, sitemap) en statisch gerenderd waar het kan.
- **Een voordeur en een uitleg.** `/` is een witte pagina met twee keuzes; de ervaring staat op `/experience`, en oude links (`/#school`, `/?case=zelda`) gaan daar direct heen. De uitleg leert drie bewegingen op een kaart van de site en wacht tot je ze echt doet. Het geluid maakt de browser zelf (Web Audio), zonder bestanden.
- **3D alleen waar het iets toevoegt.** AI, Cyber en Louisa draaien op React Three Fiber; de andere werelden zijn Canvas 2D. Dat is licht, en browsers staan maar een handvol WebGL-contexten toe.
- **Elke scène is zuinig.** Ze laadt pas als haar onderdeel in de buurt komt, tekent alleen als ze echt in beeld is, laat bij "minder beweging" één stilstaand beeld zien, en valt zonder GPU terug op een poster of de 2D-versie.
- **Contactformulier**: validatie met zod, honeypot, minimale invultijd en een limiet per IP. Elk bericht komt in een JSONL-inbox op de server en wordt gemaild als de `EMAIL_*`-variabelen gezet zijn.
- **Codevoorbeelden** worden bij het bouwen gekleurd met Shiki, dus er gaat geen highlighter mee naar de browser.
- **Nederlands en Engels**, met een test die bewaakt dat beide woordenboeken dezelfde sleutels hebben.

## Kwaliteit

- 60 fps gemeten op elk paneel, op 1440×900 (2x) en 390×844 (3x).
- WCAG 2.1 AA, getest met axe in Chromium, Firefox en WebKit; alles werkt met het toetsenbord.
- Elke regel van het validatieformulier van de GLU heeft een eigen test in `e2e/scorecard.spec.ts`.

## Structuur

```
src/
  app/            routes: de voordeur (/), de ervaring (/experience), /cv/[lang], /api/contact, OG-beeld, robots, sitemap
  components/
    sections/     één bestand per onderdeel
    journey/      rijen, zijwaartse tracks, panelen, achtergronden, de zoom
    welcome/      de voordeur en de uitleg
    hero/ school/ about/   het honingraatveld, de galerij, de sterrenhemel
    ai/ cyber/    de 3D-scènes
    art/          de wereld van elk project (zelda, kiosk, festival, websites, contact)
    work/ contact/ ui/ cv/
  data/           projecten, skills, site
  i18n/           de woordenboeken (nl, en)
  lib/            gedeelde logica
tests/            unit tests (Vitest)
e2e/              browsertests (Playwright)
public/           trailers, de Zelda-build, de cv-pdf's
```

## Lokaal draaien

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run test:e2e   # bouwt en start de productieversie, dan alle browsertests
npm run lint
npm run cv         # maakt de cv-pdf's opnieuw
```
