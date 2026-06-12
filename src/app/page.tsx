import Journey from "@/components/journey/Journey";
import WorldRoot from "@/components/world/WorldRoot";
import Preloader from "@/components/ui/Preloader";
import ProgressHUD from "@/components/ui/ProgressHUD";

export default function Home() {
  return (
    <>
      <WorldRoot />
      <Preloader />
      <Journey />
      <ProgressHUD />
    </>
  );
}
