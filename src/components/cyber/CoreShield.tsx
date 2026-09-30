"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { sinceBoot, useSim } from "./SimContext";
import { WALL } from "./lib/layout";
import { hexCorners } from "./lib/hex";
import { hexFaceGeometry, hexFrameGeometry, hexLineGeometry, nutGeometry } from "./lib/geometry";
import { drawCoreMark } from "./lib/icons";
import { toTexture } from "./lib/textures";
import { createGlyphMaterial } from "./lib/hud-materials";
import { FONTS, hdr } from "./lib/palette";
import { cyHash } from "./lib/rng";
import { useT } from "@/i18n/useT";

const R = WALL.coreR;
const INNER = R * 0.8;
const LED_COUNT = 36;
const NEON = hdr(0.3, 1.9, 2.3);

/** Points evenly spaced around a pointy-top hexagon's perimeter. */
function perimeter(r: number, count: number) {
  const c = hexCorners(r, true);
  return Array.from({ length: count }, (_, i) => {
    const t = (i / count) * 6;
    const k = Math.floor(t);
    const f = t - k;
    const [ax, ay] = c[k];
    const [bx, by] = c[(k + 1) % 6];
    return new THREE.Vector3(ax + (bx - ax) * f, ay + (by - ay) * f, 0);
  });
}

type TroikaText = { fillOpacity: number };

function CoreLabel({ lines }: { lines: { current: Array<TroikaText | null> } }) {
  const t = useT();
  return (
    <group position={[0, 0, -0.08]}>
      <Text
        ref={(el: TroikaText | null) => void (lines.current[0] = el)}
        font={FONTS.title}
        fontSize={0.3}
        letterSpacing={0.04}
        color={NEON}
        anchorX="center"
        anchorY="middle"
        position={[0, -0.3, 0]}
      >
        {t.cyberHud.firewall}
      </Text>
      <Text
        ref={(el: TroikaText | null) => void (lines.current[1] = el)}
        font={FONTS.label}
        fontSize={0.17}
        letterSpacing={0.12}
        color={NEON}
        anchorX="center"
        anchorY="middle"
        position={[0, -0.58, 0]}
      >
        {t.cyberHud.active}
      </Text>
    </group>
  );
}

/** The protruding FIREWALL ACTIVE shield at the heart of the wall. It
 *  flickers on like a fluorescent tube when the power sweep reaches it, braces
 *  on every hit, and flashes and pops with each shockwave it throws. */
export function CoreShield() {
  const { u, state, still } = useSim();
  const lightRef = useRef<THREE.PointLight>(null);
  const body = useRef<THREE.Group>(null);
  const lines = useRef<Array<TroikaText | null>>([]);

  const parts = useMemo(() => {
    const steel = new THREE.MeshStandardMaterial({ color: "#d3dbe4", metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: "#5b6673", metalness: 1, roughness: 0.4, envMapIntensity: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: "#040a13", metalness: 0.5, roughness: 0.32, envMapIntensity: 0.9 });
    const neon = new THREE.MeshBasicMaterial({ color: NEON.clone(), toneMapped: false });
    const rim = new THREE.MeshBasicMaterial({ color: NEON.clone().multiplyScalar(0.8), toneMapped: false });
    const led = new THREE.MeshBasicMaterial({ color: hdr(1.6, 2.2, 2.4), toneMapped: false });

    const markTex = toTexture(drawCoreMark(), { flipY: false });
    const mark = createGlyphMaterial(markTex, 0, hdr(0.35, 1.7, 1.9), 1, 0.55);

    const leds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.017, 8, 6), led, LED_COUNT);
    perimeter((R + INNER) / 2 + 0.02, LED_COUNT).forEach((p, i) => {
      leds.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, 0.012));
    });
    const bolts = new THREE.InstancedMesh(nutGeometry(0.035), steel, 6);
    hexCorners((R + INNER) / 2, true).forEach(([x, y], i) => {
      bolts.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x * 0.93, y * 0.93, 0.02));
    });

    return {
      materials: [steel, darkSteel, glass, neon, rim, led, mark],
      textures: [markTex],
      frame: new THREE.Mesh(hexFrameGeometry({ outer: R, inner: INNER, depth: 0.36, bevel: 0.07, bevelDepth: 0.08, pointy: true, segments: 3 }), steel),
      step: new THREE.Mesh(hexFrameGeometry({ outer: INNER + 0.02, inner: INNER - 0.06, depth: 0.1, bevel: 0.015, bevelDepth: 0.015, pointy: true }), darkSteel),
      face: new THREE.Mesh(hexFaceGeometry(INNER, true), glass),
      neonInner: new THREE.Mesh(hexLineGeometry(INNER - 0.075, 0.022, true), neon),
      neonOuter: new THREE.Mesh(hexLineGeometry(R + 0.012, 0.03, true), rim),
      mark: new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), mark),
      leds,
      bolts,
    };
  }, []);

  useEffect(
    () => () => {
      parts.materials.forEach((m) => m.dispose());
      parts.textures.forEach((t) => t.dispose());
      [parts.frame, parts.step, parts.face, parts.neonInner, parts.neonOuter, parts.mark, parts.leds, parts.bolts].forEach((m) => m.geometry.dispose());
    },
    [parts],
  );

  useFrame(() => {
    const t = state.time;
    // power: dark until the sweep reaches the core, then a fluorescent stutter, then steady
    const since = sinceBoot(state, still);
    const front = u.uBoot.value;
    const lit = front < 0.3 ? 0 : front > 6 || since > 1e3 ? 1 : cyHash(Math.floor(t * 24)) > 0.45 ? 1 : 0.12;
    const pulse = state.defense * Math.exp(-(t - state.pulseAt) * 5);
    const heat = Math.max(...u.uImpacts.value.map((v) => v.w));
    const breathe = 0.5 + 0.5 * Math.sin(t * 2.2);
    const glow = (1 + state.defense * 0.7 + heat * 0.12 * breathe + pulse * 2.5) * lit;
    (parts.neonInner.material as THREE.MeshBasicMaterial).color.copy(NEON).multiplyScalar(glow);
    (parts.neonOuter.material as THREE.MeshBasicMaterial).color.copy(NEON).multiplyScalar(0.8 * lit * (1 + pulse));
    (parts.leds.material as THREE.MeshBasicMaterial).color.setRGB(1.6 * lit, 2.2 * lit, 2.4 * lit);
    (parts.mark.material as THREE.ShaderMaterial).uniforms.uAlpha.value = (0.9 + 0.1 * breathe + state.defense * 0.25 + pulse) * lit;
    for (const line of lines.current) if (line) line.fillOpacity = lit;
    if (lightRef.current) lightRef.current.intensity = (3 + glow * 3.5) * lit;
    // brace against hits, punch outward with each shockwave
    body.current?.scale.setScalar(1 - 0.02 * state.hit + 0.035 * pulse);
  });

  return (
    <group rotation-y={WALL.yaw}>
      <group ref={body} position={[0, WALL.coreY, WALL.coreLift]}>
        <primitive object={parts.frame} />
        <primitive object={parts.step} position-z={-0.03} />
        <primitive object={parts.face} position-z={-0.1} />
        <primitive object={parts.neonInner} position-z={-0.028} />
        <primitive object={parts.neonOuter} position-z={-0.3} />
        <primitive object={parts.leds} />
        <primitive object={parts.bolts} />
        <primitive object={parts.mark} position={[0, 0.3, -0.085]} />
        <Suspense fallback={null}>
          <CoreLabel lines={lines} />
        </Suspense>
        <pointLight ref={lightRef} color="#3fdcff" distance={7} decay={2} position={[-1.1, 1.3, 1.6]} />
      </group>
    </group>
  );
}
