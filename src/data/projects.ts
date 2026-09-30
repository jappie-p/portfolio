import type { StaticImageData } from "next/image";
import type { ProjectSlug } from "@/lib/chapters";
import hyphostingDesktop from "@/assets/work/hyphosting-desktop.webp";
import hyphostingMobile from "@/assets/work/hyphosting-mobile.webp";
import louisaDesktop from "@/assets/work/louisa-desktop.webp";
import louisaMobile from "@/assets/work/louisa-mobile.webp";
import kioskStart from "@/assets/work/kiosk-start.webp";
import kioskMenu from "@/assets/work/kiosk-menu.webp";
import festivalHome from "@/assets/work/festival-home.webp";
import festivalSchedule from "@/assets/work/festival-schedule.webp";
import festivalMap from "@/assets/work/festival-map.webp";

/** What kind of work it was; the label lives in the dictionaries. */
export type ProjectKind = "company" | "work" | "client" | "personal" | "school";

/** Years, so the copy can say "2026 tot nu" or "2026 to now". */
export type Period = { from: number; to?: number | "now" };

/** Architecture diagrams for work without a public screen to show. */
export type DiagramId = "jarvis" | "go-to-guy" | "homelab";

/** Language-neutral facts; all copy lives in the dictionaries, keyed by slug. */
export type Project = {
  slug: ProjectSlug;
  kind: ProjectKind;
  /** built with a team (otherwise solo) */
  team: boolean;
  /** the work I'd point to first */
  featured?: boolean;
  period: Period;
  tech: string[];
  live?: string;
  code?: string;
  /** playable in the browser, a path under public/ */
  play?: string;
  /** live screenshots of the site (captured 2026-09-28) */
  shots?: { desktop: StaticImageData; mobile: StaticImageData };
  /** portrait screens of an app or kiosk (captured 2026-09-28) */
  screens?: StaticImageData[];
  /** muted loop in public/trailers/<name>.{mp4,webm,jpg} */
  trailer?: string;
  diagram?: DiagramId;
};

export const PROJECTS: Record<ProjectSlug, Project> = {
  hyphosting: {
    slug: "hyphosting",
    kind: "company",
    team: false,
    featured: true,
    period: { from: 2026, to: "now" },
    tech: ["Node.js", "Express", "MySQL", "Docker", "Mollie", "WebSocket", "SwiftUI"],
    live: "https://hyphosting.com",
    shots: { desktop: hyphostingDesktop, mobile: hyphostingMobile },
    trailer: "hyphosting",
  },
  louisa: {
    slug: "louisa",
    kind: "client",
    team: false,
    period: { from: 2026 },
    tech: ["Node.js", "Express", "MySQL", "Stripe", "Raspberry Pi"],
    live: "https://louisagemstones.nl",
    shots: { desktop: louisaDesktop, mobile: louisaMobile },
    trailer: "louisa",
  },
  jarvis: {
    slug: "jarvis",
    kind: "personal",
    team: false,
    period: { from: 2026 },
    tech: ["Claude API", "Node.js", "Express", "SwiftUI", "MariaDB", "React"],
    diagram: "jarvis",
  },
  "go-to-guy": {
    slug: "go-to-guy",
    kind: "work",
    team: true,
    featured: true,
    period: { from: 2026, to: "now" },
    tech: ["TypeScript", "Node.js", "MCP", "AI agents", "REST APIs"],
    diagram: "go-to-guy",
  },
  homelab: {
    slug: "homelab",
    kind: "personal",
    team: false,
    period: { from: 2026, to: "now" },
    tech: ["Proxmox", "Docker", "Jellyfin", "WireGuard", "Tailscale", "Linux"],
    diagram: "homelab",
  },
  zelda: {
    slug: "zelda",
    kind: "school",
    team: false,
    period: { from: 2026 },
    tech: ["Python", "Pygame", "Socket.IO", "Node.js", "WebAssembly"],
    play: "/play/zelda/index.html",
    trailer: "zelda",
  },
  kiosk: {
    slug: "kiosk",
    kind: "school",
    team: true,
    period: { from: 2026 },
    tech: ["React", "Vite", "Tailwind", "Node.js", "Express", "MySQL", "WebUSB"],
    live: "https://kiosk.hyphosting.com",
    screens: [kioskStart, kioskMenu],
  },
  festival: {
    slug: "festival",
    kind: "school",
    team: false,
    period: { from: 2026 },
    tech: ["Vue 3", "TypeScript", "Vite", "PWA", "Tailwind", "Pinia"],
    live: "https://utrecht.hyphosting.com",
    screens: [festivalHome, festivalSchedule, festivalMap],
  },
};

/** Smaller things I built on the side, shown as a list; titles live in the dictionaries. */
export type ArchiveId = "portfolio" | "windsurf" | "amorphophallus";
export type ArchiveItem = { id: ArchiveId; year: number; tech: string[]; href?: string };

export const ARCHIVE: ArchiveItem[] = [
  { id: "portfolio", year: 2026, tech: ["Next.js", "React Three Fiber", "GLSL"], href: "https://github.com/jappie-p/portfolio" },
  { id: "windsurf", year: 2026, tech: ["SuuntoPlus", "JavaScript", "GPS"] },
  { id: "amorphophallus", year: 2025, tech: ["HTML", "CSS", "JavaScript"], href: "https://amorphophallus.nl" },
];

/** School work without its own panel, listed on the school cover. */
export const SCHOOL_EXTRA = { year: 2026, tech: ["SwiftUI", "Express", "MySQL"], team: false } as const;

/** "2026", "2025 tot 2026" or "2026 tot nu", in the reader's language. */
export function formatPeriod(p: Period, until: string, now: string): string {
  if (p.to === undefined || p.to === p.from) return String(p.from);
  return `${p.from} ${until} ${p.to === "now" ? now : p.to}`;
}
