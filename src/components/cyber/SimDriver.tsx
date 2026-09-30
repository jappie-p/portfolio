"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sinceBoot, useSim } from "./SimContext";
import { BEATS, attackIntensity, defenseLevel } from "./lib/scene-math";
import {
  BOOT,
  PULSE_PERIOD,
  TRAVEL,
  addTrauma,
  bootFront,
  bootPower,
  decayTrauma,
  hitEnvelope,
  salvoPeriod,
} from "./lib/juice";
import { mulberry32 } from "./lib/rng";

/** Runs first every frame: eases scroll progress, derives the story values,
 *  runs the salvo rhythm and the firewall's shockwaves, turns arriving at a
 *  chapter into an event, and writes the shared uniforms every material reads. */
export function SimDriver() {
  const { u, progress, boot, state, still } = useSim();
  const first = useRef(true);
  const rhythm = useRef({
    rnd: mulberry32(2024),
    next: [0, 0, 0],
    launched: [-1e4, -1e4, -1e4],
    amp: [1, 1, 1],
    volley: [false, false, false],
  });
  const chapter = useRef(-1);

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 1 / 20);
    if (!still) state.time += dt;
    const t = state.time;
    if (boot.current && state.bootAt < 0 && !still) {
      state.bootAt = t;
      // the first salvos land right after the wall has lit up, staggered per flood
      rhythm.current.next = [0, 1, 2].map((i) => t + BOOT.firstHitAt - TRAVEL + i * 0.35);
    }
    const since = sinceBoot(state, still);

    const target = progress.current;
    state.p = first.current || still ? target : THREE.MathUtils.damp(state.p, target, 4.5, dt);
    first.current = false;
    state.attack = attackIntensity(state.p);
    state.defense = defenseLevel(state.p);

    const r = rhythm.current;

    // arriving at a chapter is an event: the attack opens with a volley from all
    // three floods, the defence with a shockwave, the close-up with the all-clear
    const at = BEATS.findIndex((b) => Math.abs(state.p - b) < 0.06);
    if (at >= 0 && at !== chapter.current) {
      chapter.current = at;
      if (!still && since > BOOT.firstHitAt) {
        if (at === 1) {
          r.next = [t, t + 0.07, t + 0.14];
          r.volley = [true, true, true];
        } else if (at === 2) {
          state.pulseAt = t;
          state.trauma = addTrauma(state.trauma, 0.35);
        } else if (at === 3) {
          state.clearAt = t;
        }
      }
    }

    // salvos: each flood fires on its own rhythm, faster the harder the attack
    const power = bootPower(since);
    let hit = 0;
    for (let i = 0; i < 3; i++) {
      if (since > 0 && !still && t >= r.next[i]) {
        r.launched[i] = t;
        r.amp[i] = r.volley[i] ? 1.35 : 0.75 + r.rnd() * 0.5;
        r.volley[i] = false;
        r.next[i] = t + salvoPeriod(state.attack, i, r.rnd());
      }
      const landed = r.launched[i] + TRAVEL;
      if (r.launched[i] > 0 && t >= landed && state.hitAt[i] < landed) {
        state.hitAt[i] = landed;
        state.trauma = addTrauma(state.trauma, 0.3 * r.amp[i] * state.attack);
      }
      const env = hitEnvelope(t - state.hitAt[i]) * r.amp[i] * state.attack;
      hit = Math.max(hit, env);
      u.uSalvo.value[i] = r.launched[i];
      u.uHits.value[i].z = state.hitAt[i];
      u.uHits.value[i].w = r.amp[i] * (0.4 + 0.6 * state.attack);
      // steady heat from the flood, a fast flicker, and the salvo flash on top
      const surge = 0.78 + 0.22 * Math.sin(t * (0.9 + i * 0.37) + i * 2.1);
      const flicker = 0.9 + 0.1 * Math.sin(t * (23 + i * 5)) * Math.sin(t * (11 + i * 3));
      u.uImpacts.value[i].w = (state.attack * surge * flicker * 0.8 + env * 1.2) * power;
    }
    state.hit = hit;

    // the firewall pushes back: periodic shockwaves from the core while defending
    if (state.defense > 0.05 && since > BOOT.firstHitAt && t - state.pulseAt > PULSE_PERIOD) {
      state.pulseAt = t;
      state.trauma = addTrauma(state.trauma, 0.22 * state.defense);
    }
    u.uPulse.value.set(state.pulseAt, 1.4 * state.defense);
    u.uCut.value = state.defense * Math.exp(-(t - state.pulseAt) * 2.2);
    u.uClear.value = state.clearAt;

    state.trauma = decayTrauma(state.trauma, dt);
    u.uTime.value = t;
    u.uAttack.value = state.attack;
    u.uBoot.value = bootFront(since);
    u.uPower.value = power;

    const cam = frame.camera as THREE.PerspectiveCamera;
    u.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / (frame.size.height * frame.viewport.dpr);
  }, -2);

  return null;
}
