export type Dictionary = {
  nav: { home: string; websites: string; ai: string; cyber: string; about: string; contact: string };
  hero: { name: string; role: string; identity: string; cta: string };
  sections: Record<"websites" | "ai" | "cyber", { title: string; lead: string }>;
  about: { lead: string };
  contact: { lead: string };
  ui: { openCase: string; close: string; solo: string; team: string; school: string; refsOnRequest: string; langName: string };
};
