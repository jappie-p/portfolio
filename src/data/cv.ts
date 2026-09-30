// Content for the CV route (/cv/nl, /cv/en). Kept separate from src/i18n:
// the CV is its own printable document, not part of the site's dictionaries,
// and its language is fixed by the URL segment rather than a site-wide toggle.

import type { SkillGroupId } from "@/data/skills";

/** Change the current employer here; every place that shows it reads this. */
export const EMPLOYER_NAME = "Go to Guy";

export type CvLocale = "nl" | "en";

export interface CvExperienceItem {
  org: string;
  orgNote: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface CvEducationItem {
  program: string;
  place: string;
  status: string;
}

export interface CvProjectItem {
  name: string;
  description: string;
}

export interface CvContent {
  meta: { title: string; description: string };
  name: string;
  role: string;
  tagline: string;
  photoAlt: string;
  contact: {
    email: string;
    github: { label: string; href: string };
    site: { label: string; href: string };
    location: string;
  };
  sectionLabels: {
    contact: string;
    profile: string;
    experience: string;
    sideJobs: string;
    education: string;
    projects: string;
    skills: string;
    softSkills: string;
    languages: string;
    interests: string;
  };
  profile: string;
  experience: CvExperienceItem[];
  sideJobs: string[];
  education: CvEducationItem[];
  projects: CvProjectItem[];
  skillGroupLabels: Record<SkillGroupId, string>;
  softSkills: string[];
  languages: string[];
  interests: string[];
  toolbar: { downloadPdf: string; switchLabel: string; backToPortfolio: string };
}

export const CV: Record<CvLocale, CvContent> = {
  nl: {
    meta: {
      title: "Jasper Pathuis, cv",
      description:
        "Curriculum vitae van Jasper Pathuis, developer. Ervaring, opleiding en vaardigheden, ook te downloaden als pdf.",
    },
    name: "Jasper Pathuis",
    role: "Developer",
    tagline:
      "Van game-artist naar developer. Ik bouw complete producten, van website en backend tot betalingen en de server eronder.",
    photoAlt: "Portret van Jasper Pathuis",
    contact: {
      email: "pathuisjasper@gmail.com",
      github: { label: "github.com/jappie-p", href: "https://github.com/jappie-p" },
      site: { label: "jasper.hyphosting.com", href: "https://jasper.hyphosting.com" },
      location: "Regio Utrecht",
    },
    sectionLabels: {
      contact: "Contact",
      profile: "Profiel",
      experience: "Ervaring",
      sideJobs: "Bijbanen",
      education: "Opleiding",
      projects: "Uitgelichte projecten",
      skills: "Vaardigheden",
      softSkills: "Soft skills",
      languages: "Talen",
      interests: "Interesses",
    },
    profile:
      "Ik begon als game-artist en raakte verslingerd aan de techniek eronder. Nu bouw ik het liefst een product helemaal zelf en zet ik het live. Naast mijn opleiding run ik een eigen hostingplatform en werk ik aan AI-tooling voor een marketingbureau.",
    experience: [
      {
        org: EMPLOYER_NAME,
        orgNote: "marketingbureau",
        role: "AI en automation developer",
        period: "2026 tot nu",
        bullets: [
          "Bouwt een AI-bridge die de dagelijkse systemen van het team koppelt: mail, agenda, urenregistratie en CRM.",
          "Agents die routinewerk overnemen, zoals offertes opstellen en uren controleren.",
          "Een eigen dashboard voor het hele team.",
        ],
      },
      {
        org: "HypHosting",
        orgNote: "eigen bedrijf",
        role: "Oprichter en developer",
        period: "2026 tot nu",
        bullets: [
          "Commercieel Minecraft-hostingplatform met een eigen website en klantenpaneel met een live console.",
          "Betalingen en abonnementen via Mollie.",
          "Elke server draait in zijn eigen Docker-container.",
          "Native iOS-app (SwiftUI).",
        ],
      },
      {
        org: "Louisa Edelstenen",
        orgNote: "freelance, klant",
        role: "Webshop voor een klant",
        period: "2026",
        bullets: [
          "Catalogus en een eigen adminpaneel.",
          "Afrekenen via Stripe.",
          "Verzendlabels die zichzelf printen via een Raspberry Pi.",
        ],
      },
    ],
    sideJobs: ["Spoelkeukenmedewerker, sauna (2022 tot nu)", "Medewerker, Plus supermarkt (2020 tot 2022)"],
    education: [
      { program: "MBO 4 Creative Software Development", place: "Grafisch Lyceum Utrecht (GLU)", status: "2024 tot nu" },
      { program: "VMBO TL (theoretische leerweg)", place: "", status: "Diploma behaald" },
    ],
    projects: [
      {
        name: "Jarvis",
        description: "Persoonlijke AI-assistent met een eigen iOS-app en server rond Claude. Leest mail en plant de dag.",
      },
      {
        name: "Homelab",
        description: "Proxmox-server met GPU-mediaserver, VPN met kill switch, wachtwoordkluis, monitoring en een honeypot.",
      },
      {
        name: "Zelda-remake (school)",
        description: "Pygame-remake van A Link to the Past, speelbaar met je telefoon als controller via WebSockets.",
      },
      {
        name: "❤️U Festival-app (school)",
        description: "Offline-first PWA in Vue 3, Nederlands en Engels, met programma en plattegrond.",
      },
    ],
    skillGroupLabels: {
      frontend: "Frontend",
      motion: "3D en motion",
      backend: "Backend",
      infra: "Infrastructuur",
      ai: "AI",
      tools: "Tools",
    },
    softSkills: ["Zelfstandig", "Leergierig", "Oplossingsgericht", "Klantgericht", "Stressbestendig", "Samenwerken"],
    languages: ["Nederlands (moedertaal)", "Engels (goed)"],
    interests: ["windsurfen", "mountainbiken", "wielrennen", "motorrijden"],
    toolbar: { downloadPdf: "Download PDF", switchLabel: "English", backToPortfolio: "Terug naar portfolio" },
  },
  en: {
    meta: {
      title: "Jasper Pathuis, CV",
      description:
        "Curriculum vitae of Jasper Pathuis, developer. Experience, education and skills, also available as a PDF download.",
    },
    name: "Jasper Pathuis",
    role: "Developer",
    tagline:
      "From game artist to developer. I build complete products, from website and backend to payments and the server underneath.",
    photoAlt: "Portrait of Jasper Pathuis",
    contact: {
      email: "pathuisjasper@gmail.com",
      github: { label: "github.com/jappie-p", href: "https://github.com/jappie-p" },
      site: { label: "jasper.hyphosting.com", href: "https://jasper.hyphosting.com" },
      location: "Utrecht area",
    },
    sectionLabels: {
      contact: "Contact",
      profile: "Profile",
      experience: "Experience",
      sideJobs: "Side jobs",
      education: "Education",
      projects: "Selected projects",
      skills: "Skills",
      softSkills: "Soft skills",
      languages: "Languages",
      interests: "Interests",
    },
    profile:
      "I started out as a game artist and got hooked on the technology behind it. Now I prefer to build a product entirely myself and put it live. Alongside my studies I run my own hosting platform and work on AI tooling for a marketing agency.",
    experience: [
      {
        org: EMPLOYER_NAME,
        orgNote: "marketing agency",
        role: "AI and automation developer",
        period: "2026 to now",
        bullets: [
          "Builds an AI bridge that connects the team's daily systems: mail, calendar, time tracking and CRM.",
          "Agents that take over routine work, such as drafting quotes and checking hours.",
          "A dashboard built for the whole team.",
        ],
      },
      {
        org: "HypHosting",
        orgNote: "own company",
        role: "Founder and developer",
        period: "2026 to now",
        bullets: [
          "Commercial Minecraft hosting platform with its own website and a customer panel with a live console.",
          "Payments and subscriptions through Mollie.",
          "Every server runs in its own Docker container.",
          "Native iOS app (SwiftUI).",
        ],
      },
      {
        org: "Louisa Edelstenen",
        orgNote: "freelance, client",
        role: "Webshop for a client",
        period: "2026",
        bullets: [
          "Catalogue and a custom admin panel.",
          "Checkout through Stripe.",
          "Shipping labels that print themselves via a Raspberry Pi.",
        ],
      },
    ],
    sideJobs: ["Dishwasher, sauna (2022 to now)", "Store assistant, Plus supermarket (2020 to 2022)"],
    education: [
      { program: "MBO 4 Creative Software Development", place: "Grafisch Lyceum Utrecht (GLU)", status: "2024 to now" },
      { program: "VMBO TL (Dutch secondary education diploma)", place: "", status: "Diploma obtained" },
    ],
    projects: [
      {
        name: "Jarvis",
        description: "Personal AI assistant with its own iOS app and server around Claude. Reads mail and plans the day.",
      },
      {
        name: "Homelab",
        description: "Proxmox server with a GPU media server, VPN with kill switch, password vault, monitoring and a honeypot.",
      },
      {
        name: "Zelda remake (school)",
        description: "Pygame remake of A Link to the Past, playable with your phone as controller over WebSockets.",
      },
      {
        name: "❤️U Festival app (school)",
        description: "Offline-first PWA in Vue 3, Dutch and English, with schedule and map.",
      },
    ],
    skillGroupLabels: {
      frontend: "Frontend",
      motion: "3D and motion",
      backend: "Backend",
      infra: "Infrastructure",
      ai: "AI",
      tools: "Tools",
    },
    softSkills: ["Independent", "Eager to learn", "Solution-oriented", "Customer-focused", "Calm under pressure", "Teamwork"],
    languages: ["Dutch (native)", "English (good)"],
    interests: ["windsurfing", "mountain biking", "road cycling", "motorcycling"],
    toolbar: { downloadPdf: "Download PDF", switchLabel: "Nederlands", backToPortfolio: "Back to portfolio" },
  },
};

export function isCvLocale(value: string): value is CvLocale {
  return value === "nl" || value === "en";
}
