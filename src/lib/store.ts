import { create } from "zustand";
import { progressToChapter } from "@/lib/journey-math";

type JourneyState = {
  /** Preloader finished, intro may play. */
  loaded: boolean;
  /** Global scroll progress 0..1 across the whole journey. */
  progress: number;
  chapter: number;
  chapterProgress: number;
  /** Scroll velocity in px/s from ScrollTrigger; drives fov kick / ember boost. */
  velocity: number;
  /** null = not yet detected. */
  webglOk: boolean | null;
  setLoaded: (v: boolean) => void;
  setScroll: (progress: number, velocity?: number) => void;
  setWebglOk: (v: boolean) => void;
};

export const useJourney = create<JourneyState>()((set) => ({
  loaded: false,
  progress: 0,
  chapter: 0,
  chapterProgress: 0,
  velocity: 0,
  webglOk: null,
  setLoaded: (v) => set({ loaded: v }),
  setScroll: (progress, velocity = 0) => {
    const { index, local } = progressToChapter(progress);
    set({ progress, chapter: index, chapterProgress: local, velocity });
  },
  setWebglOk: (v) => set({ webglOk: v }),
}));
