import type { ProjectSlug } from "@/lib/chapters";
import type { ArchiveId, DiagramId, ProjectKind } from "@/data/projects";
import type { DiagramNode } from "@/data/diagrams";
import type { SnippetSlug } from "@/data/snippets";
import type { LearnId, SkillGroupId, SoftSkillId } from "@/data/skills";

type Blurb = { title: string; text: string };

export type Dictionary = {
  meta: { title: string; description: string };
  nav: { home: string; websites: string; ai: string; cyber: string; school: string; about: string; contact: string; menu: string; close: string };
  hero: {
    name: string;
    role: string;
    identity: string;
    work: string;
    contact: string;
    scroll: string;
    /** name of the row of doors, one into every part of the site */
    doors: string;
    /** "Naar" + a part of the site, the name of each door */
    enter: string;
  };
  sections: Record<"websites" | "ai" | "cyber" | "school", { title: string; lead: string }>;
  about: {
    title: string;
    /** the short description of who I am */
    intro: string;
    whyTitle: string;
    why: string;
    photoAlt: string;
    cv: string;
    skillsTitle: string;
    skillsLead: string;
    hardTitle: string;
    softTitle: string;
    learnTitle: string;
    learnLead: string;
    refsTitle: string;
    refsText: string;
    refsCta: string;
    moreTitle: string;
    moreLead: string;
    /** what a star's size means, above the skill constellations */
    skyLegend: string;
    /** "1 project" and "4 projects" under a star */
    skyProject: string;
    skyProjects: string;
    /** under a star no project on the page lists */
    skyNone: string;
  };
  skills: Record<SkillGroupId, string>;
  softSkills: Record<SoftSkillId, Blurb>;
  learning: Record<LearnId, Blurb>;
  archive: Record<ArchiveId, Blurb>;
  /** Per project: a one-liner, the facts, and three highlights for the case panel. */
  projects: Record<ProjectSlug, { blurb: string; role: string; what: string; did: string; h1: string; h2: string; h3: string }>;
  school: {
    title: string;
    programme: string;
    extraTitle: string;
    extraText: string;
    /** The Zelda build, playable inside its panel. */
    game: { play: string; stop: string; controls: string; loading: string; title: string };
    /** Words on the kiosk's printed receipt; the menu keeps the kiosk's own words. */
    receipt: { order: string; eatIn: string; total: string; thanks: string };
  };
  work: {
    kinds: Record<ProjectKind, string>;
    solo: string;
    team: string;
    featured: string;
    until: string;
    now: string;
    role: string;
    did: string;
    highlights: string;
    stack: string;
    live: string;
    code: string;
    play: string;
    open: string;
    close: string;
    video: string;
    fromCode: string;
    privateCode: string;
    architecture: string;
  };
  /** Labels in the architecture diagrams. */
  diagrams: { [D in DiagramId]: { hub: string; nodes: Record<DiagramNode<D>, string> } };
  /** One line under each code sample: what it shows. */
  snippets: Record<SnippetSlug, string>;
  contact: {
    title: string;
    lead: string;
    email: string;
    copy: string;
    copied: string;
    github: string;
    linkedin: string;
    cv: string;
    repo: string;
    built: string;
    top: string;
    /** the footer's links to the earlier versions of this site, kept online to compare */
    versions: string;
    region: string;
    mapLabel: string;
    mapAlt: string;
    form: {
      title: string;
      name: string;
      email: string;
      message: string;
      send: string;
      sending: string;
      sentTitle: string;
      sentText: string;
      again: string;
      error: string;
      errName: string;
      errEmail: string;
      errMessage: string;
      errRate: string;
      privacy: string;
    };
  };
  /** Captions for the sideways chapters of the AI scene. */
  aiStory: {
    jarvis: { label: string; title: string; body: string };
    gotoguy: { label: string; title: string; body: string };
  };
  /** Captions for the sideways chapters of the cyber scene. */
  cyberStory: {
    attack: { label: string; title: string; body: string };
    defense: { label: string; title: string; body: string };
    secure: { label: string };
  };
  /** Text on the screens inside the cyber scene. Protocol names and numbers stay in code. */
  cyberHud: {
    firewall: string;
    active: string;
    secureNetwork: string;
    checkTraffic: string;
    checkAuth: string;
    checkEncryption: string;
    checkIntrusion: string;
    checkStatus: string;
    systemLog: string;
    log1: string;
    log2: string;
    log3: string;
    log4: string;
    log5: string;
    log6: string;
    log7: string;
    log8: string;
    log9: string;
    networkTraffic: string;
    encryption: string;
    serverStatus: string;
    online: string;
    ddos: string;
    intensity: string;
    high: string;
    critical: string;
    target: string;
    status: string;
    blocked: string;
  };
  ui: { langName: string; scrollSideways: string; next: string; skipToContent: string };
};
