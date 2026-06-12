import { create } from "zustand";
import { progressToChapter } from "@/lib/journey-math";

type JourneyState = {
  /** Preloader finished, intro may play. */
  loaded: boolean;
  /** Global scroll progress 0..1 across the whole journey. */
  progress: number;
  chapter: number;
  chapterProgress: number;
  /** null = not yet detected. */
  webglOk: boolean | null;
  setLoaded: (v: boolean) => void;
  setScroll: (progress: number) => void;
  setWebglOk: (v: boolean) => void;
};

export const useJourney = create<JourneyState>()((set) => ({
  loaded: false,
  progress: 0,
  chapter: 0,
  chapterProgress: 0,
  webglOk: null,
  setLoaded: (v) => set({ loaded: v }),
  setScroll: (progress) => {
    const { index, local } = progressToChapter(progress);
    set({ progress, chapter: index, chapterProgress: local });
  },
  setWebglOk: (v) => set({ webglOk: v }),
}));
