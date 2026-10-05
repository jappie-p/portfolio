import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../../lib/rng";
import { pebbleGeometry } from "../geometry/pebble";
import { mergePoints, quartzPoint, type Placed } from "../geometry/quartz";
import { sliceDepth, sliceGeometry, sliceOutline } from "../geometry/slice";

/** Set geometries down on the table together: the lowest point at y = 0,
 *  centred over the origin. */
function rest(...geos: THREE.BufferGeometry[]) {
  const box = new THREE.Box3();
  for (const g of geos) {
    g.computeBoundingBox();
    box.union(g.boundingBox!);
  }
  const c = box.getCenter(new THREE.Vector3());
  for (const g of geos) {
    g.translate(-c.x, -box.min.y, -c.z);
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
}

export interface ClusterParts {
  matrix: THREE.BufferGeometry;
  crystals: THREE.BufferGeometry;
}

/** Amethyst: milky quartz at the foot, violet through the body, the colour
 *  thinning out toward the very tip. (The depth of the violet comes from the
 *  length of stone light crosses: see the crystal material.) */
const MILK = new THREE.Color(0.97, 0.96, 0.99);
const VIOLET = new THREE.Color(0.72, 0.48, 1.0);
const LILAC = new THREE.Color(0.9, 0.8, 1.0);
const smooth = THREE.MathUtils.smoothstep;

function amethystAt(h: number, strength: number) {
  const body = MILK.clone().lerp(VIOLET, (0.35 + 0.65 * smooth(h, 0, 0.35)) * strength);
  return body.lerp(LILAC, smooth(h, 0.85, 1) * 0.45);
}

/**
 * A piece of geode: a rough shell with a carpet of amethyst points over its
 * top, packed edge to edge (golden-angle spacing), short and tip-heavy the
 * way geode amethyst grows, bigger toward the middle, each leaning out from
 * where it grew and half buried in its neighbours.
 */
export function* buildCluster(seed: number, scale: number, count: number): Generator<void, ClusterParts> {
  const rnd = mulberry32(seed);
  const a = 4 * scale;
  const b = 1.2 * scale;
  const c = 3 * scale;
  const matrix = yield* pebbleGeometry({ seed, size: [a, b, c], cuts: 7, depth: [0.6, 0.88], round: 0.2 * scale, lumps: 0.16, grit: 0.12 * scale, floor: 0.45, detail: 40 });
  const points: Placed[] = [];
  const strength: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 8 === 7) yield;
    const r = Math.sqrt((i + 0.5) / count) * 0.98;
    const ang = i * 2.39996 + rnd() * 0.4;
    const x = Math.cos(ang) * r * a;
    const z = Math.sin(ang) * r * c;
    const top = b * Math.sqrt(Math.max(0, 1 - r * r));
    const radius = scale * (0.2 + 0.36 * rnd() ** 1.5) * (1.2 - 0.55 * r);
    const length = radius * (1.7 + 1.5 * rnd());
    const out = new THREE.Vector3(x / (a * a), top / (b * b), z / (c * c)).normalize();
    const dir = out.add(new THREE.Vector3((rnd() - 0.5) * 0.7, 0.6, (rnd() - 0.5) * 0.7)).normalize();
    const mesh = quartzPoint(rnd, { length, radius, uneven: 0.4, zface: 0.16, wear: radius > 0.3 * scale ? radius * 0.05 : 0, base: -length * 0.5, taper: 0.02, steps: rnd() < 0.3 ? 1 : 0 });
    // zone from where the point leaves the rock (0) to its apex (1)
    const from = length * 0.42;
    mesh.height = mesh.height.map((_, j) => Math.max(0, (mesh.position[j * 3 + 1] - from) / (length - from)));
    points.push({ mesh, at: new THREE.Vector3(x, top - from, z), dir, roll: rnd() * Math.PI * 2 });
    strength.push(0.6 + rnd() * 0.4);
  }
  yield;
  const crystals = mergePoints(points, (h, k) => amethystAt(h, strength[k]));
  rest(matrix, crystals);
  return { matrix, crystals };
}

/** Roll a point lying along +x about its axis until its broadest face
 *  toward the table lies flat on it. */
function lieDown(geo: THREE.BufferGeometry) {
  geo.rotateZ(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const faces = new Map<string, { n: THREE.Vector3; area: number }>();
  const tri = new THREE.Triangle();
  for (let i = 0; i < pos.count; i += 3) {
    const n = new THREE.Vector3().fromBufferAttribute(nor, i);
    if (Math.abs(n.x) > 0.08 || n.y > -0.5) continue;
    tri.setFromAttributeAndIndices(pos, i, i + 1, i + 2);
    const key = `${n.y.toFixed(3)},${n.z.toFixed(3)}`;
    const f = faces.get(key) ?? { n, area: 0 };
    f.area += tri.getArea();
    faces.set(key, f);
  }
  const down = [...faces.values()].sort((p, q) => q.area - p.area)[0]?.n ?? new THREE.Vector3(0, -1, 0);
  geo.rotateX(Math.atan2(down.z, -down.y));
}

/** A clear point: standing on its polished foot as shops display them, or
 *  lying loose on its side, tip to +x, its foot snapped off the cluster it
 *  grew in (milky, see aZone) and a growth step or two on its faces. */
export function buildPoint(seed: number, length: number, radius: number, lying: boolean): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const spec = { length, radius, uneven: 0.45, zface: 0.12, wear: radius * 0.05, base: 0, taper: 0.035 };
  const { position, normal, height } = quartzPoint(rnd, lying ? { ...spec, broken: 2, steps: 1 } : spec);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute("aZone", new THREE.Float32BufferAttribute(height, 1));
  if (lying) lieDown(geo);
  // the c axis, after any turn (custom attributes do not turn with the mesh)
  geo.setAttribute("aAxis", new THREE.Float32BufferAttribute(height.flatMap(() => (lying ? [1, 0, 0] : [0, 1, 0])), 3));
  const crystal = mergeVertices(geo);
  geo.dispose();
  rest(crystal);
  return crystal;
}

export interface PebbleKind {
  size: [number, number, number];
  cuts: number;
  depth: [number, number];
  round: number;
  lumps: number;
}

/** A labradorite palm stone: broad, low, softly domed. */
export const PALM: PebbleKind = { size: [3.3, 1.25, 2.5], cuts: 6, depth: [0.66, 0.9], round: 0.5, lumps: 0.08 };
/** A tumbled rose quartz: a rounded chunk with its broken faces worn soft. */
export const TUMBLED: PebbleKind = { size: [2.2, 1.5, 1.8], cuts: 9, depth: [0.56, 0.84], round: 0.3, lumps: 0.06 };

export function* buildPebble(seed: number, kind: PebbleKind, scale: number, thickness: boolean): Generator<void, THREE.BufferGeometry> {
  const size: [number, number, number] = [kind.size[0] * scale, kind.size[1] * scale, kind.size[2] * scale];
  const geo = yield* pebbleGeometry({ seed, ...kind, size, round: kind.round * scale, detail: 32, thickness });
  rest(geo);
  return geo;
}

export interface SliceParts {
  slice: THREE.BufferGeometry;
  stand: THREE.BufferGeometry;
  outline: THREE.Vector2[];
  /** the face's extent (min x, min y, width, height) and deepest band, cm */
  bounds: THREE.Vector4;
  depth: number;
  /** how the slice stands in its stand */
  pose: { y: number; lean: number };
}

/** An agate slice standing a little reclined in a low black stand. */
export function buildSlice(seed: number, rx: number, ry: number, thickness: number): SliceParts {
  const outline = sliceOutline(seed, rx, ry);
  const slice = sliceGeometry(outline, thickness);
  const box = new THREE.Box2().setFromPoints(outline);
  const stand = new RoundedBoxGeometry(rx * 0.7, 0.9, 1.9, 3, 0.15);
  stand.translate(0, 0.45, 0);
  return {
    slice,
    stand,
    outline,
    bounds: new THREE.Vector4(box.min.x, box.min.y, box.max.x - box.min.x, box.max.y - box.min.y),
    depth: sliceDepth(outline),
    pose: { y: -box.min.y + 0.35, lean: 0.14 },
  };
}
