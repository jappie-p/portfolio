export type FeaturedProject = {
  slug: string;
  title: string;
  year: string;
  role: string;
  tagline: string;
  tech: string[];
  accent: string;
};

export type ArchiveItem = {
  title: string;
  year: string;
  tech: string[];
  href?: string;
};

export const featured: FeaturedProject[] = [
  {
    slug: "hyphosting",
    title: "HypHosting",
    year: "2025—now",
    role: "Founder, everything",
    tagline:
      "A commercial Minecraft hosting platform: website, payments, server panel with real-time console, security system, and a native iOS app.",
    tech: ["Node.js", "Express", "MySQL", "Docker", "Mollie", "WebSocket", "SwiftUI"],
    accent: "#22c55e",
  },
  {
    slug: "jarvis",
    title: "Jarvis",
    year: "2026",
    role: "Design & build",
    tagline:
      "A personal AI assistant with its own iOS app and server, built around Claude. It reads my mail, manages my day, and ships my ideas.",
    tech: ["Claude", "Express", "SwiftUI", "MySQL", "VPS"],
    accent: "#d97706",
  },
  {
    slug: "homelab",
    title: "Homelab",
    year: "2026",
    role: "Infrastructure & security",
    tagline:
      "A Proxmox server running a GPU-transcoding media stack, password vault, monitoring, and a honeypot that catches intruders for fun.",
    tech: ["Proxmox", "Docker", "Tailscale", "WireGuard", "NVENC", "Linux"],
    accent: "#7dd3fc",
  },
  {
    slug: "social-elephant",
    title: "Social Elephant",
    year: "2026",
    role: "Automation engineer (work experience)",
    tagline:
      "Real work for a marketing agency: AI tooling, workflow automation, and integrations that connect their daily systems into one bridge.",
    tech: ["TypeScript", "Node.js", "MCP", "AI agents", "REST APIs"],
    accent: "#11b958",
  },
  {
    slug: "louisa-gemstones",
    title: "Louisa Gemstones",
    year: "2025",
    role: "Client work",
    tagline:
      "An elegant e-commerce site for a gemstone collector: catalog, admin panel, and Stripe checkout in a calm sage-green design.",
    tech: ["Node.js", "Express", "MySQL", "Stripe"],
    accent: "#7B9E87",
  },
];

export const archive: ArchiveItem[] = [
  { title: "Windsurf Speed", year: "2026", tech: ["SuuntoPlus", "GPS"] },
  { title: "Zelda ALttP Remake", year: "2025", tech: ["Python", "Pygame"] },
  { title: "Amorphophallus Collection", year: "2025", tech: ["HTML", "CSS", "JS"], href: "https://amorphophallus.nl" },
  { title: "Utrecht Festival PWA", year: "2026", tech: ["Vite", "PWA"] },
  { title: "Happy Herbivore Kiosk", year: "2026", tech: ["Node.js", "systemd"] },
  { title: "Webshop Backend", year: "2024", tech: ["Node.js", "CRUD", "MySQL"] },
];
