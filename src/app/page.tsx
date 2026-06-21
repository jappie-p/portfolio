import { Nav } from "@/components/ui/Nav";
import { ProgressRail } from "@/components/journey/ProgressRail";
import { ScrollJourney } from "@/components/journey/ScrollJourney";
import { JourneyObserver } from "@/components/journey/JourneyObserver";
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
        <SubjectTopic id="websites" />
        <SubjectTopic id="ai" />
        <SubjectTopic id="cyber" />
        <About />
        <Contact />
      </ScrollJourney>
      <JourneyObserver />
      <ProgressRail />
    </>
  );
}
