import { create } from "zustand";

export type OrbState = "idle" | "responding";

type JourneyState = {
  // vertical (topic) axis
  topic: number;
  // horizontal (project) axis, scoped to the active topic
  project: number;
  projectCount: number;
  /** 0..1 within the active topic's horizontal track (continuous, for scene parallax). */
  projectProgress: number;
  // which topics have played their "wake up" scene
  entered: Record<number, boolean>;
  orbState: OrbState;
  webglOk: boolean | null;
  setTopic: (topic: number, projectCount: number) => void;
  setProject: (project: number) => void;
  setProjectProgress: (p: number) => void;
  markEntered: (topic: number) => void;
  setOrbState: (s: OrbState) => void;
  setWebglOk: (v: boolean) => void;
};

export const useJourney = create<JourneyState>()((set) => ({
  topic: 0,
  project: 0,
  projectCount: 1,
  projectProgress: 0,
  entered: { 0: true },
  orbState: "idle",
  webglOk: null,
  setTopic: (topic, projectCount) =>
    set((s) => (s.topic === topic && s.projectCount === projectCount ? s : { topic, projectCount })),
  setProject: (project) => set((s) => (s.project === project ? s : { project })),
  setProjectProgress: (projectProgress) => set({ projectProgress }),
  markEntered: (topic) => set((s) => (s.entered[topic] ? s : { entered: { ...s.entered, [topic]: true } })),
  setOrbState: (s) => set({ orbState: s }),
  setWebglOk: (v) => set({ webglOk: v }),
}));
