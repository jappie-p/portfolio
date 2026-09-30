// The journey is a 2-D grid: vertical = topics (rows), horizontal = projects
// within a topic (columns). Hero/About/Contact are single-panel topics.

export type ProjectSlug = "hyphosting" | "louisa" | "jarvis" | "go-to-guy" | "homelab" | "zelda" | "kiosk" | "festival";

export const PROJECT_NAMES: Record<ProjectSlug, string> = {
  hyphosting: "HypHosting",
  louisa: "Louisa Edelstenen",
  jarvis: "Jarvis",
  "go-to-guy": "Go to Guy",
  homelab: "Homelab",
  zelda: "Zelda Remote Controller",
  kiosk: "Happy Herbivore Kiosk",
  festival: "❤️U Festival",
};

// Flow: hero -> about me -> my work (websites/ai/cyber) -> school -> contact.
export const TOPICS = [
  { id: "hero", projects: [] },
  { id: "about", projects: [] },
  { id: "websites", projects: ["hyphosting", "louisa"] },
  { id: "ai", projects: ["jarvis", "go-to-guy"] },
  { id: "cyber", projects: ["homelab"] },
  { id: "school", projects: ["zelda", "kiosk", "festival"] },
  { id: "contact", projects: [] },
] as const satisfies ReadonlyArray<{ id: string; projects: readonly ProjectSlug[] }>;

export type TopicId = (typeof TOPICS)[number]["id"];

export const TOPIC_INDEX: Record<TopicId, number> = Object.fromEntries(
  TOPICS.map((t, i) => [t.id, i]),
) as Record<TopicId, number>;

/** Subject topics carry a horizontal project track; hero/about/contact do not. */
export function topicPanelCount(id: TopicId): number {
  const t = TOPICS.find((x) => x.id === id);
  // a subject topic shows a cover panel + one panel per project
  return t && t.projects.length > 0 ? t.projects.length + 1 : 1;
}
