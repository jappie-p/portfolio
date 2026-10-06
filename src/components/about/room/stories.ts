import type { Kind, StoryId } from "./types";

/** The stories in the order their pins are numbered, and what each is about. */
export const STORIES: { id: StoryId; kind: Kind }[] = [
  { id: "werk", kind: "bouwen" },
  { id: "homelab", kind: "bouwen" },
  { id: "windsurfen", kind: "buiten" },
  { id: "mountainbiken", kind: "buiten" },
  { id: "wielrennen", kind: "buiten" },
  { id: "motorrijden", kind: "buiten" },
  { id: "groei", kind: "groei" },
];

export const kindOf = (id: StoryId) => STORIES.find((s) => s.id === id)?.kind ?? "bouwen";
export const numberOf = (id: StoryId) => STORIES.findIndex((s) => s.id === id) + 1;
