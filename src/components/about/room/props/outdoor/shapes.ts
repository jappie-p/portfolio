import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type V3 = [number, number, number];
export const v = (p: V3) => new THREE.Vector3(...p);

const UP = new THREE.Vector3(0, 1, 0);

/** A mesh that casts and takes shadow. */
export function solid(geometry: THREE.BufferGeometry, material: THREE.Material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** A round tube through points (a smooth curve), `r` thick, capped. */
export function tube(points: V3[], r: number, radial = 12, tubular = 0) {
  const curve = new THREE.CatmullRomCurve3(points.map(v), false, "centripetal");
  return new THREE.TubeGeometry(curve, tubular || Math.max(8, points.length * 10), r, radial, false);
}

/** A tube whose radius changes along it (from r0 to r1): for tapered stays
 *  and a down tube that swells toward the bottom bracket. */
export function taper(points: V3[], r0: number, r1: number, radial = 14, tubular = 32, squash = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map(v), false, "centripetal");
  const g = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const frames = curve.computeFrenetFrames(tubular, false);
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      d.fromBufferAttribute(pos, k).sub(c);
      // squash across the bike (along the frame's binormal), for an oval section
      const b = frames.binormals[i];
      const across = d.dot(b);
      d.addScaledVector(b, across * (squash - 1));
      d.multiplyScalar(r);
      pos.setXYZ(k, c.x + d.x, c.y + d.y, c.z + d.z);
    }
  }
  g.computeVertexNormals();
  return capped(g, curve, r0, r1, radial);
}

/** Close both ends of a tube with discs. */
function capped(g: THREE.BufferGeometry, curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, radial: number) {
  const caps = [0, 1].map((t) => {
    const r = t ? r1 : r0;
    const disc = new THREE.CircleGeometry(r * 1.001, radial);
    const at = curve.getPointAt(t);
    const dir = curve.getTangentAt(t).multiplyScalar(t ? 1 : -1);
    disc.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir));
    disc.translate(at.x, at.y, at.z);
    return disc;
  });
  return merge([g, ...caps]);
}

/** A cylinder from a to b, `r` thick (r1 at b, if given). */
export function rod(a: V3 | THREE.Vector3, b: V3 | THREE.Vector3, r: number, radial = 10, r1 = r) {
  const A = Array.isArray(a) ? v(a) : a;
  const B = Array.isArray(b) ? v(b) : b;
  const len = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r1, r, len, radial, 1, false);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, B.clone().sub(A).normalize()));
  g.translate(A.x, A.y, A.z);
  return g;
}

/** A disc lying in the x-y plane (axle along z), `depth` thick, centred on z = 0. */
export function disc(r: number, depth: number, segments = 32) {
  const g = new THREE.CylinderGeometry(r, r, depth, segments, 1, false);
  g.rotateX(Math.PI / 2);
  return g;
}

/** A gear: `teeth` square-ish teeth round a disc (x-y plane, axle along z),
 *  with an optional bore and lightening holes. */
export function gear(teeth: number, outer: number, root: number, depth: number, bore = 0, holes = 0, holeR = 0, holeAt = 0) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [root, a],
      [outer, a + step * 0.18],
      [outer, a + step * 0.48],
      [root, a + step * 0.66],
    ];
    pts.forEach(([r, t], k) => {
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      if (i === 0 && k === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  if (bore > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, bore, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * Math.PI * 2 + 0.3;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * holeAt, Math.sin(a) * holeAt, holeR, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** A ring turned about the axle (z), from a profile of (radius, z) points. */
export function turned(profile: [number, number][], segments = 64) {
  // lathe turns about y: build with (radius, height = z), then lay it on its side
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Merge geometries that share a material (indexed or not). */
export function merge(geometries: THREE.BufferGeometry[]) {
  const flat = geometries.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (!n.attributes.uv) n.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    for (const name of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(name)) n.deleteAttribute(name);
    return n;
  });
  const out = mergeGeometries(flat, false)!;
  flat.forEach((g, i) => g !== geometries[i] && g.dispose());
  geometries.forEach((g) => g.dispose());
  return out;
}

/**
 * Collapse a group's plain meshes into one mesh per material, in the group's
 * own space (fewer draws; nothing in it moves on its own). Instanced meshes,
 * decals (they cast no shadow) and anything under a child marked
 * `userData.keep` are left as they are.
 */
export function bake(root: THREE.Group) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const drop: THREE.Mesh[] = [];
  const visit = (o: THREE.Object3D) => {
    if (o !== root && o.userData.keep) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.castShadow && !(o as THREE.InstancedMesh).isInstancedMesh && !Array.isArray(mesh.material)) {
      const g = mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld));
      const list = byMat.get(mesh.material) ?? [];
      list.push(g);
      byMat.set(mesh.material, list);
      drop.push(mesh);
    }
    o.children.forEach(visit);
  };
  visit(root);
  for (const mesh of drop) {
    mesh.parent?.remove(mesh);
    mesh.geometry.dispose();
  }
  for (const [material, list] of byMat) root.add(solid(merge(list), material));
  return root;
}

/** Bold lettering on a clear canvas, for decals. */
export function lettering(text: string, color: string, w = 512, h = 160, weight = 800, italic = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `${italic ? "italic " : ""}${weight} ${Math.round(h * 0.78)}px "Helvetica Neue", Arial, sans-serif`;
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A decal on the outside of a tube: a strip of a slightly larger cylinder
 *  from a to b, facing `side` (a unit vector across the tube), carrying a
 *  texture. Wraps `arc` radians round the tube. */
export function wrap(a: V3, b: V3, r: number, arc: number, side: THREE.Vector3, material: THREE.Material) {
  const A = v(a);
  const B = v(b);
  const len = A.distanceTo(B);
  const dir = B.clone().sub(A).normalize();
  const g = new THREE.CylinderGeometry(r, r, len, 24, 1, true, -arc / 2, arc);
  // uv: u round the arc, v along the tube; the texture reads along the tube
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), 1 - uv.getX(i));
  // the cylinder's arc is centred on +z: aim +z at `side`, its axis along the tube
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
  const z = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const s = side.clone().addScaledVector(dir, -side.dot(dir)).normalize();
  const twist = new THREE.Quaternion().setFromUnitVectors(z, s);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(q);
  g.applyQuaternion(twist);
  g.translate(A.x, A.y, A.z);
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  return mesh;
}
