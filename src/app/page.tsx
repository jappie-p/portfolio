import Journey from "@/components/journey/Journey";
import WorldRoot from "@/components/world/WorldRoot";
import Preloader from "@/components/ui/Preloader";

export default function Home() {
  return (
    <>
      <WorldRoot />
      <Preloader />
      <Journey />
    </>
  );
}
