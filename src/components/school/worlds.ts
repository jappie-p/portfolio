import zelda from "@/assets/worlds/zelda.webp";
import kiosk from "@/assets/worlds/kiosk.webp";
import festival from "@/assets/worlds/festival.webp";

/** Each school project's world as its own panel shows it (the art with the
 *  project's screens, no copy), and where its subject sits across the
 *  picture's width, so a poster can frame just that slice. */
export const SCHOOL_WORLDS = {
  zelda: { image: zelda, focus: 0.313 },
  kiosk: { image: kiosk, focus: 0.336 },
  festival: { image: festival, focus: 0.289 },
} as const;
