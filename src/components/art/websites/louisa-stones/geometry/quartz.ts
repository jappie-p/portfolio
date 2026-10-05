import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { convexSolid, type Plane } from "./convex";

/** One quartz point: a hexagonal prism under a rhombohedral tip. cm. */
export interface PointSpec {
  /** base to apex, along the c axis */
  length: number;
  /** mean distance from the axis to a prism face */
  radius: number;
  /** how unequal the six prism faces are (0..1) */
  uneven: number;
  /** how far the three small (z) tip faces stand back from the big (r)
   *  ones: real points end in three large faces and three small */
  zface: number;
  /** edge wear: the width of the rounded-off edges */
  wear: number;
  /** the base cut: below 0 it is buried, at 0 a flat polished foot */
  base?: number;
  /** how much the prism narrows toward the tip, radians */
  taper?: number;
  /** a broken foot instead of a flat one: this many fracture planes */
  broken?: number;
  /** growth steps: prism faces that turn in a little toward the tip */
  steps?: number;
}

/** Tag of the fracture faces of a broken foot. */
export const BROKEN = 1;

/** r faces tilt 51.8 degrees from the c axis (the quartz rhombohedron). */
const TIP = (51.8 * Math.PI) / 180;

/** Tip a unit vector by a small random angle: no face sits perfectly. */
function wobble(n: THREE.Vector3, rnd: () => number, amount: number) {
  const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(n).normalize();
  return n.applyAxisAngle(axis, (rnd() - 0.5) * 2 * amount).normalize();
}

/** The chamfer between two faces, `wear` in from their shared edge. */
function chamfer(a: Plane, b: Plane, wear: number): Plane {
  const s = a.n.clone().add(b.n);
  const len = s.length();
  return { n: s.normalize(), d: (a.d + b.d) / len - wear };
}

/**
 * The faces of a point along +y: six prism faces of unequal width, the tip's
 * three r and three z faces through (about) the apex, the base, and a small
 * chamfer on every edge so the edges catch light the way worn crystal does.
 */
export function pointPlanes(rnd: () => number, spec: PointSpec): Plane[] {
  const turn = rnd() * Math.PI;
  const prism: Plane[] = [];
  const tip: Plane[] = [];
  for (let k = 0; k < 6; k++) {
    const a = turn + (k * Math.PI) / 3;
    const lean = (spec.taper ?? 0) * (0.6 + rnd() * 0.8);
    const n = wobble(new THREE.Vector3(Math.cos(a) * Math.cos(lean), Math.sin(lean), Math.sin(a) * Math.cos(lean)), rnd, 0.012);
    prism.push({ n, d: spec.radius * (1 + (rnd() - 0.5) * spec.uneven) * Math.cos(lean) });
    const t = wobble(new THREE.Vector3(Math.sin(TIP) * Math.cos(a), Math.cos(TIP), Math.sin(TIP) * Math.sin(a)), rnd, 0.015);
    const back = k % 2 ? spec.zface * spec.radius : 0;
    tip.push({ n: t, d: t.y * spec.length + back + (rnd() - 0.5) * spec.radius * 0.04 });
  }
  const base = spec.base ?? 0;
  const planes = [...prism, ...tip, { n: new THREE.Vector3(0, -1, 0), d: -base }];
  // a foot snapped off the matrix: a few fracture planes at odd angles
  for (let k = 0; k < (spec.broken ?? 0); k++) {
    const n = new THREE.Vector3((rnd() - 0.5) * 0.6, -1, (rnd() - 0.5) * 0.6).normalize();
    const at = new THREE.Vector3((rnd() - 0.5) * spec.radius, base + spec.radius * (0.1 + rnd() * 0.35), (rnd() - 0.5) * spec.radius);
    planes.push({ n, d: n.dot(at), tag: BROKEN });
  }
  // growth steps: a prism face that bends in a few degrees partway up
  for (let k = 0; k < (spec.steps ?? 0); k++) {
    const face = prism[Math.floor(rnd() * 6)];
    const n = face.n.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0).cross(face.n).normalize(), -(0.04 + rnd() * 0.05)).normalize();
    const on = face.n.clone().multiplyScalar(face.d - spec.radius * 0.01).setY(spec.length * (0.35 + rnd() * 0.3));
    planes.push({ n, d: n.dot(on) });
  }
  for (let k = 0; k < 6 && spec.wear > 0; k++) {
    const w = spec.wear * (0.5 + rnd());
    planes.push(chamfer(prism[k], prism[(k + 1) % 6], w));
    planes.push(chamfer(prism[k], tip[k], w * 0.8));
    planes.push(chamfer(tip[k], tip[(k + 1) % 6], w * 0.7));
  }
  return planes;
}

export interface PointMesh {
  position: number[];
  normal: number[];
  /** 0 at the base to 1 at the apex, for colour zoning */
  height: number[];
  /** per triangle: the plane tag it lies on (BROKEN for a fracture) */
  tag: number[];
}

/** A point as flat-shaded triangles in its own frame (c axis = +y). */
export function quartzPoint(rnd: () => number, spec: PointSpec): PointMesh {
  const { position, normal, tag } = convexSolid(pointPlanes(rnd, spec), spec.length * 1.5 + spec.radius * 2);
  const base = spec.base ?? 0;
  const height: number[] = [];
  for (let i = 1; i < position.length; i += 3) height.push((position[i] - base) / (spec.length - base));
  return { position, normal, height, tag };
}

/** A point placed in a cluster: where its foot is and where it grows. */
export interface Placed {
  mesh: PointMesh;
  at: THREE.Vector3;
  dir: THREE.Vector3;
  roll: number;
}

/**
 * Many points as one geometry (one draw, one BVH for refraction), with a
 * colour per vertex from `colour(height, point)`, the height itself as
 * `aZone` (0 at each point's foot, 1 at its apex) for the milky feet, and
 * each point's c axis as `aAxis`, for the striations across its prism.
 */
export function mergePoints(points: Placed[], colour: (h: number, k: number) => THREE.Color): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const zone: number[] = [];
  const axis: number[] = [];
  const q = new THREE.Quaternion();
  const roll = new THREE.Quaternion();
  const v = new THREE.Vector3();
  points.forEach((p, k) => {
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.dir.clone().normalize());
    roll.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.roll);
    q.multiply(roll);
    const { position, normal, height } = p.mesh;
    const up = p.dir.clone().normalize();
    for (let i = 0; i < position.length; i += 3) {
      v.set(position[i], position[i + 1], position[i + 2]).applyQuaternion(q).add(p.at);
      pos.push(v.x, v.y, v.z);
      v.set(normal[i], normal[i + 1], normal[i + 2]).applyQuaternion(q);
      nor.push(v.x, v.y, v.z);
      const h = height[i / 3];
      const c = colour(h, k);
      col.push(c.r, c.g, c.b);
      zone.push(h);
      axis.push(up.x, up.y, up.z);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute("aZone", new THREE.Float32BufferAttribute(zone, 1));
  geo.setAttribute("aAxis", new THREE.Float32BufferAttribute(axis, 3));
  // indexed (each flat face shares its own corners), as the BVH wants it
  const indexed = mergeVertices(geo);
  geo.dispose();
  indexed.computeBoundingSphere();
  indexed.computeBoundingBox();
  return indexed;
}
