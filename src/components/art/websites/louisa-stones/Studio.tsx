"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";

type V3 = [number, number, number];

interface Panel {
  at: V3;
  size: V3;
  intensity: number;
}

/**
 * The lights, as seen from the stones (y up, the camera toward +z). A large
 * key overhead, a little toward the camera: the big soft highlight on every
 * polished stone, the labradorite's flash. A rim from high behind on the
 * left, and a long softbox low behind: the light that shines through the
 * agate and the crystals. A hard strip on the right for edge lines, a card
 * by the camera, one small hard light and thin strips for the facets to
 * catch; everything else dark. Big sources matter: a crystal only looks
 * alive when much of what it refracts is light.
 */
const PANELS: Panel[] = [
  { at: [0, 8.5, 2.5], size: [12, 8, 1], intensity: 4.5 },
  { at: [-6, 6, -7], size: [9, 6, 1], intensity: 7 },
  { at: [1, 2.8, -9.5], size: [15, 4, 1], intensity: 4 },
  { at: [8, 4, -3], size: [0.9, 9, 1], intensity: 6 },
  { at: [-8.5, 3, 1], size: [3, 7, 1], intensity: 1 },
  { at: [3, 3, 8], size: [8, 5, 1], intensity: 0.8 },
  { at: [-3, 6.5, 6], size: [1.1, 1.1, 1], intensity: 16 },
  { at: [-2.5, 8.5, -3], size: [0.35, 5, 1], intensity: 9 },
  { at: [4.5, 7.5, -5], size: [0.35, 6, 1], intensity: 8 },
  { at: [-9, 5.5, -2], size: [0.4, 4, 1], intensity: 6 },
  { at: [6, 6, 3], size: [0.3, 3, 1], intensity: 6 },
  // small hot cards high around: more for facets and edges to catch
  { at: [-6.5, 6, 4.5], size: [1.4, 1, 1], intensity: 7 },
  { at: [5.5, 7.5, -1], size: [1.2, 1.2, 1], intensity: 8 },
  { at: [2, 9.5, 3], size: [1.6, 0.8, 1], intensity: 6 },
  { at: [-1, 5, -8.5], size: [2, 1, 1], intensity: 9 },
];

/** The slate's sheen at grazing angles: the lights behind, glancing off the
 *  table far back (what a crystal sees looking down through itself). */
const SHEEN: Panel[] = [
  { at: [1, -2.45, -11], size: [16, 8, 1], intensity: 0.35 },
  { at: [-7, -2.45, -7], size: [9, 9, 1], intensity: 0.22 },
];

const FLOOR = 40;
/** the main slate tiles every 25 cm (its texture repeats 12 times) */
const TILE = 25 * 12;

/** The table under the stones: the slate's grain, in its pool of light. */
function useFloor(pool: number) {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(FLOOR, FLOOR, 32, 32);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i)) / (FLOOR / 2);
      const v = pool + (1 - pool) * Math.exp(-r * r * 3.5);
      colors.push(v, v, v);
      uv.setXY(i, (uv.getX(i) * FLOOR) / TILE, (uv.getY(i) * FLOOR) / TILE);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [pool]);
}

/**
 * The studio, baked once into a cube, with the slate below it: refraction
 * only ever sees this cube, so a clear crystal looks down through itself
 * onto the grain of the slate, as it would on the table. All neutral white:
 * coloured light would tint every polished surface and give the game away.
 */
export function Studio({ face, slate, resolution }: { face: THREE.Texture; slate: THREE.Texture; resolution: number }) {
  const floor = useFloor(0.12);
  return (
    <Environment frames={1} resolution={resolution} background={false}>
      <color attach="background" args={["#0c0c0c"]} />
      {PANELS.map((p, i) => (
        <Lightformer key={i} form="rect" map={face} intensity={p.intensity} position={p.at} scale={p.size} />
      ))}
      <mesh geometry={floor} position={[0, -2.5, 0]} rotation-x={-Math.PI / 2}>
        <meshBasicMaterial map={slate} vertexColors color="#383839" toneMapped={false} />
      </mesh>
      {SHEEN.map((p, i) => (
        <Lightformer key={i} form="rect" map={face} intensity={p.intensity} position={p.at} scale={p.size} rotation={[-Math.PI / 2, 0, 0]} />
      ))}
    </Environment>
  );
}
