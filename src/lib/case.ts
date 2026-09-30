"use client";
import { create } from "zustand";
import { PROJECT_NAMES, type ProjectSlug } from "./chapters";

// Which project case panel is open. It lives in the URL (?case=hyphosting) so
// a case is shareable and the back button closes it. Next's router integrates
// native history.pushState, so no router call is needed.

const PARAM = "case";

export const useCase = create<{ slug: ProjectSlug | null; set: (slug: ProjectSlug | null) => void }>()((set) => ({
  slug: null,
  set: (slug) => set({ slug }),
}));

const isSlug = (v: string | null): v is ProjectSlug => v !== null && v in PROJECT_NAMES;

export function caseFromUrl(): ProjectSlug | null {
  const v = new URL(window.location.href).searchParams.get(PARAM);
  return isSlug(v) ? v : null;
}

export function openCase(slug: ProjectSlug) {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, slug);
  window.history.pushState({ case: slug }, "", url);
  useCase.getState().set(slug);
}

export function closeCase() {
  // opened from this page: step back, so the back button stays in sync
  if (window.history.state?.case) {
    window.history.back();
    return;
  }
  // opened from a shared link: drop the param in place
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  window.history.replaceState(window.history.state, "", url);
  useCase.getState().set(null);
}
