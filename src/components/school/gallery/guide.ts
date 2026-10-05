"use client";
import { create } from "zustand";

const SWIPED = "school-swiped";

/** Whether this reader has found the sideways swipe before (then no hints). */
function swipedBefore(): boolean {
  try {
    return localStorage.getItem(SWIPED) === "1";
  } catch {
    return false;
  }
}

/** The School row's guided way between its projects, shared by the gallery
 *  (which runs it) and the project panels (which offer it): from a project
 *  you surface into the gallery, glide to the next print and dive into it.
 *  `live` while the gallery runs it; without it the row is a plain track.
 *  `swiped` once the reader has stepped that way, so the hints can rest. */
export const useGuide = create<{ live: boolean; swiped: boolean; set: (live: boolean) => void }>()((set) => ({
  live: false,
  swiped: swipedBefore(),
  set: (live) => set({ live }),
}));

export function markSwiped() {
  if (useGuide.getState().swiped) return;
  useGuide.setState({ swiped: true });
  try {
    localStorage.setItem(SWIPED, "1");
  } catch {
    // private mode: the hint just shows again next time
  }
}

type Moves = {
  /** on to the next project (+1) or back to the one before (-1) */
  step: (dir: 1 | -1) => void;
  /** back out into the gallery, standing in front of this project's print */
  out: () => void;
};

const idle: Moves = { step: () => {}, out: () => {} };

/** What the gallery does on request; it installs its own while it runs. */
export const guide: Moves & { use: (moves: Moves | null) => void } = {
  ...idle,
  use(moves) {
    Object.assign(guide, moves ?? idle);
  },
};
