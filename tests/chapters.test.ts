import { describe, it, expect } from "vitest";
import { TOPICS, PROJECT_NAMES, TOPIC_INDEX, topicPanelCount } from "@/lib/chapters";

describe("topics grid model", () => {
  it("lists seven topics in journey order", () => {
    expect(TOPICS.map((t) => t.id)).toEqual(["hero", "about", "websites", "ai", "cyber", "school", "contact"]);
  });

  it("subject topics carry projects, others do not", () => {
    expect(TOPICS.find((t) => t.id === "websites")!.projects).toEqual(["hyphosting", "louisa"]);
    expect(TOPICS.find((t) => t.id === "hero")!.projects).toEqual([]);
  });

  it("panel count is cover + projects for subjects, About's own panels, 1 for the rest", () => {
    expect(topicPanelCount("websites")).toBe(3); // cover + 2 projects
    expect(topicPanelCount("ai")).toBe(3);
    expect(topicPanelCount("cyber")).toBe(2); // cover + 1 project
    expect(topicPanelCount("school")).toBe(4); // cover + 3 projects
    expect(topicPanelCount("hero")).toBe(1);
    expect(topicPanelCount("about")).toBe(4); // player card, skills, quests, side quests
    expect(topicPanelCount("contact")).toBe(1);
  });

  it("indexes topics and names every project", () => {
    expect(TOPIC_INDEX.cyber).toBe(4);
    for (const t of TOPICS) for (const p of t.projects) expect(PROJECT_NAMES[p]).toBeTruthy();
  });
});
