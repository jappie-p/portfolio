"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type * as THREE from "three";
import { useT } from "@/i18n/useT";
import { useSim } from "../SimContext";
import { HudPanel, type PanelPlacement } from "./HudPanel";
import { HUD } from "./colors";
import { ICON } from "../lib/icons";
import { FONTS } from "../lib/palette";
import { visibleLogCount } from "../lib/scene-math";

const SLOTS = 5;
const LINE = 0.215;
const CPS = 42; // typed characters per second

type TroikaText = { text: string; color: THREE.Color; sync: (done?: () => void) => void };

const colorFor = (i: number) => (i >= 7 ? HUD.ok : i >= 4 ? HUD.alert : HUD.text);

/** A terminal that types the incident as it unfolds: new lines appear with the
 *  scroll story, the newest one typed out with a cursor; older ones scroll up. */
export function SystemLogPanel({ placement }: { placement: PanelPlacement }) {
  const h = useT().cyberHud;
  const { state } = useSim();
  // text set from code needs its own redraw request in on-demand (reduced motion) mode
  const invalidate = useThree((s) => s.invalidate);
  const lines = [h.log1, h.log2, h.log3, h.log4, h.log5, h.log6, h.log7, h.log8, h.log9];
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  });
  const slots = useRef<Array<TroikaText | null>>([]);
  const typing = useRef({ count: -1, since: -1e9 });
  const clock = useRef<TroikaText | null>(null);

  useFrame(() => {
    const all = linesRef.current;
    const count = visibleLogCount(state.p);
    const tp = typing.current;
    if (count !== tp.count) {
      // type only when the story moves forward; scrolling back just removes lines
      tp.since = count > tp.count && tp.count >= 0 ? state.time : -1e9;
      tp.count = count;
    }
    const first = Math.max(0, count - SLOTS);
    for (let slot = 0; slot < SLOTS; slot++) {
      const el = slots.current[slot];
      if (!el) continue;
      const idx = first + slot;
      let s = "";
      if (idx < count) {
        s = `> ${all[idx]}`;
        if (idx === count - 1) {
          const n = Math.floor((state.time - tp.since) * CPS);
          const blink = Math.floor(state.time * 2.5) % 2 === 0;
          s = n < s.length ? s.slice(0, n) + "_" : s + (blink ? " _" : "");
        }
      }
      if (el.text !== s) {
        el.text = s;
        el.color = colorFor(idx);
        el.sync(invalidate);
      }
    }
    const c = clock.current;
    if (c) {
      const now = new Date();
      const s = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
      if (c.text !== s) {
        c.text = s;
        c.sync(invalidate);
      }
    }
  });

  return (
    <HudPanel
      placement={placement}
      size={[2.8, 1.52]}
      color={HUD.cyan}
      title={h.systemLog}
      icon={ICON.server}
      aside={
        <Text ref={clock} font={FONTS.mono} fontSize={0.09} color={HUD.textDim} anchorX="right" anchorY="middle">
          {""}
        </Text>
      }
    >
      {Array.from({ length: SLOTS }, (_, i) => (
        <Text
          key={i}
          ref={(el: TroikaText | null) => void (slots.current[i] = el)}
          font={FONTS.mono}
          fontSize={0.1}
          color={HUD.text}
          anchorX="left"
          anchorY="top"
          position={[0.02, -i * LINE, 0]}
        >
          {""}
        </Text>
      ))}
    </HudPanel>
  );
}
