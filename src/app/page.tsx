import { Nav } from "@/components/ui/Nav";
import { SkipLink } from "@/components/ui/SkipLink";
import { ProgressRail } from "@/components/journey/ProgressRail";
import { ScrollJourney } from "@/components/journey/ScrollJourney";
import { JourneyObserver } from "@/components/journey/JourneyObserver";
import { RevealObserver } from "@/components/journey/RevealObserver";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Websites } from "@/components/sections/Websites";
import { Ai } from "@/components/sections/Ai";
import { CyberSection } from "@/components/cyber/CyberSection";
import { School } from "@/components/sections/School";
import { Contact } from "@/components/sections/Contact";
import { CaseOverlay } from "@/components/work/CaseOverlay";
import { highlightedSnippets } from "@/lib/highlight";
import { LangSync } from "@/i18n/useT";
import { SITE, BASE_PATH } from "@/data/site";
import { SKILLS } from "@/data/skills";

// Who this site is about, for search engines (schema.org Person).
const PERSON = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE.name,
  url: `${SITE.url}${BASE_PATH}/`,
  jobTitle: "Developer",
  sameAs: [SITE.github, SITE.linkedin].filter(Boolean),
  worksFor: { "@type": "Organization", name: "Go to Guy" },
  affiliation: { "@type": "EducationalOrganization", name: "Grafisch Lyceum Utrecht" },
  address: { "@type": "PostalAddress", addressLocality: "Utrecht", addressCountry: "NL" },
  knowsAbout: SKILLS.flatMap((g) => g.items),
};

export default function Home() {
  return (
    <>
      {/* static JSON built from our own data above, never from input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PERSON).replace(/</g, "\\u003c") }} />
      {/* the reader's language lives in the browser; the CV routes set their own */}
      <LangSync />
      <SkipLink />
      <Nav />
      <ScrollJourney>
        <Hero />
        <About />
        <Websites />
        <Ai />
        <CyberSection />
        <School />
        <Contact />
      </ScrollJourney>
      <JourneyObserver />
      <RevealObserver />
      <ProgressRail />
      <CaseOverlay snippets={highlightedSnippets()} />
    </>
  );
}
