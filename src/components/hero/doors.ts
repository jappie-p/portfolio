import type { StaticImageData } from "next/image";
import type { TopicId } from "@/lib/chapters";
import about from "@/assets/worlds/about.webp";
import websites from "@/assets/worlds/websites.webp";
import ai from "@/assets/worlds/ai.webp";
import cyber from "@/assets/worlds/cyber.webp";
import school from "@/assets/worlds/school.webp";
import contact from "@/assets/worlds/contact.webp";

/** A door's width over its height: a tall arch. */
export const DOOR_ASPECT = 1 / 1.75;

export type Door = {
  id: Exclude<TopicId, "hero">;
  /** the panel the door opens onto, as that world looks there without its copy */
  panel: number;
  image: StaticImageData;
  /** where the world's subject sits across the picture's width */
  focus: number;
  /** the light the world spills on the floor */
  hue: string;
};

/** One door into every part of the site, in the order the page walks them. */
export const DOORS: readonly Door[] = [
  { id: "about", panel: 0, image: about, focus: 0.27, hue: "#c7d2fe" },
  { id: "websites", panel: 1, image: websites, focus: 0.36, hue: "#f87171" },
  { id: "ai", panel: 0, image: ai, focus: 0.67, hue: "#a78bfa" },
  { id: "cyber", panel: 0, image: cyber, focus: 0.47, hue: "#22d3ee" },
  { id: "school", panel: 0, image: school, focus: 0.5, hue: "#fbbf24" },
  { id: "contact", panel: 0, image: contact, focus: 0.9, hue: "#4ade80" },
];
