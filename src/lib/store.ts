import { create } from "zustand";
import { progressToChapter } from "@/lib/chapters";

export type OrbState = "idle" | "responding";

type JourneyState = {
  /** Global scroll progress 0..1 across the whole journey. */
  progress: number;
  chapter: number;
  chapterProgress: number;
  /** Scroll velocity from Lenis; drives motion accents. */
  velocity: number;
  /** Hero=idle, AI zone=responding. */
  orbState: OrbState;
  /** null = not yet detected. */
  webglOk: boolean | null;
  setScroll: (progress: number, velocity?: number) => void;
  setOrbState: (s: OrbState) => void;
  setWebglOk: (v: boolean) => void;
};

export const useJourney = create<JourneyState>()((set) => ({
  progress: 0,
  chapter: 0,
  chapterProgress: 0,
  velocity: 0,
  orbState: "idle",
  webglOk: null,
  setScroll: (progress, velocity = 0) => {
    const { index, local } = progressToChapter(progress);
    set({ progress, chapter: index, chapterProgress: local, velocity });
  },
  setOrbState: (s) => set({ orbState: s }),
  setWebglOk: (v) => set({ webglOk: v }),
}));
