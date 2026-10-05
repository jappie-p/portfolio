import * as THREE from "three";
import type { StonesPlan } from "./layout";
import { agateFaceMaterial } from "./materials/agate";
import { absorption, crystalPatch } from "./materials/crystal";
import { labradoriteMaterial } from "./materials/labradorite";
import { rockMaterial } from "./materials/rock";
import { roseQuartzMaterial } from "./materials/roseQuartz";
import { Slate } from "./materials/slate";
import { buildCluster, buildPebble, buildPoint, buildSlice, PALM, TUMBLED, type ClusterParts, type SliceParts } from "./stones/build";
import { bakeAgateDepth, bandTextures } from "./textures/agate";
import { bakeSlate } from "./textures/slate";
import { softboxTexture } from "./textures/softbox";
import { pause } from "./warm";

type Step = () => void | Promise<void>;

/** Run a generator to its end, one slice per task. */
async function sliced<T>(work: Generator<void, T>): Promise<T> {
  for (;;) {
    const step = work.next();
    if (step.done) return step.value;
    await pause();
  }
}

export interface Slice extends SliceParts {
  face: THREE.MeshPhysicalMaterial;
}

/**
 * What lives as long as the canvas: the shared materials, the slate, and
 * every stone built so far (kept, so a resize only moves them). Building is
 * handed out as steps small enough to run one per task.
 */
export class Kit {
  readonly softbox = softboxTexture();
  /** lamellae tilted so the key, refracted in and out through the polish,
   *  flashes back to the camera at the palm's turn */
  readonly labradorite = labradoriteMaterial({ lamella: new THREE.Vector3(-0.13, 0.92, 0.37).normalize(), grain: 0.9 });
  readonly rose = roseQuartzMaterial();
  /** the same stones out in the dark, beyond the pool of light */
  readonly roseFar = Object.assign(roseQuartzMaterial(), { envMapIntensity: 0.3 });
  /** a geode's grey-brown skin under its pale chalcedony lining */
  readonly matrix = rockMaterial({ low: "#3f3a35", high: "#c5c6c8", band: [1.25, 1.75], roughness: 0.88, grain: 1.8, relief: [2.2, 0.07] });
  readonly matrixFar = Object.assign(rockMaterial({ low: "#3f3a35", high: "#c5c6c8", band: [1.25, 1.75], roughness: 0.88, grain: 1.8, relief: [2.2, 0.07] }), {
    envMapIntensity: 0.3,
  });
  readonly rind = rockMaterial({ low: "#4a3d33", high: "#5f5044", band: [-4, 4], roughness: 0.85, grain: 2.6, relief: [6, 0.02] });
  readonly stand = new THREE.MeshStandardMaterial({ color: "#0e0e0f", roughness: 0.5, metalness: 0.3 });
  /** depth only: lays down the crystals' nearest faces before they shade,
   *  a hair further back, so the traced pass (whose vertex maths rounds a
   *  little differently) never loses its own faces to it */
  readonly prepass = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
  /** violet that deepens fast with depth, and water-clear quartz */
  readonly amethyst = crystalPatch({ absorb: absorption("#ebd3f4", 1), f0: 0.045, wave: 0, striae: 0, milk: new THREE.Color(0.04, 0.025, 0.055), veils: 0, cloud: 0.22 });
  /** far back, dim and out of focus, the cluster needs no tracing: glossy
   *  violet glass is all the blur leaves of it */
  readonly amethystFar = new THREE.MeshStandardMaterial({ color: "#7a4fc0", vertexColors: true, roughness: 0.12, metalness: 0, envMapIntensity: 0.25 });
  readonly clear = crystalPatch({ absorb: absorption("#f4f6fb", 8), f0: 0.045, wave: 0.004, milk: new THREE.Color(0.012, 0.012, 0.014), veils: 0.35, cloud: 0.25 });
  slate: Slate | null = null;
  /** stand-ins for the studio's materials (softbox faces, the slate floor),
   *  compiled ahead so its bake never compiles; kept, so the programs stay */
  studio: THREE.MeshBasicMaterial[] = [];
  private readonly targets: THREE.WebGLRenderTarget[] = [];
  private readonly textures: THREE.Texture[] = [this.softbox];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly built = new Map<string, ClusterParts | THREE.BufferGeometry | Slice>();

  /** The slate's textures, and stand-ins for the studio's materials to
   *  compile before it bakes. */
  async prepare(gl: THREE.WebGLRenderer): Promise<THREE.Object3D[]> {
    if (!this.slate) {
      const { grain, normal } = await bakeSlate(gl, 1024);
      this.targets.push(grain, normal);
      this.slate = new Slate(grain.texture, normal.texture, 12);
    }
    if (this.studio.length) return [];
    this.studio = [
      new THREE.MeshBasicMaterial({ map: this.softbox, side: THREE.DoubleSide, toneMapped: false }),
      new THREE.MeshBasicMaterial({ map: this.slate.grain, vertexColors: true, toneMapped: false }),
    ];
    const plane = new THREE.PlaneGeometry();
    this.geometries.push(plane);
    return this.studio.map((m) => new THREE.Mesh(plane, m));
  }

  /** The work `plan` still needs, in order. */
  steps(gl: THREE.WebGLRenderer, plan: StonesPlan): Step[] {
    const out: Step[] = [];
    const seen = new Set<string>();
    for (const s of plan.stones) {
      const key = `${s.kind}/${s.seed}/${s.scale}`;
      if (this.built.has(key) || seen.has(key)) continue;
      seen.add(key);
      if (s.kind === "cluster") out.push(async () => void this.built.set(key, await sliced(buildCluster(s.seed, s.scale, plan.lite ? 45 : 70))));
      if (s.kind === "point") out.push(() => void this.built.set(key, buildPoint(s.seed, 6.2 * s.scale, 1.15 * s.scale, false)));
      if (s.kind === "lying") out.push(() => void this.built.set(key, buildPoint(s.seed, 4.4 * s.scale, 1 * s.scale, true)));
      if (s.kind === "palm") out.push(async () => void this.built.set(key, await sliced(buildPebble(s.seed, PALM, s.scale, false))));
      if (s.kind === "tumbled") out.push(async () => void this.built.set(key, await sliced(buildPebble(s.seed, TUMBLED, s.scale, true))));
      if (s.kind === "slice") {
        out.push(async () => {
          const parts = buildSlice(s.seed, 4.4 * s.scale, 3.5 * s.scale, 0.55 * s.scale);
          const bands = bandTextures(s.seed);
          const depth = await bakeAgateDepth(gl, parts.outline, parts.bounds, parts.depth, s.seed);
          this.targets.push(depth);
          this.textures.push(bands.reflect, bands.glow);
          const face = agateFaceMaterial({ depth: depth.texture, reflect: bands.reflect, glow: bands.glow, bounds: parts.bounds });
          this.built.set(key, { ...parts, face });
        });
      }
    }
    return out;
  }

  cluster(seed: number, scale: number) {
    return this.built.get(`cluster/${seed}/${scale}`) as ClusterParts;
  }

  geometry(kind: "point" | "lying" | "palm" | "tumbled", seed: number, scale: number) {
    return this.built.get(`${kind}/${seed}/${scale}`) as THREE.BufferGeometry;
  }

  slice(seed: number, scale: number) {
    return this.built.get(`slice/${seed}/${scale}`) as Slice;
  }

  dispose() {
    for (const b of this.built.values()) {
      if (b instanceof THREE.BufferGeometry) b.dispose();
      else if ("crystals" in b) {
        b.crystals.dispose();
        b.matrix.dispose();
      } else {
        b.slice.dispose();
        b.stand.dispose();
        b.face.dispose();
      }
    }
    this.slate?.dispose();
    for (const m of [this.labradorite, this.rose, this.roseFar, this.matrix, this.matrixFar, this.rind, this.stand, this.prepass, this.amethystFar, ...this.studio]) m.dispose();
    for (const t of this.targets) t.dispose();
    for (const t of this.textures) t.dispose();
    for (const g of this.geometries) g.dispose();
  }
}
