import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Materials } from "../../materials";

/** Toward the sun, which comes in through the window behind the room: a
 *  leaf seen against it lets its light through. */
const SUN = new THREE.Vector3(-0.1, 0.6, -0.79).normalize();
const UP = new THREE.Vector3(0, 1, 0);

/** Each vertex drifts a little on its own phase, more the further it is
 *  from where its plant is rooted (aSway: phase, reach in metres). */
const SWAY = /* glsl */ `#include <begin_vertex>
{
  float t = uTime + aSway.x;
  transformed += aSway.y * vec3(sin(t * 0.9), 0.35 * sin(t * 1.3 + 1.1), 0.7 * sin(t * 0.7 + 2.3));
}`;

/** Light through a leaf: the sun behind it, as the eye sees it, warms and
 *  yellows its green. */
const THROUGH = /* glsl */ `{
  vec3 sunView = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
  float through = max(dot(-normal, sunView), 0.0);
  outgoingLight += diffuseColor.rgb * vec3(1.0, 1.08, 0.5) * through * uThrough;
}
#include <opaque_fragment>`;

/**
 * A foliage material: the kit's toned standard material, double-sided,
 * coloured per vertex (each leaf its own green), swaying with `time`, the
 * sun showing through it by `through`. Kept in the kit by name.
 */
export function foliage(m: Materials, name: string, p: THREE.MeshStandardMaterialParameters, time: { value: number }, through = 0.9) {
  const mat = m.own(name, () => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, vertexColors: true, ...p }));
  if (mat.userData.foliage) return mat;
  mat.userData.foliage = true;
  const toned = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => {
    toned.call(mat, s, r);
    s.uniforms.uTime = time;
    s.uniforms.uSun = { value: SUN };
    s.uniforms.uThrough = { value: through };
    s.vertexShader = s.vertexShader.replace("void main() {", "in vec2 aSway;\nuniform float uTime;\nvoid main() {").replace("#include <begin_vertex>", SWAY);
    s.fragmentShader = s.fragmentShader.replace("void main() {", "uniform vec3 uSun;\nuniform float uThrough;\nvoid main() {").replace("#include <opaque_fragment>", THROUGH);
  };
  mat.customProgramCacheKey = () => "toned-lit-foliage";
  // its textures go with it
  mat.addEventListener("dispose", () => [mat.map, mat.alphaMap].forEach((t) => t?.dispose()));
  return mat;
}

/** A leaf, laid out from where it is attached. */
export type Leaf = {
  /** where it is attached (room space) and the way it points from there */
  base: THREE.Vector3;
  dir: THREE.Vector3;
  len: number;
  width: number;
  /** the way its face looks (else up, as far as `dir` allows), and a turn about `dir` */
  face?: THREE.Vector3;
  roll?: number;
  /** how far along it (0..1) it is attached: a cordate leaf's lobes reach behind */
  attach?: number;
  /** how far the midrib turns down by the tip (radians; negative curls up) */
  droop?: number;
  /** its edges rise by this share of the half width (a cupped or folded leaf) */
  fold?: number;
  /** a ripple along its edges (metres) */
  wave?: number;
  /** a turn about its midrib by the tip (radians) */
  twist?: number;
  /** its half width along it (0..1), for a leaf shaped by its geometry, not a texture */
  profile?: (v: number) => number;
  tint: THREE.Color;
  /** a colour it turns toward at its tip */
  tip?: THREE.Color;
  /** how far its tip drifts (metres), its phase, and how much its base drifts too */
  sway: number;
  phase: number;
  root?: number;
  cols?: number;
  rows?: number;
};

const v = new THREE.Vector3();
const w = new THREE.Vector3();

/** Leaves, stems and anything else of one material, gathered into one draw. */
export class Sheet {
  private pos: number[] = [];
  private uv: number[] = [];
  private col: number[] = [];
  private sway: number[] = [];
  private nor: number[] = [];
  private index: number[] = [];
  /** extra geometry, merged as it is (normals and all) */
  private parts: THREE.BufferGeometry[] = [];

  get triangles() {
    return this.index.length / 3 + this.parts.reduce((n, g) => n + (g.index?.count ?? 0) / 3, 0);
  }

  /** A leaf: a grid bent along a curving midrib, cupped across it. */
  leaf(l: Leaf) {
    const cols = l.cols ?? 6;
    const rows = l.rows ?? 10;
    const a = l.attach ?? 0;
    const f = l.dir.clone().normalize();
    let s: THREE.Vector3;
    let n: THREE.Vector3;
    if (l.face) {
      n = l.face.clone().addScaledVector(f, -l.face.dot(f)).normalize();
      s = new THREE.Vector3().crossVectors(n, f);
    } else {
      s = new THREE.Vector3().crossVectors(UP, f);
      if (s.lengthSq() < 1e-6) s.set(1, 0, 0);
      s.normalize();
      n = new THREE.Vector3().crossVectors(f, s);
    }
    if (l.roll) {
      s.applyAxisAngle(f, l.roll);
      n.applyAxisAngle(f, l.roll);
    }
    // the rows: some behind the attachment (the lobes), the rest ahead of it
    const back = a > 0 ? Math.max(1, Math.round(rows * a)) : 0;
    const ahead = rows - back;
    const vs: number[] = [];
    for (let k = 0; k <= back; k++) vs.push(a * (k / Math.max(back, 1)));
    if (back === 0) vs.length = 0;
    for (let k = back === 0 ? 0 : 1; k <= ahead; k++) vs.push(a + (1 - a) * (k / ahead));
    const droop = l.droop ?? 0;
    const angle = (vv: number) => {
      const d = vv - a;
      if (d >= 0) return droop * Math.pow(d / Math.max(1 - a, 1e-3), 1.5);
      return -0.6 * droop * Math.pow(-d / Math.max(a, 1e-3), 1.2);
    };
    // walk the midrib out from the attachment both ways
    const spine = vs.map(() => new THREE.Vector3());
    const at = vs.indexOf(a) >= 0 ? vs.indexOf(a) : 0;
    spine[at].copy(l.base);
    const tangent = (vv: number, out: THREE.Vector3) => {
      const th = angle(vv);
      return out.copy(f).multiplyScalar(Math.cos(th)).addScaledVector(n, -Math.sin(th));
    };
    for (let k = at + 1; k < vs.length; k++) {
      const mid = (vs[k] + vs[k - 1]) / 2;
      spine[k].copy(spine[k - 1]).addScaledVector(tangent(mid, v), (vs[k] - vs[k - 1]) * l.len);
    }
    for (let k = at - 1; k >= 0; k--) {
      const mid = (vs[k] + vs[k + 1]) / 2;
      spine[k].copy(spine[k + 1]).addScaledVector(tangent(mid, v), -(vs[k + 1] - vs[k]) * l.len);
    }
    const start = this.pos.length / 3;
    const half = l.width / 2;
    const S = new THREE.Vector3();
    const N = new THREE.Vector3();
    const T = new THREE.Vector3();
    vs.forEach((vv, k) => {
      const th = angle(vv);
      tangent(vv, T);
      N.copy(n).multiplyScalar(Math.cos(th)).addScaledVector(f, Math.sin(th));
      const tw = (l.twist ?? 0) * Math.max(vv - a, 0);
      S.copy(s).multiplyScalar(Math.cos(tw)).addScaledVector(N, Math.sin(tw));
      w.copy(N).multiplyScalar(Math.cos(tw)).addScaledVector(s, -Math.sin(tw));
      const width = l.profile ? half * l.profile(vv) : half;
      const tint = l.tip ? l.tint.clone().lerp(l.tip, Math.pow(vv, 3)) : l.tint;
      const reach = l.sway * ((l.root ?? 0.3) + (1 - (l.root ?? 0.3)) * vv * vv);
      for (let i = 0; i <= cols; i++) {
        const u = i / cols;
        const x = (u - 0.5) * 2;
        const r = Math.abs(x);
        let h = (l.fold ?? 0) * Math.pow(r, 1.6) * width;
        if (l.wave) h += l.wave * r * r * Math.sin(vv * 9 + (x > 0 ? 0 : 1.7) + l.phase);
        v.copy(spine[k]).addScaledVector(S, x * width).addScaledVector(w, h);
        this.pos.push(v.x, v.y, v.z);
        this.uv.push(u, vv);
        this.col.push(tint.r, tint.g, tint.b);
        this.sway.push(l.phase + vv * 0.6, reach);
        this.nor.push(0, 0, 0);
      }
    });
    const row = cols + 1;
    for (let k = 0; k < vs.length - 1; k++)
      for (let i = 0; i < cols; i++) {
        const p = start + k * row + i;
        this.index.push(p, p + row, p + 1, p + 1, p + row, p + row + 1);
      }
    this.smooth(start, this.pos.length / 3);
  }

  /** A stem: a tapering tube along a curve through `points`. */
  stem(points: THREE.Vector3[], r0: number, r1: number, tint: THREE.Color, sway: number, phase: number, radial = 6, segs = 12, root = 0) {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const frames = curve.computeFrenetFrames(segs, false);
    const start = this.pos.length / 3;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const p = curve.getPointAt(t);
      const r = r0 + (r1 - r0) * t;
      for (let i = 0; i <= radial; i++) {
        const ang = (i / radial) * Math.PI * 2;
        v.copy(frames.normals[k]).multiplyScalar(Math.cos(ang)).addScaledVector(frames.binormals[k], Math.sin(ang));
        this.pos.push(p.x + v.x * r, p.y + v.y * r, p.z + v.z * r);
        this.nor.push(v.x, v.y, v.z);
        this.uv.push(i / radial, t);
        this.col.push(tint.r, tint.g, tint.b);
        this.sway.push(phase + t * 0.6, sway * (root + (1 - root) * t * t));
      }
    }
    const row = radial + 1;
    for (let k = 0; k < segs; k++)
      for (let i = 0; i < radial; i++) {
        const p = start + k * row + i;
        this.index.push(p, p + 1, p + row, p + 1, p + row + 1, p + row);
      }
    return curve;
  }

  /** Any other geometry, in room space, one colour, still. */
  solid(g: THREE.BufferGeometry, tint: THREE.Color) {
    const count = g.attributes.position.count;
    if (!g.index) g.setIndex(Array.from({ length: count }, (_, i) => i));
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) col.set([tint.r, tint.g, tint.b], i * 3);
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("aSway", new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color", "aSway"].includes(name)) g.deleteAttribute(name);
    this.parts.push(g);
  }

  /** Face normals summed onto a leaf's own vertices (no other leaf shares them). */
  private smooth(from: number, to: number) {
    const p = this.pos;
    const nn = this.nor;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const first = this.index.length - 1;
    for (let t = first; t >= 0; t -= 3) {
      const i0 = this.index[t - 2];
      if (i0 < from) break;
      const i1 = this.index[t - 1];
      const i2 = this.index[t];
      a.fromArray(p, i0 * 3);
      b.fromArray(p, i1 * 3).sub(a);
      c.fromArray(p, i2 * 3).sub(a);
      b.cross(c);
      for (const i of [i0, i1, i2]) {
        nn[i * 3] += b.x;
        nn[i * 3 + 1] += b.y;
        nn[i * 3 + 2] += b.z;
      }
    }
    for (let i = from; i < to; i++) {
      a.fromArray(nn, i * 3).normalize();
      if (a.lengthSq() === 0) a.set(0, 1, 0);
      a.toArray(nn, i * 3);
    }
  }

  /** Everything gathered, as one geometry (or null if nothing was). */
  geometry(): THREE.BufferGeometry | null {
    const out: THREE.BufferGeometry[] = [];
    if (this.index.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
      g.setAttribute("aSway", new THREE.Float32BufferAttribute(this.sway, 2));
      g.setIndex(this.index);
      out.push(g);
    }
    out.push(...this.parts);
    if (!out.length) return null;
    if (out.length === 1) return out[0];
    const merged = mergeGeometries(out);
    out.forEach((g) => g.dispose());
    return merged;
  }

  /** The gathered leaves as a mesh, casting and taking shadow. */
  mesh(material: THREE.Material) {
    const g = this.geometry();
    if (!g) return null;
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
