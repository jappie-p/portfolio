"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  Environment,
  Html,
  Lightformer,
  PerformanceMonitor,
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  SMAA,
  ToneMapping,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { fitDistance, orbit } from "./fit";
import { OVERVIEW } from "./layout";
import { loadRoom } from "./baked";
import { LookEffect } from "./look";
import { kindOf, numberOf } from "./stories";
import type { Kind, RoomModel, StoryId } from "./types";
import r from "./room.module.css";

const MIN_DPR = 1;
/** How far right of the middle the room stands on a wide panel, and how
 *  far left an opened piece stands (NDC). */
const SHIFT = 0.3;
const OPEN_SHIFT = 0.32;
/** On a narrow screen: how far down the room stands under the copy, and how
 *  far up an opened piece rises above its sheet (NDC). */
const NARROW_DOWN = 0.36;
const NARROW_OPEN_UP = 0.5;

export type RoomCanvasProps = {
  /** the render loop runs only while the panel is on screen */
  active: boolean;
  /** reduced motion: one still frame, no drifting camera */
  still: boolean;
  filter: Kind | "alles";
  selected: StoryId | null;
  onSelect: (id: StoryId | null) => void;
  /** each pin's label, in the reader's language */
  labels: Record<StoryId, string>;
  onReady: () => void;
};

/** The piece a pointer event landed on, from the mesh up. */
function pieceOf(o: THREE.Object3D | null): StoryId | null {
  for (let x = o; x; x = x.parent)
    if (x.userData.story) return x.userData.story as StoryId;
  return null;
}

const damp = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

type RoomProps = Omit<RoomCanvasProps, "active">;

/** The baked room, once it has loaded (scripts/room bakes it). */
function Room(props: RoomProps) {
  const gl = useThree((s) => s.gl);
  const [room, setRoom] = useState<RoomModel | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    let model: RoomModel | null = null;
    loadRoom(gl, ac.signal)
      .then((m) => {
        if (ac.signal.aborted) return m.dispose();
        model = m;
        setRoom(m);
      })
      .catch((e) => {
        if (!ac.signal.aborted) console.error(e);
      });
    return () => {
      ac.abort();
      model?.dispose();
    };
  }, [gl]);
  return room ? <RoomScene room={room} {...props} /> : null;
}

function RoomScene({
  room,
  still,
  filter,
  selected,
  onSelect,
  labels,
  onReady,
}: RoomProps & { room: RoomModel }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useEffect(
    () => room.pieces.forEach((p) => (p.group.userData.story = p.id)),
    [room],
  );
  // the room stays hidden until every program it needs has compiled off the
  // main thread (KHR_parallel_shader_compile): compiling them on its first
  // frame would block the page for a long moment, and stall a scroll under way
  const [shown, setShown] = useState(false);
  const root = useRef<THREE.Group>(null);
  useEffect(() => {
    let live = true;
    const r = root.current;
    if (!r) return;
    r.visible = true;
    gl.compileAsync(scene, camera)
      .catch(() => {})
      .then(() => {
        if (live) setShown(true);
      });
    r.visible = false;
    return () => {
      live = false;
    };
  }, [gl, scene, camera, room]);
  const [hover, setHover] = useState<StoryId | null>(null);

  const look = useRef(new THREE.Vector3(...OVERVIEW.target));
  const goal = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      base: new THREE.Vector3(...OVERVIEW.target),
    }),
    [],
  );
  // how far back the overview stands: the whole room between the copy, the
  // header and the filter (on a narrow screen, across the width under the copy)
  const distance = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const h = Math.max(size.height, 1);
    return aspect < 1.1
      ? fitDistance(aspect, { left: -1.02, right: 1.02, bottom: -0.98, top: 0.42 }, { x: 0, y: -NARROW_DOWN })
      : fitDistance(aspect, { left: -0.38, right: 0.96, bottom: -1 + 210 / h, top: 1 - 170 / h }, { x: SHIFT, y: 0 });
  }, [size.width, size.height]);
  const ready = useRef(0);
  const lens = useRef(-SHIFT);
  const lensY = useRef(0);
  const first = useRef(true);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    const aspect = size.width / Math.max(size.height, 1);
    const open = selected
      ? room.pieces.find((p) => p.id === selected)
      : undefined;
    if (open) {
      goal.look.copy(open.view.target);
      // a tall narrow view takes in less across: stand back further, so the
      // piece fits its width as it fits a wide one
      const back = aspect < 1.1 ? THREE.MathUtils.clamp(0.95 / aspect, 1, 2.1) : 1;
      goal.pos.copy(open.view.offset).multiplyScalar(back).add(open.view.target);
    } else {
      const px = still ? 0 : state.pointer.x;
      const py = still ? 0 : state.pointer.y;
      // the head turns a little with the pointer, and breathes
      const breath = still ? 0 : Math.sin(time * 0.21) * 0.012;
      goal.look.copy(goal.base);
      orbit(
        goal.base,
        OVERVIEW.azimuth + px * 0.07 + breath,
        OVERVIEW.elevation - py * 0.035,
        distance,
        goal.pos,
      );
    }
    if (first.current) {
      // the first time: high and far back, gliding down into the room
      if (still) camera.position.copy(goal.pos);
      else
        orbit(
          goal.base,
          OVERVIEW.azimuth - 0.35,
          OVERVIEW.elevation + 0.22,
          distance * 1.35,
          camera.position,
        );
      look.current.copy(goal.look);
      first.current = false;
    }
    const k = damp(dt, open ? 2.6 : 2.2);
    camera.position.lerp(goal.pos, k);
    look.current.lerp(goal.look, k);
    camera.lookAt(look.current);
    // an opened piece may ask for its own lens; the change eases in with the move
    const fov = open?.view.fov ?? OVERVIEW.fov;
    camera.fov += (fov - camera.fov) * k;
    camera.updateProjectionMatrix();
    // on a wide panel the room stands right of the copy: shift the lens, not
    // the camera, so the room keeps its angle (none once a story is open)
    // (and with a story open, the piece stands left of the middle, clear of
    // its card; on a narrow screen the card rises from below instead)
    const toward = aspect < 1.1 ? 0 : open ? OPEN_SHIFT : -SHIFT;
    lens.current += (toward - lens.current) * k;
    camera.projectionMatrix.elements[8] = lens.current;
    // on a narrow screen the room fills the panel top to bottom: it stands
    // low, under the copy, and an opened piece rises into the top half,
    // above the story's sheet
    const up = aspect < 1.1 ? (open ? -NARROW_OPEN_UP : NARROW_DOWN) : 0;
    lensY.current += (up - lensY.current) * k;
    camera.projectionMatrix.elements[9] = lensY.current;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    // hover lights a piece up; a filter (or another story open) mutes the rest
    const kg = damp(dt, 8);
    const km = damp(dt, 5);
    for (const p of room.pieces) {
      const tone = room.tones[p.id];
      // (a piece already open only keeps a hint of it: up close the full glow
      // would wash its dark parts out)
      const lit =
        hover === p.id && selected !== p.id ? 1 : selected === p.id ? 0.22 : 0;
      const muted =
        (filter !== "alles" && kindOf(p.id) !== filter ? 1 : 0) ||
        (selected && selected !== p.id ? 0.7 : 0);
      tone.uGlow.value += (lit - tone.uGlow.value) * kg;
      tone.uMute.value += (muted - tone.uMute.value) * km;
      p.update?.(time, dt);
    }
    room.props.forEach((p) => p.update?.(time, dt));
    if (shown && ready.current < 3 && ++ready.current === 3) onReady();
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const id = pieceOf(e.object);
    setHover(id);
    document.body.style.cursor = id ? "pointer" : "";
  };
  const out = () => {
    setHover(null);
    document.body.style.cursor = "";
  };
  useEffect(() => () => void (document.body.style.cursor = ""), []);

  return (
    <>
      {/* the light is baked into the room; the environment is only what
          its glossy parts and glass reflect */}
      <Environment resolution={256} frames={1} environmentIntensity={0.55}>
        {/* a warm ceiling, the window's daylight, and a soft fill from the front */}
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#fff1df"
          position={[2.6, 6, 2]}
          rotation-x={Math.PI / 2}
          scale={[10, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          color="#fff6e8"
          position={[3.5, 2, -4]}
          scale={[3, 2, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.8}
          color="#ffe2c2"
          position={[-2, 2.5, 8]}
          rotation-y={-0.4}
          scale={[8, 4, 1]}
        />
      </Environment>
      <group ref={root} visible={shown}>
        {room.props.map((p, i) => (
          <primitive key={i} object={p.group} />
        ))}
        <group
          onPointerOver={over}
          onPointerMove={over}
          onPointerOut={out}
          onClick={(e) => {
            e.stopPropagation();
            const id = pieceOf(e.object);
            if (id) onSelect(id === selected ? null : id);
          }}
        >
          {room.pieces.map((p) => (
            <primitive key={p.id} object={p.group} />
          ))}
        </group>
      </group>
      {shown &&
        room.pieces.map((p) => {
          const muted = filter !== "alles" && kindOf(p.id) !== filter;
          // with a story open only its own pin stays
          const away = selected !== null && selected !== p.id;
          return (
            <Html key={p.id} position={p.pin} center zIndexRange={[30, 10]}>
              <button
                type="button"
                className={r.pin}
                style={{ animationDelay: `${1 + numberOf(p.id) * 0.09}s` }}
                data-muted={muted || undefined}
                data-away={away || undefined}
                tabIndex={away ? -1 : undefined}
                data-open={selected === p.id || undefined}
                aria-pressed={selected === p.id}
                // the pin has a React root of its own, under the canvas'
                // listeners: the click stops here, or the room would take it as a
                // click on the piece too and close what it just opened
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(selected === p.id ? null : p.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onPointerEnter={() => setHover(p.id)}
                onPointerLeave={() => setHover(null)}
              >
                <span className={r.num}>
                  {String(numberOf(p.id)).padStart(2, "0")}
                </span>
                <span className={r.label}>{labels[p.id]}</span>
              </button>
            </Html>
          );
        })}
    </>
  );
}

/**
 * My room as a live diorama: modelled and lit in Blender, its light (sun,
 * bounce, soft shadows) baked into its textures, so it looks rendered and
 * runs light; a glow on what gives off light of its own. Every piece with a story has a
 * pin; pointing at a piece lights it up, opening it moves the camera in.
 */
export function RoomCanvas({ active, ...room }: RoomCanvasProps) {
  const [screen] = useState(() => window.devicePixelRatio || 1);
  const maxDpr = Math.max(MIN_DPR, Math.min(screen, 1.5));
  const [dpr, setDpr] = useState(maxDpr);
  const grade = useMemo(() => new LookEffect(), []);
  useEffect(() => () => grade.dispose(), [grade]);
  return (
    <Canvas
      className={r.canvas}
      frameloop={room.still ? "demand" : active ? "always" : "never"}
      dpr={dpr}
      flat
      gl={{
        antialias: false,
        alpha: true,
        stencil: false,
        powerPreference: "high-performance",
      }}
      camera={{ fov: OVERVIEW.fov, near: 0.1, far: 60, position: [-3, 7, 11] }}
      onPointerMissed={() => room.selected && room.onSelect(null)}
    >
      {!room.still && (
        <PerformanceMonitor
          factor={1}
          step={0.25}
          flipflops={3}
          onChange={({ factor }) =>
            setDpr(Math.round((MIN_DPR + (maxDpr - MIN_DPR) * factor) * 4) / 4)
          }
        />
      )}
      <Room {...room} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          mipmapBlur
          luminanceThreshold={1}
          luminanceSmoothing={0.2}
          intensity={0.55}
        />
        {/* AgX with its Medium High Contrast look, as Blender rendered the bake */}
        <primitive object={grade} />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  );
}
