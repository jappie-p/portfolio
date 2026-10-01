import * as THREE from "three";
import { KEY, STRIP } from "./lights";

type Panel = { form: "rect" | "ring"; at: [number, number, number]; scale: [number, number]; color: string; intensity: number };

const k = KEY.clone().multiplyScalar(8);
const s = STRIP.clone().multiplyScalar(8);

/** Studio light for the facets, from light panels only (no HDR download):
 *  a soft key, a hard strip, a ring above, small hot spots that make the
 *  sparkle, a broad dim fill in front, coloured fills from below and behind. */
const PANELS: Panel[] = [
  { form: "rect", at: [k.x, k.y, k.z], scale: [7, 4], color: "#f5f0ff", intensity: 4 },
  { form: "rect", at: [s.x, s.y, s.z], scale: [0.8, 9], color: "#fff4f9", intensity: 8 },
  { form: "rect", at: [-8, 1, 2.5], scale: [0.6, 9], color: "#efe8ff", intensity: 6 },
  { form: "rect", at: [-5, -4, 6], scale: [4, 0.6], color: "#fff6fb", intensity: 7 },
  { form: "ring", at: [0, 9, 2], scale: [4, 4], color: "#e9e2ff", intensity: 3.5 },
  { form: "rect", at: [-2.5, 2, 9], scale: [0.6, 0.6], color: "#ffffff", intensity: 16 },
  { form: "rect", at: [3, 3.5, 8], scale: [0.5, 0.5], color: "#ffffff", intensity: 13 },
  { form: "rect", at: [0.5, -3.5, 9], scale: [0.7, 0.4], color: "#ffffff", intensity: 10 },
  { form: "rect", at: [-1, 0.5, 10], scale: [9, 5], color: "#d8ccff", intensity: 0.5 },
  { form: "rect", at: [7, -5, 3], scale: [5, 5], color: "#f472b6", intensity: 1.8 },
  { form: "rect", at: [-7, -6, 2], scale: [6, 4], color: "#2dd4bf", intensity: 1.3 },
  { form: "rect", at: [0, 0, -10], scale: [14, 10], color: "#7c3aed", intensity: 1.6 },
];

/** The environment the crystals reflect: a little scene of glowing panels,
 *  baked once into a cube map (then PMREM'd by three on first use). Compiled
 *  ahead and baked in its own task, so it never stalls a frame. */
export class Studio {
  private readonly scene = new THREE.Scene();
  readonly target = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  private readonly camera = new THREE.CubeCamera(0.1, 100, this.target);
  private readonly geos = [new THREE.PlaneGeometry(1, 1), new THREE.RingGeometry(0.25, 0.5, 64)];

  constructor() {
    this.scene.background = new THREE.Color("#040208");
    for (const p of PANELS) {
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.intensity), side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(this.geos[p.form === "ring" ? 1 : 0], material);
      mesh.position.set(...p.at);
      mesh.scale.set(p.scale[0], p.scale[1], 1);
      mesh.lookAt(0, 0, 0);
      this.scene.add(mesh);
    }
  }

  get texture(): THREE.Texture {
    return this.target.texture;
  }

  async compile(gl: THREE.WebGLRenderer) {
    await gl.compileAsync(this.scene, this.camera.children[0] as THREE.Camera);
  }

  bake(gl: THREE.WebGLRenderer) {
    this.camera.update(gl, this.scene);
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose();
    });
    for (const g of this.geos) g.dispose();
    this.target.dispose();
  }
}
