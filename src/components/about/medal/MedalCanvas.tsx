"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

/** The medal's turned profile, from its middle out over the raised rim and
 *  back (radius, height): turned about y, then stood up to face you. */
const PROFILE: [number, number][] = [
  [0, 0.05],
  [0.79, 0.05],
  [0.82, 0.075],
  [0.9, 0.11],
  [0.96, 0.105],
  [0.995, 0.07],
  [1, 0],
  [0.995, -0.07],
  [0.96, -0.105],
  [0.9, -0.11],
  [0.82, -0.075],
  [0.79, -0.05],
  [0, -0.05],
];

/** A leaf, its tip up: the emblem struck into the face. */
function leaf() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(0.44, -0.24, 0.4, 0.3, 0, 0.6);
  s.bezierCurveTo(-0.4, 0.3, -0.44, -0.24, 0, -0.5);
  return s;
}

/** The ribbon's weave: deep green, a thin gold line along each edge. */
function ribbon() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 8;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f4a32";
  g.fillRect(0, 0, 64, 8);
  g.fillStyle = "#c9a24a";
  g.fillRect(6, 0, 3, 8);
  g.fillRect(55, 0, 3, 8);
  g.fillStyle = "rgba(255,255,255,0.06)";
  for (let x = 0; x < 64; x += 2) g.fillRect(x, 0, 1, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** How it lies at rest: tipped back on the desk, turned a little to the left. */
const REST = { x: -0.42, y: -0.28 };

function Medal({ still, pointer }: { still: boolean; pointer: { current: { x: number; y: number } } }) {
  const tilt = useRef<THREE.Group>(null);
  const made = useMemo(() => {
    const body = new THREE.LatheGeometry(
      PROFILE.map(([r, h]) => new THREE.Vector2(r, h)),
      128,
    ).rotateX(Math.PI / 2);
    const emblem = new THREE.ExtrudeGeometry(leaf(), { depth: 0.035, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 4, curveSegments: 32 });
    const weave = ribbon();
    return { body, emblem, weave };
  }, []);
  useEffect(
    () => () => {
      made.body.dispose();
      made.emblem.dispose();
      made.weave.dispose();
    },
    [made],
  );

  useFrame((state, delta) => {
    const g = tilt.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const k = 1 - Math.exp(-Math.min(delta, 1 / 20) * 3.5);
    const x = REST.x + (still ? 0 : -pointer.current.y * 0.22 + Math.sin(t * 0.55) * 0.03);
    const y = REST.y + (still ? 0 : pointer.current.x * 0.4 + Math.sin(t * 0.4) * 0.05);
    g.rotation.x += (x - g.rotation.x) * k;
    g.rotation.y += (y - g.rotation.y) * k;
  });

  return (
    <group ref={tilt} rotation={[REST.x, REST.y, 0]} position={[0.1, -0.42, 0]} scale={0.86}>
      {/* the ribbon, rising in a V from the loop out of the picture */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.3, 2.3, -0.06 - (side + 1) * 0.01]} rotation={[0, 0, -side * 0.2]}>
          <planeGeometry args={[0.62, 2.7]} />
          <meshPhysicalMaterial map={made.weave} roughness={0.75} sheen={1} sheenRoughness={0.5} sheenColor="#6f9c7c" side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* the loop it hangs from */}
      <mesh position={[0, 1.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.12, 0.035, 16, 48]} />
        <meshPhysicalMaterial color="#b07a45" metalness={1} roughness={0.3} />
      </mesh>
      {/* the medal: bronze, warm and a little worn */}
      <mesh geometry={made.body}>
        <meshPhysicalMaterial color="#b07a45" metalness={1} roughness={0.34} clearcoat={0.35} clearcoatRoughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[0.7, 0.012, 8, 128]} />
        <meshPhysicalMaterial color="#c58b52" metalness={1} roughness={0.25} />
      </mesh>
      <group position={[0.02, -0.02, 0.05]} rotation={[0, 0, -0.32]} scale={0.95}>
        <mesh geometry={made.emblem}>
          <meshPhysicalMaterial color="#c99158" metalness={1} roughness={0.22} clearcoat={0.5} />
        </mesh>
        {/* its midrib and stem */}
        <mesh position={[0, -0.04, 0.112]}>
          <boxGeometry args={[0.02, 0.92, 0.014]} />
          <meshPhysicalMaterial color="#8a5a2e" metalness={1} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * A small bronze medal on a green ribbon, live: it tilts toward the pointer
 * and the window light runs over its rim. Its own little canvas, drawn only
 * while it is on screen; one still frame with reduced motion.
 */
export function MedalCanvas({ active, still }: { active: boolean; still: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (still) return;
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);
  return (
    <Canvas
      frameloop={still ? "demand" : active ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0.3, 5.4], fov: 32 }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffe2bd" />
      {/* what the bronze reflects: the window up at the right, the warm room
          behind the camera (a flat face looks straight back at it), a dark
          floor so the rim keeps its contrast */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} color="#fff1dc" position={[4, 4, 2]} rotation-y={-0.9} scale={[3, 5, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#e9b679" position={[0, 1.5, 7]} rotation-y={Math.PI} scale={[9, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffd29a" position={[-5, 0, 2]} rotation-y={1.1} scale={[3, 4, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[1.5, 5, 5]} scale={1.6} />
        <Lightformer form="rect" intensity={1.8} color="#ffe6c4" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[8, 6, 1]} />
      </Environment>
      <Medal still={still} pointer={pointer} />
    </Canvas>
  );
}
