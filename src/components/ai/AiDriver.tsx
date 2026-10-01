"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sinceBoot, useAiSim } from "./sim";
import { AI_BEATS, hubMix, jarvisMix, networkEnergy } from "./lib/ai-math";

/** How fast the power-on front runs out from the core, in units per second. */
const BOOT_SPEED = 9;

/** Runs first every frame: eases the scroll position, turns arriving at a
 *  chapter into an event (a wake pulse, the ring powering on), follows clicks
 *  on the scene with a pulse of their own, and writes the shared uniforms. */
export function AiDriver() {
  const { u, state, progress, boot, pointer, still } = useAiSim();
  const first = useRef(true);
  const chapter = useRef(-1);
  const pings = useRef(0);

  useFrame(({ viewport }, delta) => {
    const dt = Math.min(delta, 1 / 20);
    if (!still) state.time += dt;
    const t = state.time;
    if (boot.current && state.bootAt < 0 && !still) {
      state.bootAt = t;
      u.uWake.value.set(t, 1);
    }
    const since = sinceBoot(state, still);

    state.p = first.current || still ? progress.current : THREE.MathUtils.damp(state.p, progress.current, 4, dt);
    first.current = false;
    state.jarvis = jarvisMix(state.p);
    state.hub = hubMix(state.p);

    // arriving at a chapter: the core flares and a pulse runs through the network
    const at = AI_BEATS.findIndex((b) => Math.abs(state.p - b) < 0.05);
    if (at >= 0 && at !== chapter.current) {
      chapter.current = at;
      if (!still && since > 0.8) {
        u.uWake.value.set(t, at === 0 ? 0.6 : 1);
        state.flare = 1;
        if (at === 2) state.hubAt = t;
      }
    }
    // a click on the scene sends a pulse of its own
    if (pointer.pings !== pings.current) {
      pings.current = pointer.pings;
      if (!still) {
        u.uWake.value.set(t, 0.8);
        state.flare = Math.max(state.flare, 0.7);
      }
    }
    if (still && state.hubAt < 0) state.hubAt = -1e4;
    state.flare = Math.max(0, state.flare - dt * 1.6);

    u.uTime.value = t;
    u.uBoot.value = still ? 99 : since < 0 ? 0 : since * BOOT_SPEED;
    u.uEnergy.value = networkEnergy(state.p);
    u.uJarvis.value = state.jarvis;
    u.uHub.value = state.hub;
    u.uPixelRatio.value = viewport.dpr;
  }, -2);

  return null;
}
