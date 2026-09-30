import type { DiagramId } from "./projects";

// How the projects without a public screen fit together: inputs on the left
// flow into the hub, results flow out to the right. Node labels live in the
// dictionaries under the same keys.
export const DIAGRAMS = {
  jarvis: { in: ["app", "mail", "agenda"], out: ["claude", "push"] },
  "go-to-guy": { in: ["mail", "agenda", "hours"], out: ["crm", "team"] },
  homelab: { in: ["tailscale", "tunnel"], out: ["media", "vpn", "vault", "honeypot"] },
} as const satisfies Record<DiagramId, { in: readonly string[]; out: readonly string[] }>;

export type DiagramNode<D extends DiagramId> = (typeof DIAGRAMS)[D]["in"][number] | (typeof DIAGRAMS)[D]["out"][number];
