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

/** The highest level a skill shows: past this many projects it is maxed out. */
export const MAX_LEVEL = 5;

export type SkillNode = { name: string; uses: Use[]; level: number };

/** Every hard skill as a node in its branch, its level the number of
 *  projects on the page that list it: counted from the data, never typed in. */
export const SKILL_TREE: Array<{ id: SkillGroupId; nodes: SkillNode[] }> = SKILLS.map((g) => ({
  id: g.id,
  nodes: g.items.map((name) => {
    const uses = usesOf(name);
    return { name, uses, level: Math.min(uses.length, MAX_LEVEL) };
  }),
}));
