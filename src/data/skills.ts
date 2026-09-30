// Hard skills in groups, soft skills on their own. Group and soft-skill ids map
// to copy in the dictionaries; the hard-skill items are proper nouns and read
// the same in both languages.
export type SkillGroupId = "frontend" | "motion" | "backend" | "infra" | "ai" | "tools";

export const SKILLS: Array<{ id: SkillGroupId; items: string[] }> = [
  { id: "frontend", items: ["TypeScript", "React", "Next.js", "Tailwind", "SwiftUI", "HTML & CSS"] },
  { id: "motion", items: ["Three.js", "React Three Fiber", "GLSL", "GSAP"] },
  { id: "backend", items: ["Node.js", "Express", "MySQL", "REST APIs", "WebSockets", "Python"] },
  { id: "infra", items: ["Docker", "Linux", "Proxmox", "Nginx", "systemd", "Tailscale"] },
  { id: "ai", items: ["Claude API", "MCP", "AI agents", "Automation"] },
  { id: "tools", items: ["Git", "Stripe", "Mollie", "Figma", "Playwright", "Vitest"] },
];

export type SoftSkillId = "independent" | "curious" | "solver" | "client" | "calm" | "team";

export const SOFT_SKILLS: SoftSkillId[] = ["independent", "curious", "solver", "client", "calm", "team"];

/** What I want to learn next, in order of how soon. */
export type LearnId = "gpu" | "scale" | "security" | "rust";

export const LEARNING: LearnId[] = ["gpu", "scale", "security", "rust"];
