import type { Viewport } from "next";
import { Welcome } from "@/components/welcome/Welcome";
import { TOPICS } from "@/lib/chapters";
import { BASE_PATH } from "@/data/site";

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

/** Links into the experience from before it had its own address (/#school,
 *  /?case=zelda) go straight on there, before anything paints. */
const FORWARD = `(function(){var h=location.hash.slice(1);if(${JSON.stringify(TOPICS.map((t) => t.id))}.indexOf(h)>=0||/[?&]case=/.test(location.search))location.replace(${JSON.stringify(`${BASE_PATH}/experience`)}+location.search+location.hash)})()`;

/** The front door: how would you like to look around. */
export default function Home() {
  return (
    <>
      {/* a fixed string built from our own topic ids, never from input */}
      <script dangerouslySetInnerHTML={{ __html: FORWARD }} />
      <Welcome />
    </>
  );
}
