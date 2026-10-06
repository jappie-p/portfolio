import type { ProjectSlug } from "@/lib/chapters";
import type { ArchiveId, DiagramId, ProjectKind } from "@/data/projects";
import type { DiagramNode } from "@/data/diagrams";
import type { SnippetSlug } from "@/data/snippets";
import type { LearnId, SkillGroupId, SoftSkillId } from "@/data/skills";
import type { Kind, StoryId } from "@/components/about/room/types";

type Blurb = { title: string; text: string };

/** A how-to step: what it asks, the move for a mouse and for a finger, and
 *  what the narrator says (ending in that move), for a mouse and for touch. */
type TourStep = { title: string; mouse: string; touch: string; sayMouse: string; sayTouch: string };

export type Dictionary = {
  meta: { title: string; description: string };
  /** The plain front door: how would you like to look around. */
  welcome: {
    kicker: string;
    title: string;
    simpleTitle: string;
    simpleText: string;
    soon: string;
    richTitle: string;
    richText: string;
    enter: string;
    again: string;
  };
  /** The short how-to before the experience, step by step. Each `say` is
   *  also what the narrator speaks (recorded with `npm run voice`). */
  tour: {
    title: string;
    skip: string;
    next: string;
    soundOn: string;
    soundOff: string;
    step: string;
    you: string;
    down: TourStep;
    side: TourStep;
    dive: TourStep;
    done: { title: string; say: string; go: string };
  };
  /** The narrator again, as Jarvis in the AI topic: a line per chapter. */
  voice: {
    ai: { cover: string; jarvis: string; gotoguy: string };
    name: string;
    listen: string;
    mute: string;
  };
  nav: { home: string; websites: string; ai: string; cyber: string; school: string; about: string; contact: string; menu: string; close: string };
  hero: {
    name: string;
    role: string;
    identity: string;
    work: string;
    contact: string;
    scroll: string;
    /** the first screen's build-up, counted off at its foot */
    load: { sketch: string; wire: string; render: string };
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
    hardTitle: string;
    softTitle: string;
    learnTitle: string;
    learnLead: string;
    refsTitle: string;
    refsText: string;
    refsCta: string;
    /** The first panel: who I am, beside my photo, and a few counted facts. */
    hero: {
      kicker: string;
      hello: string;
      name: string;
      motto: string;
      lead: string;
      place: string;
      aside: string;
      cta: string;
      /** under the counted facts */
      live: string;
      built: string;
      company: string;
    };
    /** How I grew: a medal on the desk and three tabs of story, skills and learning. */
    growth: {
      kicker: string;
      title: string;
      tabs: { story: string; skills: string; learn: string };
      storyTitle: string;
      storyKicker: string;
      storyText: string;
      skillsHeading: string;
      skillsLead: string;
      learnHeading: string;
      /** the handwritten note beside the medal, a line each */
      note: string;
      medal: string;
      next: string;
    };
    /** The last panel: the invitation, references and the cv. */
    closing: {
      kicker: string;
      title: string;
      titleEm: string;
      titleEnd: string;
      lead: string;
      contact: string;
      role: string;
    };
    /** My room: what the panel says, the filter, each pin's name. */
    world: {
      kicker: string;
      /** the title over two lines, the second in the brand's italic */
      title: string;
      titleEm: string;
      lead: string;
      filters: Record<Kind | "alles", string>;
      pins: Record<StoryId, string>;
      close: string;
      /** the way on, to my growth */
      next: string;
      /** where a story's photo will go, until there is one */
      photoSoon: string;
    };
    /** What each piece of the room tells when you open it. `photo` is a path
     *  under /public, once Jasper has one for it. */
    stories: Record<StoryId, { kicker: string; title: string; text: string; photo?: string }>;
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
    /** The way between the projects inside the gallery. */
    guide: { gallery: string; back: string; next: string; prev: string; swipe: string; keys: string };
    /** The gallery's cover: the museum's wall text and its bar along the foot. */
    museum: { kicker: string; titleA: string; titleB: string; lead: string; tour: string; room: string; explore: string; prev: string; next: string };
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
