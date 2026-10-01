import { ARCHIVE, PROJECTS, type ArchiveId } from "@/data/projects";
import { SKILLS, type SkillGroupId } from "@/data/skills";
import type { ProjectSlug } from "@/lib/chapters";

/** Where a skill shows up: one of the projects, or one of the smaller builds. */
export type Use = { kind: "project"; slug: ProjectSlug } | { kind: "archive"; id: ArchiveId };

/** Other names the project stacks use for a skill: a spelling (WebSocket), the
 *  library it comes with (Socket.IO runs on WebSockets, React Three Fiber is
 *  Three.js), the fork (MariaDB is MySQL), or its two halves (HTML, CSS). */
const ALIASES: Record<string, readonly string[]> = {
  WebSockets: ["WebSocket", "Socket.IO"],
  MySQL: ["MariaDB"],
  "HTML & CSS": ["HTML", "CSS"],
  "Three.js": ["React Three Fiber"],
};

/** "Node.js", "nodejs" and "NodeJS" are one name; "React" and "React Three Fiber" are not. */
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The projects, then the smaller builds, whose stack lists `skill`, in page order. */
export function usesOf(skill: string): Use[] {
  const names = new Set([skill, ...(ALIASES[skill] ?? [])].map(key));
  const listed = (tech: string[]) => tech.some((t) => names.has(key(t)));
  return [
    ...Object.values(PROJECTS)
      .filter((p) => listed(p.tech))
      .map((p): Use => ({ kind: "project", slug: p.slug })),
    ...ARCHIVE.filter((a) => listed(a.tech)).map((a): Use => ({ kind: "archive", id: a.id })),
  ];
}

export type SkillStar = { name: string; group: SkillGroupId; uses: Use[] };

/** Every hard skill as a star, grouped as in SKILLS. */
export const SKILL_STARS: Record<SkillGroupId, SkillStar[]> = Object.fromEntries(
  SKILLS.map((g) => [g.id, g.items.map((name) => ({ name, group: g.id, uses: usesOf(name) }))]),
) as Record<SkillGroupId, SkillStar[]>;

const MOST = Math.max(...Object.values(SKILL_STARS).flatMap((g) => g.map((s) => s.uses.length)));

/** How bright a star is, 0..1: its share of the most-used skill's projects, as area. */
export const starLight = (uses: number, most = MOST) => Math.sqrt(uses / Math.max(1, most));

/** A star's radius in px. Its area grows with the number of projects that use
 *  the skill, so the smallest star is one no project on the page lists. */
export const starRadius = (uses: number, most = MOST) => 1.5 + 3.6 * starLight(uses, most);
