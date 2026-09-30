"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useT } from "@/i18n/useT";
import { useSim } from "../SimContext";
import { HudPanel, HEADER, PAD, type PanelPlacement } from "./HudPanel";
import { HUD } from "./colors";
import { createChartMaterial } from "../lib/hud-materials";
import { FONTS } from "../lib/palette";

const SIZE: [number, number] = [2.25, 1.25];

type TroikaText = { text: string; sync: (done?: () => void) => void };

/** Live inbound traffic graph; it spikes and runs hot as the flood builds. */
export function TrafficPanel({ placement }: { placement: PanelPlacement }) {
  const h = useT().cyberHud;
  const { u, state } = useSim();
  const invalidate = useThree((s) => s.invalidate);
  const chart = useMemo(() => createChartMaterial(u, HUD.mint, HUD.red), [u]);
  useEffect(() => () => chart.dispose(), [chart]);
  const value = useRef<TroikaText | null>(null);
  const tick = useRef(-1);

  useFrame(() => {
    const step = Math.floor(state.time * 5);
    if (!value.current || step === tick.current) return;
    tick.current = step;
    const gbps = 2.1 + state.attack * 11.5 + Math.sin(state.time * 3.1) * 0.35;
    value.current.text = `${gbps.toFixed(1)} Gb/s`;
    value.current.sync(invalidate);
  });

  const [w, hgt] = SIZE;
  const chartW = w - PAD * 2;
  const chartH = hgt - HEADER - PAD * 1.6;
  return (
    <HudPanel
      placement={placement}
      size={SIZE}
      color={HUD.mint}
      title={h.networkTraffic}
      aside={
        <Text ref={value} font={FONTS.monoBold} fontSize={0.1} color={HUD.text} anchorX="right" anchorY="middle">
          {""}
        </Text>
      }
    >
      <mesh position={[chartW / 2, -chartH / 2, 0]} material={chart}>
        <planeGeometry args={[chartW, chartH]} />
      </mesh>
    </HudPanel>
  );
}
