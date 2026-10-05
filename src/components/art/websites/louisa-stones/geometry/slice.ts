import * as THREE from "three";
import { mulberry32 } from "../../lib/rng";

/** The outline of a cut nodule: an oval with the slow lumps of a stone that
 *  formed in a gas pocket. Points around it in cm, counter-clockwise. */
export function sliceOutline(seed: number, rx: number, ry: number, count = 160): THREE.Vector2[] {
  const rnd = mulberry32(seed);
  const waves = [2, 3, 4, 5, 7].map((k) => ({ k, a: (0.05 + rnd() * 0.05) / Math.sqrt(k), p: rnd() * Math.PI * 2 }));
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    let r = 1;
    for (const w of waves) r += w.a * Math.cos(w.k * t + w.p);
    out.push(new THREE.Vector2(Math.cos(t) * rx * r, Math.sin(t) * ry * r));
  }
  return out;
}

/**
 * The slice: two polished faces (group 0) and the rough rind around the
 * edge (group 1), its cut edges eased a little. Centred on z = 0, facing +z,
 * x and y in cm on the face.
 */
export function sliceGeometry(outline: THREE.Vector2[], thickness: number): THREE.BufferGeometry {
  const ease = Math.min(0.05, thickness * 0.12);
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(outline), {
    depth: thickness - ease * 2,
    bevelEnabled: true,
    bevelThickness: ease,
    bevelSize: ease,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.translate(0, 0, -(thickness - ease * 2) / 2);
  const out = regroup(geo);
  geo.dispose();
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

/** Sort triangles into the polished faces with their eased edges (group 0)
 *  and the rind around the side (group 1), so the edge of the polish catches
 *  the light as a thin bright line. */
function regroup(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const face: number[][] = [[], []];
  const normal: number[][] = [[], []];
  for (let i = 0; i < pos.count; i += 3) {
    const nz = (Math.abs(nor.getZ(i)) + Math.abs(nor.getZ(i + 1)) + Math.abs(nor.getZ(i + 2))) / 3;
    const g = nz > 0.2 ? 0 : 1;
    for (let k = i; k < i + 3; k++) {
      face[g].push(pos.getX(k), pos.getY(k), pos.getZ(k));
      normal[g].push(nor.getX(k), nor.getY(k), nor.getZ(k));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute([...face[0], ...face[1]], 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute([...normal[0], ...normal[1]], 3));
  out.addGroup(0, face[0].length / 3, 0);
  out.addGroup(face[0].length / 3, face[1].length / 3, 1);
  return out;
}

/** The largest distance from the rim inward: how deep the bands can go. */
export function sliceDepth(outline: THREE.Vector2[]): number {
  let best = 0;
  const box = new THREE.Box2().setFromPoints(outline);
  const p = new THREE.Vector2();
  for (let i = 0; i <= 24; i++) {
    for (let j = 0; j <= 24; j++) {
      p.set(box.min.x + ((box.max.x - box.min.x) * i) / 24, box.min.y + ((box.max.y - box.min.y) * j) / 24);
      let d = Infinity;
      for (let k = 0; k < outline.length; k++) d = Math.min(d, segment(p, outline[k], outline[(k + 1) % outline.length]));
      if (inside(p, outline)) best = Math.max(best, d);
    }
  }
  return best;
}

function segment(p: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby)));
  return Math.hypot(p.x - a.x - abx * t, p.y - a.y - aby * t);
}

function inside(p: THREE.Vector2, poly: THREE.Vector2[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
