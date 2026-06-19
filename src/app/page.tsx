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
          <Hero />
          <Websites />
          <Ai />
          <Cyber />
          <About />
          <Contact />
        </ScrollJourney>
      </main>
      <ProgressRail />
    </>
  );
}
