"use client";
import { useEffect, useMemo } from "react";
import { CursorProbe } from "./CursorProbe";
import { SimProvider, type Sim, type Tier } from "./SimContext";
import { SimDriver } from "./SimDriver";
import { CameraRig } from "./CameraRig";
import { Lighting } from "./Lighting";
import { ServerRoom } from "./ServerRoom";
import { Backdrop } from "./Backdrop";
import { FirewallWall } from "./FirewallWall";
import { WallBacking } from "./WallBacking";
import { CoreShield } from "./CoreShield";
import { DataStreams } from "./DataStreams";
import { AttackBeams } from "./AttackBeams";
import { Impacts } from "./Impacts";
import { Hud } from "./hud/Hud";
import { Effects } from "./Effects";
import { createSceneUniforms } from "./lib/uniforms";
import { drawIconAtlas } from "./lib/icons";
import { toTexture } from "./lib/textures";

/** The firewall under attack: every part of the scene, sharing one Sim. */
export function CyberStage({
  progress,
  boot,
  tier,
  still,
  antialias,
}: {
  progress: { current: number };
  boot: { current: boolean };
  tier: Tier;
  still: boolean;
  antialias: boolean;
}) {
  const sim = useMemo<Sim>(
    () => ({
      u: createSceneUniforms(),
      pointer: { clientX: 0, clientY: 0, x: 0, y: 0, active: false, pings: 0 },
      progress,
      boot,
      // SimDriver snaps p to the live scroll position on its first frame
      state: { p: 0, attack: 0, defense: 0, time: 0, bootAt: -1, trauma: 0, pulseAt: -1e4, hit: 0, hitAt: [-1e4, -1e4, -1e4], clearAt: -1e4 },
      atlas: toTexture(drawIconAtlas(), { flipY: false }),
      tier,
      still,
    }),
    [progress, boot, tier, still],
  );
  useEffect(() => () => sim.atlas.dispose(), [sim]);

  // one mouse listener for the whole scene (fine pointers only: touch has no hover)
  useEffect(() => {
    if (still || !window.matchMedia("(pointer: fine)").matches) return;
    const p = sim.pointer;
    const onMove = (e: PointerEvent) => {
      p.clientX = e.clientX;
      p.clientY = e.clientY;
      p.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.y = (e.clientY / window.innerHeight) * 2 - 1;
      p.active = true;
    };
    const onLeave = () => void (p.active = false);
    // a click on the scene itself (not on a button or the card) pings the wall
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest('[data-section="cyber"]') && !el.closest("button, a, .glass")) p.pings++;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [sim, still]);

  return (
    <SimProvider value={sim}>
      <SimDriver />
      <CameraRig />
      <CursorProbe />
      <Lighting />
      <Backdrop />
      <ServerRoom />
      <WallBacking />
      <FirewallWall />
      <CoreShield />
      <DataStreams />
      <AttackBeams />
      <Impacts />
      <Hud />
      <Effects antialias={antialias} />
    </SimProvider>
  );
}
