import * as THREE from "three";
import { KEY, STRIP } from "./lights";
import { Materials } from "./materials";
import { glintMaterial, setVeil, setVoid, veilQuad, voidQuad } from "./shaders";
import { Studio } from "./studio";
import { TextureBank } from "./textures";
import { cameraDistance, FOV } from "./units";
import type { GlowPlan } from "./layout";

/** What lives as long as the canvas: materials, textures, the void behind the
 *  geode and the veil in front of it. Worlds come and go with the size. */
export class Kit {
  readonly tex = new TextureBank();
  readonly mats = new Materials(this.tex.schiller(5));
  readonly glint = glintMaterial(KEY, STRIP);
  readonly void = voidQuad();
  readonly veil = veilQuad();
  readonly studio = new Studio();
  /** the height the camera is framed for, CSS px */
  private h = 1;

  /** Bake the studio light (compiled first, baked in a task of its own) and
   *  hand it to the scene as its environment. */
  async light(gl: THREE.WebGLRenderer, scene: THREE.Scene, pause: () => Promise<void>) {
    await this.studio.compile(gl);
    await pause();
    this.studio.bake(gl);
    scene.environment = this.studio.texture;
  }

  /** Fit the scene to a w x h canvas: camera, backdrop, veil. */
  frame(camera: THREE.Camera, w: number, h: number, glows: GlowPlan[]) {
    this.h = h;
    if (camera instanceof THREE.PerspectiveCamera) {
      const d = cameraDistance(h);
      camera.fov = FOV;
      camera.near = d * 0.1;
      camera.far = d * 4;
      camera.position.set(0, 0, d);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
    setVoid(this.void, w, h, glows);
    setVeil(this.veil, w, h, w < 640 ? 110 : 60);
  }

  /** Per frame: glint clock and size, and the camera's parallax. */
  tick(camera: THREE.Camera, t: number, px: number, py: number, dpr: number) {
    const d = cameraDistance(this.h);
    this.glint.uniforms.uTime.value = t;
    this.glint.uniforms.uScale.value = d * dpr;
    camera.position.set(px * d * 0.012, -py * d * 0.008, d);
    camera.lookAt(0, 0, 0);
  }

  dispose() {
    this.studio.dispose();
    this.mats.dispose();
    this.tex.dispose();
    this.glint.dispose();
    for (const q of [this.void, this.veil]) {
      q.geometry.dispose();
      (q.material as THREE.Material).dispose();
    }
  }
}
