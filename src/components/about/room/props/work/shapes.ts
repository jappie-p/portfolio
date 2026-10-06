import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** A box with softened edges, centred on (x, y, z). */
export function rbox(w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0, segments = 3) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2, h / 2, d / 2) * 0.999).translate(x, y, z);
}

/** A cylinder along y, centred on (x, y, z). */
export function cyl(rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, radial = 20) {
  return new THREE.CylinderGeometry(rTop, rBottom, h, radial).translate(x, y, z);
}

/** A tube through points, round in section. */
export function tube(points: THREE.Vector3[], radius: number, segments = 24, radial = 8, curve = 0.5) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, "catmullrom", curve), segments, radius, radial, false);
}

/** Wood grain and such by the metre: each face takes the uvs of the plane
 *  it mostly faces, in object space, so a texture keeps its scale on every
 *  board (`along` picks which way the grain runs on the top). */
export function planarUV(g: THREE.BufferGeometry, scale = 1, along: "x" | "z" = "x") {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    const az = Math.abs(n.getZ(i));
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) [u, v] = along === "x" ? [x, z] : [z, x];
    else if (ax >= az) [u, v] = [z, y];
    else [u, v] = [x, y];
    uv[i * 2] = u * scale;
    uv[i * 2 + 1] = v * scale;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Many pieces of one material as one draw (non-indexed, so any mix merges). */
export function merge(geos: THREE.BufferGeometry[]) {
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  // every part needs the same attributes to merge
  for (const g of flat) if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const merged = mergeGeometries(flat.map((g) => {
    const keep = new THREE.BufferGeometry();
    keep.setAttribute("position", g.attributes.position);
    keep.setAttribute("normal", g.attributes.normal);
    keep.setAttribute("uv", g.attributes.uv);
    return keep;
  }));
  geos.forEach((g) => g.dispose());
  flat.forEach((g) => g.dispose());
  return merged;
}

/** A mesh that casts and takes shadows. */
export function solid(g: THREE.BufferGeometry, m: THREE.Material) {
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Dispose a texture along with the material that shows it. */
export function owns<T extends THREE.Material>(m: T, ...textures: THREE.Texture[]): T {
  m.addEventListener("dispose", () => textures.forEach((t) => t.dispose()));
  return m;
}
