"use client";
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type * as THREE from "three";
import { useT } from "@/i18n/useT";
import { useSim } from "../SimContext";
import { HudPanel, type PanelPlacement } from "./HudPanel";
import { useStoryValue } from "./useStoryValue";
import { HUD } from "./colors";
import { ICON } from "../lib/icons";
import { FONTS } from "../lib/palette";
import { alertLevel, clamp01 } from "../lib/scene-math";
import { hitEnvelope } from "../lib/juice";

const FLOODS = ["UDP FLOOD", "SYN FLOOD", "HTTP FLOOD"] as const;

type TroikaText = { text: string; sync: (done?: () => void) => void };

/** One incoming flood: jolts and flares every time its salvo lands, escalates
 *  HIGH to CRITICAL with a pulsing border, then flips to green with a flash
 *  when the firewall has it BLOCKED. */
export function AlertPanel({ placement, index }: { placement: PanelPlacement; index: number }) {
  const h = useT().cyberHud;
  const { u, state, still } = useSim();
  const invalidate = useThree((s) => s.invalidate);
  const level = useStoryValue(alertLevel);
  const jolt = useRef<THREE.Group>(null);
  const frame = useRef<THREE.ShaderMaterial | null>(null);
  const rate = useRef<TroikaText | null>(null);
  const tick = useRef(-1);
  const blockedAt = useRef(-1);

  useFrame(() => {
    const t = state.time;
    const heat = u.uImpacts.value[index].w;
    const hit = hitEnvelope(t - state.hitAt[index]) * state.attack;
    jolt.current?.position.set(Math.sin(t * 97 + index) * 0.05 * hit, Math.sin(t * 83 + index * 2) * 0.035 * hit, 0);
    if (level !== "blocked") blockedAt.current = -1;
    else if (blockedAt.current < 0) blockedAt.current = t;
    const f = frame.current;
    if (f) {
      const since = t - blockedAt.current;
      const green = blockedAt.current < 0 ? 0 : still ? 1 : clamp01(since / 0.5);
      const flash = blockedAt.current < 0 || still ? 0 : Math.exp(-since * 4) * 2.2;
      const pulse = 0.5 + 0.5 * Math.sin(t * 7 + index * 1.7);
      f.uniforms.uColor.value.copy(HUD.red).lerp(HUD.mint, green);
      f.uniforms.uGlow.value = (level === "critical" ? 1 + 0.8 * pulse : level === "blocked" ? 0.85 : 1) + hit * 1.4 + flash;
    }
    const step = Math.floor(state.time * 5);
    if (rate.current && step !== tick.current) {
      tick.current = step;
      rate.current.text = `${Math.round(60 + heat * 440 + Math.sin(state.time * 9 + index) * 12)}k pkt/s`;
      rate.current.sync(invalidate);
    }
  });

  const blocked = level === "blocked";
  return (
    <group ref={jolt}>
      <HudPanel
        placement={placement}
        size={[2.4, 1.14]}
        color={HUD.red}
        title={h.ddos}
        icon={ICON.warning}
        frameRef={frame}
        aside={
          <Text ref={rate} font={FONTS.mono} fontSize={0.085} color={HUD.textRed} anchorX="right" anchorY="middle">
            {""}
          </Text>
        }
      >
        <Text font={FONTS.label} fontSize={0.135} letterSpacing={0.06} color={HUD.textRed} anchorX="left" anchorY="middle" position={[0.02, -0.07, 0]}>
          {FLOODS[index]}
        </Text>
        <Text font={FONTS.mono} fontSize={0.092} color={blocked ? HUD.ok : HUD.alert} anchorX="left" anchorY="middle" position={[0.02, -0.29, 0]}>
          {blocked ? `${h.status}: ${h.blocked}` : `${h.intensity}: ${level === "critical" ? h.critical : h.high}`}
        </Text>
        <Text font={FONTS.mono} fontSize={0.092} color={HUD.textRed} anchorX="left" anchorY="middle" position={[0.02, -0.47, 0]}>
          {`${h.target}: ${h.firewall}`}
        </Text>
      </HudPanel>
    </group>
  );
}
