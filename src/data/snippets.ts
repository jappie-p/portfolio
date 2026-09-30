import type { ProjectSlug } from "@/lib/chapters";

// One real piece of code per project, copied from the project's own repo into
// src/data/snippets/<slug>.txt and cleaned of anything private (addresses,
// hosts, secrets), with the odd line left out for length. Captions live in
// the dictionaries under `snippets`. Work for a client or employer stays out:
// that code is not mine to publish.

export type SnippetLang = "ts" | "js" | "python" | "yaml";
export type Snippet = { file: string; lang: SnippetLang };

export const SNIPPETS = {
  hyphosting: { file: "backend/middleware/security.js", lang: "js" },
  louisa: { file: "theme-loader.js", lang: "js" },
  jarvis: { file: "services/promptArmor.js", lang: "js" },
  homelab: { file: "lxc-102-arr-stack/docker-compose.yml", lang: "yaml" },
  zelda: { file: "overworld_engine.py", lang: "python" },
  festival: { file: "src/composables/useGpsToSvg.ts", lang: "ts" },
} as const satisfies Partial<Record<ProjectSlug, Snippet>>;

export type SnippetSlug = keyof typeof SNIPPETS;
