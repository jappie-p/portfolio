import Journey from "@/components/journey/Journey";
import WorldRoot from "@/components/world/WorldRoot";
import Preloader from "@/components/ui/Preloader";
import ProgressHUD from "@/components/ui/ProgressHUD";
import VersionToggle from "@/components/v2/VersionToggle";

export default function Home() {
  return (
    <>
      <WorldRoot />
      <Preloader />
      <Journey />
      <ProgressHUD />
      <VersionToggle />
    </>
  );
}
