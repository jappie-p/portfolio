import { Nav } from "@/components/ui/Nav";
import { ProgressRail } from "@/components/journey/ProgressRail";
import { ScrollJourney } from "@/components/journey/ScrollJourney";
import { JourneyObserver } from "@/components/journey/JourneyObserver";
import { WorldCanvas } from "@/components/canvas/WorldCanvas";
import { FirewallScrub } from "@/components/canvas/FirewallScrub";
import { Hero } from "@/components/sections/Hero";
import { SubjectTopic } from "@/components/sections/SubjectTopic";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <ScrollJourney>
        <Hero />
        <About />
        <SubjectTopic id="websites" />
        <SubjectTopic id="ai" background={<WorldCanvas />} />
        <SubjectTopic id="cyber" background={<FirewallScrub />} />
        <Contact />
      </ScrollJourney>
      <JourneyObserver />
      <ProgressRail />
    </>
  );
}
