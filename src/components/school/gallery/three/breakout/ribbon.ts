import * as THREE from "three";
import { HEAD, LIGHT, NOISE, OUT, VERT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";
import { CAST_GLSL, caster, type Shades } from "../shadows";
import { EXPOSE } from "./glsl";
import type { Lamp } from "./voxels";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec3 cameraPosition;
uniform sampler2D uPrint;
uniform float uFeed;
uniform float uRepeat;
uniform float uLength;
uniform float uFade;
${OUT}
${LIGHT}
${NOISE}
${EXPOSE}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
void main() {
  float s = vUv.y;
  vec3 print = srgbToLinear(texture(uPrint, vec2(vUv.x, (s - uFeed) / uRepeat)).rgb);
  float tooth = grain(vUv * vec2(3.0, 11.0)).r;
  // feathered over a pixel along both long edges (no multisampling); it
  // slides out of the picture over its first few centimetres; its end is
  // torn, in teeth
  float a = clamp(min(vUv.x, 1.0 - vUv.x) / max(fwidth(vUv.x), 1e-5), 0.0, 1.0);
  a *= smoothstep(0.0, 0.035, s);
  float teeth = 0.003 * abs(fract(vUv.x * 14.0) * 2.0 - 1.0);
  a *= clamp((uLength - s - teeth) / max(fwidth(s), 1e-5), 0.0, 1.0) * uFade;
  if (a < 0.004) discard;
  // the printed side faces the room, its back is bare paper; thin paper,
  // so a little of the light on the far side comes through
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 albedo = (gl_FrontFacing ? print : vec3(0.86, 0.83, 0.76)) * (0.97 + 0.06 * tooth);
  vec3 L;
  vec3 Lb;
  float lit = exposed(vWorld, n, L) + 0.22 * exposed(vWorld, -n, Lb);
  emit(albedo * (uAmbient * 4.0 + uLevel * (0.2 + 0.85 * lit)), a);
}
`;

const CAST_VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec2 uv;
uniform mat4 modelMatrix;
uniform int uWork;
uniform float uFade;
uniform float uLength;
${LIGHT}
${CAST_GLSL}
void main() {
  vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = fromLamp(uWork, w, uFade * smoothstep(0.0, 0.035, uv.y) * step(uv.y, uLength));
}
`;

/**
 * A strip of paper, laid along a curve each frame: across its width it
 * stays straight, so every point needs only where its centre is, its bend,
 * the way it heads and its twist.
 * Lit by the print's spot; the print on it slides along as it feeds.
 */
export class Ribbon {
  /** points across the strip: enough for its edges' curl to read */
  private static readonly COLS = 5;
  readonly geometry = new THREE.BufferGeometry();
  /** the print's feed, its fade, and how much of the strip there is (metres) */
  readonly uniforms: { uFeed: { value: number }; uFade: { value: number }; uLength: { value: number } };
  readonly mesh: THREE.Mesh;
  readonly shadow: THREE.Mesh;
  private readonly pos: Float32Array;
  private readonly nor: Float32Array;

  constructor(
    shared: Shared,
    lamp: Lamp,
    shades: Shades["uniforms"],
    print: THREE.Texture,
    /** metres along the strip that one repeat of the print takes */
    repeat: number,
    private readonly segments: number,
    private readonly width: number,
    length: number,
    /** how far its long edges curl up toward its face, as a roll leaves them */
    private readonly bow = 0,
  ) {
    const cols = Ribbon.COLS;
    const verts = (segments + 1) * cols;
    this.pos = new Float32Array(verts * 3);
    this.nor = new Float32Array(verts * 3);
    const uv = new Float32Array(verts * 2);
    const index: number[] = [];
    for (let k = 0; k <= segments; k++) {
      const s = (k / segments) * length;
      for (let j = 0; j < cols; j++) uv.set([j / (cols - 1), s], (k * cols + j) * 2);
      // wound so the front faces the way the strip's normal points
      if (k < segments)
        for (let j = 0; j + 1 < cols; j++) {
          const a = k * cols + j;
          index.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
        }
    }
    this.geometry.setIndex(index);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    this.uniforms = { uFeed: { value: 0 }, uFade: { value: 1 }, uLength: { value: length } };
    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          ...shared,
          ...this.uniforms,
          uSpot: lamp.uSpot,
          uLevel: lamp.uLevel,
          uNorm: lamp.uNorm,
          uPrint: { value: print },
          uRepeat: { value: repeat },
        },
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.layers.enable(MIRRORED);
    this.mesh.renderOrder = 1;
    this.shadow = caster(this.geometry, CAST_VERT, { ...shared, ...shades, uFade: this.uniforms.uFade, uLength: this.uniforms.uLength, uWork: { value: lamp.uSpot.value - 1 } });
  }

  /** Lay the strip along the curve: per point where its centre is, its
   *  bend (0 runs straight down the wall, a quarter turn straight out of
   *  it), its heading (the way it runs out, turned about the vertical: 0 is
   *  straight out of the wall, toward +x as it grows) and its twist about
   *  its own length. */
  lay(x: Float32Array, y: Float32Array, z: Float32Array, bend: Float32Array, heading: Float32Array, twist: Float32Array) {
    const cols = Ribbon.COLS;
    for (let k = 0; k <= this.segments; k++) {
      const sb = Math.sin(bend[k]);
      const cb = Math.cos(bend[k]);
      const sh = Math.sin(heading[k]);
      const ch = Math.cos(heading[k]);
      const st = Math.sin(twist[k]);
      const ct = Math.cos(twist[k]);
      // across the strip and its face, untwisted, then turned by the twist
      const nx = cb * sh;
      const nz = cb * ch;
      const ax = ct * ch + st * nx;
      const ay = st * sb;
      const az = -ct * sh + st * nz;
      const fx = -st * ch + ct * nx;
      const fy = ct * sb;
      const fz = st * sh + ct * nz;
      for (let j = 0; j < cols; j++) {
        // across it, and its edges curled up toward its face (a parabola)
        const u = j / (cols - 1) - 0.5;
        const t = u * this.width;
        const lift = this.bow * 4 * u * u;
        const slope = (this.bow * 8 * u) / this.width;
        const px = x[k] + ax * t + fx * lift;
        const py = y[k] + ay * t + fy * lift;
        const pz = z[k] + az * t + fz * lift;
        const mx = fx - ax * slope;
        const my = fy - ay * slope;
        const mz = fz - az * slope;
        const l = Math.hypot(mx, my, mz);
        this.pos.set([px, py, pz], (k * cols + j) * 3);
        this.nor.set([mx / l, my / l, mz / l], (k * cols + j) * 3);
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }
}
