import type { Metadata } from "next";
import V2Canvas from "@/components/v2/V2Canvas";
import V2Hero from "@/components/v2/V2Hero";
import V2Manifesto from "@/components/v2/V2Manifesto";
import V2Story from "@/components/v2/V2Story";
import V2Work from "@/components/v2/V2Work";
import V2Craft from "@/components/v2/V2Craft";
import V2Contact from "@/components/v2/V2Contact";
import V2Progress from "@/components/v2/V2Progress";
import VersionToggle from "@/components/v2/VersionToggle";
import Preloader from "@/components/ui/Preloader";

export const metadata: Metadata = {
  title: "Jasper Pathuis · Developer (v2)",
};

// v2: the fully scrub-choreographed cut. v1 (world walkthrough) stays at /.
export default function V2Page() {
  return (
    <>
      <V2Canvas />
      <Preloader />
      <V2Progress />
      <VersionToggle />
      <main className="relative">
        <V2Hero />
        <V2Manifesto />
        <V2Story />
        <V2Work />
        <V2Craft />
        <V2Contact />
      </main>
    </>
  );
}
