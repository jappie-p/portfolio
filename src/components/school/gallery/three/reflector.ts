import * as THREE from "three";
import { HEAD } from "./glsl";

/** Layer of everything the polished floor reflects (the floor itself does not). */
export const MIRRORED = 1;

const BLUR = /* glsl */ `${HEAD}
uniform sampler2D uTex;
uniform vec2 uStep;
in vec2 vUv;
out highp vec4 fragColor;
void main() {
  // nine taps through linear filtering, a gaussian of radius ~4 steps
  vec3 c = texture(uTex, vUv).rgb * 0.227027;
  c += (texture(uTex, vUv + uStep * 1.384615).rgb + texture(uTex, vUv - uStep * 1.384615).rgb) * 0.316216;
  c += (texture(uTex, vUv + uStep * 3.230769).rgb + texture(uTex, vUv - uStep * 3.230769).rgb) * 0.070270;
  fragColor = vec4(c, 1.0);
}
`;

const QUAD = /* glsl */ `${HEAD}
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const target = (w: number, h: number, depth: boolean) =>
  new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: depth, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

/**
 * A planar mirror for the floor (y = 0): the scene seen from a camera below
 * it, at half the canvas' resolution, plus a blurred copy at a quarter for the
 * glossy, streaky part of the reflection. Only layer MIRRORED is drawn.
 */
export class Reflector {
  readonly sharp = target(2, 2, true);
  readonly soft = target(2, 2, false);
  private readonly tmp = target(2, 2, false);
  private readonly camera = new THREE.PerspectiveCamera();
  /** world to reflection texture coordinates, for the floor's shader */
  readonly matrix = new THREE.Matrix4();
  /** the blur's full-screen triangle (public so it can be compiled ahead) */
  readonly quad: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  private readonly flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly v = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: QUAD,
      fragmentShader: BLUR,
      uniforms: { uTex: { value: null }, uStep: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(geometry, material);
    this.quad.frustumCulled = false;
    this.camera.layers.set(MIRRORED);
  }

  /** Match the canvas' drawing buffer (in device pixels). */
  setSize(w: number, h: number) {
    const sw = Math.max(2, Math.round(w / 2));
    const sh = Math.max(2, Math.round(h / 2));
    if (this.sharp.width === sw && this.sharp.height === sh) return;
    this.sharp.setSize(sw, sh);
    this.tmp.setSize(Math.max(2, sw >> 1), Math.max(2, sh >> 1));
    this.soft.setSize(Math.max(2, sw >> 1), Math.max(2, sh >> 1));
  }

  /** The mirrored camera: the eye reflected through the floor, looking at the
   *  reflection of what it looks at (no clip plane: nothing hangs below y = 0). */
  private aim(eye: THREE.PerspectiveCamera) {
    const c = this.camera;
    eye.getWorldPosition(this.v);
    c.position.set(this.v.x, -this.v.y, this.v.z);
    eye.getWorldDirection(this.look).add(this.v);
    this.look.y = -this.look.y;
    c.up.set(0, 1, 0).applyQuaternion(eye.quaternion);
    c.up.y = -c.up.y;
    c.lookAt(this.look);
    c.updateMatrixWorld();
    c.projectionMatrix.copy(eye.projectionMatrix);
    c.projectionMatrixInverse.copy(eye.projectionMatrixInverse);
    this.matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.matrix.multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
  }

  render(gl: THREE.WebGLRenderer, scene: THREE.Scene, eye: THREE.PerspectiveCamera) {
    this.aim(eye);
    const before = gl.getRenderTarget();
    gl.setRenderTarget(this.sharp);
    gl.clear();
    gl.render(scene, this.camera);
    // streaks: blur a little sideways, more downward, as on a polished
    // floor; twice over, so the wide blur stays smooth
    const m = this.quad.material;
    const pass = (from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, x: number, y: number) => {
      m.uniforms.uTex.value = from.texture;
      m.uniforms.uStep.value.set(x / to.width, y / to.height);
      gl.setRenderTarget(to);
      gl.render(this.quad, this.flat);
    };
    pass(this.sharp, this.tmp, 1.3, 0);
    pass(this.tmp, this.soft, 0, 2.2);
    pass(this.soft, this.tmp, 2, 0);
    pass(this.tmp, this.soft, 0, 3.4);
    gl.setRenderTarget(before);
  }

  dispose() {
    this.sharp.dispose();
    this.soft.dispose();
    this.tmp.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }
}
