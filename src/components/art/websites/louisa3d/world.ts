import * as THREE from "three";
import { mulberry32 } from "../lib/rng";
import { crystalPoint, lipShape, merge, place, slabGeometry, wallGeometry, type GlintSpot, type Ramp } from "./geometry";
import type { FloaterPlan, LouisaPlan, WallPlan } from "./layout";
import { AMETHYST_RAMP, ROSE_RAMP, type Materials } from "./materials";
import type { TextureBank } from "./textures";
import { toWorld } from "./units";

const DRUZY_RAMP: Ramp = [new THREE.Color("#c9b8ff"), new THREE.Color("#e4dbff"), new THREE.Color("#ffffff")];

interface Swaying {
  obj: THREE.Object3D;
  base: THREE.Euler;
  sway: number;
  period: number;
  phase: number;
}

interface Tumbling {
  obj: THREE.Object3D;
  home: THREE.Vector3;
  spin: [number, number, number];
  bob: number;
  phase: number;
}

/** Glint spots as a point cloud that rides along with its crystals. */
function glintField(spots: GlintSpot[], material: THREE.ShaderMaterial, seed: number): THREE.Points {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(spots.length * 3);
  const nor = new Float32Array(spots.length * 3);
  const size = new Float32Array(spots.length);
  const seeds = new Float32Array(spots.length);
  spots.forEach((s, i) => {
    // a hair off the facet, so the facet never hides its own glint
    pos.set([s.p.x + s.n.x * 1.5, s.p.y + s.n.y * 1.5, s.p.z + s.n.z * 1.5], i * 3);
    nor.set([s.n.x, s.n.y, s.n.z], i * 3);
    size[i] = s.size;
    seeds[i] = rnd();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aNormal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const pts = new THREE.Points(geo, material);
  pts.frustumCulled = false;
  pts.renderOrder = 10;
  return pts;
}

/**
 * Everything in the geode for one canvas size: built once, animated by
 * update(), torn down by dispose(). Geometry is merged per material, so each
 * wall costs a handful of draw calls.
 */
export class LouisaWorld {
  readonly root = new THREE.Group();
  private readonly swaying: Swaying[] = [];
  private readonly tumbling: Tumbling[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly owned: THREE.Material[] = [];

  constructor(
    readonly plan: LouisaPlan,
    readonly w: number,
    readonly h: number,
    private readonly mats: Materials,
    private readonly tex: TextureBank,
    private readonly glints: THREE.ShaderMaterial,
  ) {
    mats.scale(plan.u);
  }

  /** The build, as steps small enough to run one per task: each wall's
   *  bands, each wall, the floaters. */
  steps(): (() => void)[] {
    const { walls, floaters, u } = this.plan;
    return [
      ...walls.flatMap((wall, i) => [() => void this.tex.bands(wall.seed), () => this.wall(wall, u, i)]),
      () => floaters.forEach((f) => this.floater(f)),
    ];
  }

  private wall(p: WallPlan, u: number, index: number) {
    const rnd = mulberry32(p.seed * 97 + index);
    const group = new THREE.Group();
    group.position.set(...toWorld(p.cx, p.cy, p.z, this.w, this.h));
    group.rotation.set(p.tilt[0], p.tilt[1], 0);
    this.swaying.push({ obj: group, base: group.rotation.clone(), sway: p.sway, period: p.period, phase: p.phase });

    const { geo, face } = wallGeometry(p.r, p.seed);
    const agate = this.mats.agateFor(this.tex.bands(p.seed), this.tex.polish(p.seed));
    this.owned.push(agate);
    this.geos.push(geo);
    group.add(new THREE.Mesh(geo, agate));

    // the crystals: groups along the lip, a main point and smaller ones at its foot
    const amethyst: THREE.BufferGeometry[] = [];
    const rose: THREE.BufferGeometry[] = [];
    const spots: GlintSpot[] = [];
    for (let i = 0; i < p.groups; i++) {
      const f = (i + 0.15 + rnd() * 0.7) / p.groups;
      const a = p.from + (p.to - p.from) * f;
      const main = p.size(f) * (0.6 + rnd() * 0.5);
      const lean = (rnd() - 0.5) * 0.7;
      const isRose = rnd() < p.rose;
      const n = 1 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) {
        const len = k ? main * (0.25 + rnd() * 0.4) : main;
        const aa = a + (k ? (rnd() - 0.5) * 0.12 : 0);
        const rr = p.r * lipShape(aa, p.seed) * (0.985 - rnd() * 0.03);
        const root = new THREE.Vector3(Math.cos(aa) * rr, Math.sin(aa) * rr, face - len * 0.04);
        const dir = aa + lean + (k ? (rnd() - 0.5) * 0.9 : 0);
        const forward = 0.45 + rnd() * 0.75;
        const { geo: g, glints } = crystalPoint(rnd, len, len * (0.15 + rnd() * 0.06), isRose ? ROSE_RAMP : AMETHYST_RAMP);
        place(g, glints, root, new THREE.Vector3(Math.cos(dir), Math.sin(dir), forward));
        (isRose ? rose : amethyst).push(g);
        spots.push(...glints);
      }
    }
    for (const [list, material] of [
      [amethyst, this.mats.amethyst],
      [rose, this.mats.rose],
    ] as const) {
      if (!list.length) continue;
      const merged = merge(list);
      this.geos.push(merged);
      group.add(new THREE.Mesh(merged, material));
    }

    // druzy: a sugar of tiny points along the lip, little mirrors
    const druzyPoint = crystalPoint(rnd, 1, 0.24, DRUZY_RAMP).geo;
    this.geos.push(druzyPoint);
    const druzy = new THREE.InstancedMesh(druzyPoint, this.mats.druzy, p.druzy);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const span = p.to - p.from;
    for (let i = 0; i < p.druzy; i++) {
      const aa = p.from - span * 0.08 + span * 1.16 * rnd();
      const rr = p.r * lipShape(aa, p.seed) * (0.93 + rnd() * 0.09);
      const len = u * (0.01 + rnd() * rnd() * 0.035);
      const out = aa + (rnd() - 0.5) * 1.6;
      q.setFromUnitVectors(up, new THREE.Vector3(Math.cos(out), Math.sin(out), 0.3 + rnd() * 1.4).normalize());
      m.compose(new THREE.Vector3(Math.cos(aa) * rr, Math.sin(aa) * rr, face - len * 0.1), q, new THREE.Vector3(len, len, len));
      druzy.setMatrixAt(i, m);
      if (rnd() < 0.18) {
        const n = new THREE.Vector3(Math.cos(out), Math.sin(out), 0.6 + rnd()).normalize();
        spots.push({ p: new THREE.Vector3(Math.cos(aa) * rr, Math.sin(aa) * rr, face + len * 0.6), n, size: len * 1.6 + u * 0.008 });
      }
    }
    druzy.instanceMatrix.needsUpdate = true;
    druzy.computeBoundingSphere();
    group.add(druzy);

    const field = glintField(spots, this.glints, p.seed);
    this.geos.push(field.geometry);
    group.add(field);
    this.root.add(group);
  }

  private floater(p: FloaterPlan) {
    const rnd = mulberry32(p.seed);
    const group = new THREE.Group();
    const home = new THREE.Vector3(...toWorld(p.x, p.y, p.z, this.w, this.h));
    group.position.copy(home);
    group.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    let spots: GlintSpot[] = [];
    if (p.kind === "labradorite") {
      const geo = slabGeometry(rnd, p.size, p.size * 0.42);
      this.geos.push(geo);
      group.add(new THREE.Mesh(geo, this.mats.labradorite));
      // glints on the polished faces, front and back
      spots = [1, -1].flatMap((side) =>
        [0, 1, 2].map(() => ({ p: new THREE.Vector3((rnd() - 0.5) * p.size, (rnd() - 0.5) * p.size, side * p.size * 0.32), n: new THREE.Vector3(0, 0, side), size: p.size * 0.9 })),
      );
    } else {
      const { geo, glints } = crystalPoint(rnd, p.size, p.size * 0.17, p.kind === "rose" ? ROSE_RAMP : AMETHYST_RAMP, true);
      this.geos.push(geo);
      group.add(new THREE.Mesh(geo, p.kind === "rose" ? this.mats.rose : this.mats.amethyst));
      spots = glints;
    }
    const field = glintField(spots, this.glints, p.seed + 5);
    this.geos.push(field.geometry);
    group.add(field);
    this.tumbling.push({ obj: group, home, spin: p.spin, bob: p.size * 0.12, phase: rnd() * Math.PI * 2 });
    this.root.add(group);
  }

  /** One drawable per material and kind, for compiling shaders one at a time. */
  drawables(): THREE.Object3D[] {
    const seen = new Set<string>();
    const out: THREE.Object3D[] = [];
    this.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!m) return;
      const key = `${m.uuid}/${o.type}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(o);
    });
    return out;
  }

  /** Pose everything for scene time t (s), pointer eased in -1..1. */
  update(t: number, px: number, py: number) {
    for (const s of this.swaying) {
      const k = (t / s.period) * Math.PI * 2 + s.phase;
      s.obj.rotation.set(s.base.x + Math.cos(k * 1.3) * s.sway * 0.5 - py * 0.04, s.base.y + Math.sin(k) * s.sway + px * 0.06, s.base.z);
    }
    for (const f of this.tumbling) {
      f.obj.rotation.set(f.spin[0] * t + f.phase, f.spin[1] * t + f.phase * 0.7, f.spin[2] * t);
      f.obj.position.set(f.home.x, f.home.y + Math.sin(t * 0.5 + f.phase) * f.bob, f.home.z);
    }
  }

  dispose() {
    for (const g of this.geos) g.dispose();
    for (const m of this.owned) m.dispose();
    this.root.clear();
  }
}
