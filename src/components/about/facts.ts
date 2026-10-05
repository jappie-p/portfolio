import { ARCHIVE, PROJECTS, SCHOOL_EXTRA } from "@/data/projects";
import { SITE } from "@/data/site";

/** The sites of mine that are live: the projects with a live address, the
 *  smaller builds that are websites (not just code on GitHub), and this one. */
export const LIVE_SITES = [
  ...Object.values(PROJECTS).flatMap((p) => (p.live ? [p.live] : [])),
  ...ARCHIVE.flatMap((a) => (a.href && !/github\.com/.test(a.href) ? [a.href] : [])),
  SITE.url,
];

/** The player card's counted facts, from the data on this site. */
export const FACTS = {
  /** sites anyone can visit right now */
  live: LIVE_SITES.length,
  /** everything on this site I built: the projects, the Berlijn app and the smaller builds */
  built: Object.keys(PROJECTS).length + (SCHOOL_EXTRA ? 1 : 0) + ARCHIVE.length,
  /** companies of my own */
  company: Object.values(PROJECTS).filter((p) => p.kind === "company").length,
} as const;
