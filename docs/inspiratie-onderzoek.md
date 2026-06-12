# Inspiratie onderzoek

**Datum:** 12 juni 2026
**Doel:** bepalen hoe het portfolio eruit moet zien en welke technieken award-winnende sites gebruiken.

## Hoofdreferentie: igloo.inc

De belangrijkste inspiratiebron. Gebouwd door studio Abeto, won Awwwards Site of the Day (score 7.92, animatie subscore 9.6 van 10) en was genomineerd voor Site of the Year 2024.

Wat de site bijzonder maakt:

- De hele ervaring is een doorlopende, scroll-gestuurde reis door een bevroren 3D wereld. De camera beweegt op rails tussen drie scenes.
- Projecten zitten in procedureel gegenereerde ijsblokken: elk blok is uniek.
- Overgangen tussen scenes gebruiken shader-effecten (vervorming, chromatische aberratie, frost dissolve) in plaats van harde overgangen.
- De footer heeft een interactieve deeltjessimulatie die van vorm verandert onder je cursor.

Wat ik overneem: de doorlopende scroll-reis, de camera op rails, shader-overgangen en de deeltjes-footer.
Wat ik bewust niet overneem: igloo.inc rendert alles (ook alle tekst) in WebGL. Dat is maandenwerk voor een specialistische studio en slecht voor vindbaarheid en toegankelijkheid. Mijn site houdt tekst als echte HTML bovenop de 3D wereld.

## Stijlonderzoek: styles.refero.design

Refero Styles is een verzameling van ruim 2000 design systemen van bestaande sites. Bekeken stijlen die aansluiten bij mijn richting:

- **monopo saigon** ("cinematic darkroom") en **Sequel** ("blackbox gallery"): donker, filmisch, grote typografie.
- **Hyperstudio** ("designer's midnight gallery"): donkere studio-portfolio opbouw met een warm accent.
- **Linear** en **Raycast**: strakke donkere developer-stijl, een enkele accentkleur.

Hieruit komt de stijlkeuze: cinematisch en redactioneel (grote typografie, filmkorrel) in plaats van een standaard developer-look.

## Techniekonderzoek: award-winnende portfolios

Onderzochte voorbeelden (vooral via Codrops case studies): Stas Bondar, Stefan Vitasovic, Roman Jean-Elie, Joseph Santamaria, Martin Laxenaire, Joffrey Spitzer en Dennis Snellenberg.

Terugkerende technieken:

- **Lenis smooth scroll** gekoppeld aan **GSAP ScrollTrigger** als basis van de hele ervaring.
- **SplitText** reveals: titels en tekstregels die regel voor regel of letter voor letter binnenkomen.
- **Preloader met teller** (0 tot 100) die echt assets laadt en daarna overvloeit in de hero.
- **Scroll-snelheid gekoppeld aan shaders**: hoe sneller je scrollt, hoe sterker beelden vervormen.
- **Camera op rails**: de camera in de 3D wereld volgt je scrollpositie.

Belangrijke valkuilen uit het onderzoek:

- Mobiel gaat vaak kapot op dit soort sites. De oplossing van de beste sites: op mobiel een versimpelde wereld tonen (minder deeltjes, geen zware effecten).
- Toegankelijkheid telt mee bij jurering: animaties moeten uit kunnen via prefers-reduced-motion.
- Tekst als HTML houden in plaats van in WebGL, anders is de site onvindbaar voor zoekmachines.

## Verkende richtingen (schetsen)

Vier richtingen uitgewerkt als visuele schetsen (zie `docs/schetsen/`):

| Richting | Idee | Besluit |
|---|---|---|
| A. Command Deck | De site gedraagt zich als een besturingssysteem (terminal, groen) | Afgevallen: voelt te standaard |
| B. The World | Doorlopende 3D wereld zoals igloo.inc | **Gekozen** als structuur |
| C. Press Start | Site begint als 8-bit game en wordt steeds moderner | Afgevallen, idee bewaard |
| D. Darkroom | Cinematisch redactioneel: grote typografie, filmkorrel | **Gekozen** als stijl |

Eindkeuze: de wereld van B met de stijl van D, in het palet **Void & Ember**: warm zwart (#070605), steen (#292524), amber accent (#d97706) en gebroken wit (#f5f0ea).

## Bronnen

- https://www.awwwards.com/sites/igloo-inc en https://www.awwwards.com/igloo-inc-case-study.html
- https://thefwa.com/cases/igloo-inc
- https://styles.refero.design
- https://tympanus.net/codrops (case studies: Stas Bondar, Stefan Vitasovic, Roman Jean-Elie, Joseph Santamaria, Martin Laxenaire, Joffrey Spitzer)
- https://gsap.com (ScrollTrigger, SplitText) en https://github.com/darkroomengineering/lenis
- https://docs.pmnd.rs (React Three Fiber)
