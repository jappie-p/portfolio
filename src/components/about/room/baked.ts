import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { BASE_PATH } from "@/data/site";
import { tone, toned } from "./tone";
import { STORIES } from "./stories";
import type { Piece, Prop, RoomModel, StoryId, Tone } from "./types";

/** Where the baked room is (scripts/room writes it). */
export const ROOM_URL = `${BASE_PATH}/room/room.glb`;

type Extras = { story?: string; kind?: "matte" | "gloss" | "cutout" | "live"; scale?: number; tint?: number[]; offset?: number[]; fov?: number };

/**
 * A baked group's material: its atlas holds the light already (diffuse,
 * bounce, shadow, stored at `scale`), so it is drawn as is; a glossy group
 * adds live reflections of the room's environment on top.
 */
function bakedMaterial(src: THREE.MeshStandardMaterial, x: Extras, t: Tone): THREE.Material {
  const k = 1 / (x.scale ?? 1);
  const map = src.map;
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  if (x.kind === "gloss") {
    const metal = src.metalness;
    const tint = x.tint ? new THREE.Color(...(x.tint as [number, number, number])) : new THREE.Color(0.8, 0.8, 0.8);
    return toned(
      new THREE.MeshStandardMaterial({
        color: metal > 0.5 ? tint : new THREE.Color(0, 0, 0),
        metalness: metal,
        roughness: src.roughness,
        emissive: new THREE.Color(k, k, k),
        emissiveMap: map,
        envMapIntensity: 0.9,
      }),
      t,
    );
  }
  return toned(
    new THREE.MeshBasicMaterial({
      map,
      color: new THREE.Color(k, k, k),
      alphaTest: x.kind === "cutout" ? 0.5 : 0,
      side: x.kind === "cutout" ? THREE.DoubleSide : THREE.FrontSide,
    }),
    t,
  );
}

/**
 * Glass, as a thin film over what is behind it: the panes are flat, so
 * three's transmission would draw the whole room again every frame for a
 * refraction nobody sees (and a double-sided pane would sample its own
 * target). It keeps the pane's tint and opacity and reflects the room.
 */
function glassFilm(src: THREE.MeshPhysicalMaterial, t: Tone): THREE.Material {
  return toned(
    new THREE.MeshStandardMaterial({
      color: src.color,
      roughness: src.roughness,
      metalness: 0,
      transparent: true,
      opacity: src.transparent ? src.opacity : 0.1,
      depthWrite: false,
      envMapIntensity: 1,
    }),
    t,
  );
}

/** The baked room, loaded: one group per story, everything else as props,
 *  pins and views from its markers. */
export async function loadRoom(gl: THREE.WebGLRenderer, signal?: AbortSignal): Promise<RoomModel> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf: GLTF = await loader.loadAsync(ROOM_URL);
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const tones = Object.fromEntries(STORIES.map((s) => [s.id, tone()])) as Record<StoryId, Tone>;
  const still = tone();
  const root = gltf.scene;
  root.updateMatrixWorld(true);

  const groups = Object.fromEntries(STORIES.map((s) => [s.id, new THREE.Group()])) as Record<StoryId, THREE.Group>;
  const rest = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) meshes.push(m);
  });
  for (const m of meshes) {
    const x = m.userData as Extras;
    const story = STORIES.find((s) => s.id === x.story)?.id;
    const t = story ? tones[story] : still;
    const src = m.material as THREE.MeshStandardMaterial;
    const glass = (src as THREE.MeshPhysicalMaterial).transmission > 0;
    if (x.kind && x.kind !== "live") m.material = bakedMaterial(src, x, t);
    else if (glass) m.material = glassFilm(src as THREE.MeshPhysicalMaterial, t);
    else m.material = toned(src, t);
    const mat = m.material as THREE.MeshBasicMaterial;
    if (mat.map) mat.map.anisotropy = anisotropy;
    if (src !== m.material) src.dispose();
    (story ? groups[story] : rest).attach(m);
  }

  // the small lights (named led_* in Blender) blink, each to its own beat:
  // most hold steady with a flicker of activity, a few pulse slowly
  const leds = meshes
    .filter((m) => m.name.startsWith("led_"))
    .map((m, i) => {
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      m.material = mat;
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      return { mat, base: mat.emissiveIntensity, phase: seed - Math.floor(seed), slow: i % 7 === 0 };
    });
  const blink = (time: number) => {
    for (const l of leds) {
      const t = time * (l.slow ? 0.6 : 7) + l.phase * 40;
      const on = l.slow ? 0.55 + 0.45 * Math.sin(t) : Math.sin(t) * Math.sin(t * 0.37 + l.phase * 9) > -0.55 ? 1 : 0.15;
      l.mat.emissiveIntensity = l.base * on;
    }
  };

  const world = (name: string) => root.getObjectByName(name)?.getWorldPosition(new THREE.Vector3());
  const pieces: Piece[] = STORIES.map(({ id }) => {
    const group = groups[id];
    const box = new THREE.Box3().setFromObject(group);
    const centre = box.isEmpty() ? new THREE.Vector3(2.6, 1, 1.8) : box.getCenter(new THREE.Vector3());
    const pin = world(`pin_${id}`) ?? new THREE.Vector3(centre.x, box.max.y + 0.15, centre.z);
    const marker = root.getObjectByName(`view_${id}`);
    const off = (marker?.userData as Extras | undefined)?.offset;
    const view = {
      target: world(`view_${id}`) ?? centre,
      offset: off ? new THREE.Vector3(off[0], off[1], off[2]) : new THREE.Vector3(-1.4, 0.8, 3.2),
      fov: (marker?.userData as Extras | undefined)?.fov,
    };
    return { id, group, pin, view, update: id === "homelab" && leds.length ? (time: number) => blink(time) : undefined };
  });
  const props: Prop[] = [{ group: rest }];
  return {
    pieces,
    props,
    tones,
    dispose() {
      for (const m of meshes) {
        m.geometry.dispose();
        const mat = m.material as THREE.MeshStandardMaterial;
        for (const tex of [mat.map, mat.emissiveMap, mat.alphaMap]) tex?.dispose();
        mat.dispose();
      }
    },
  };
}
