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
  emit(albedo * (uAmbient * 4.0 + uLevel * (0.1 + 0.85 * lit)), a);
}
`;

const CAST_VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec2 uv;
uniform mat4 modelMatrix;
uniform int uWork;
uniform float uFade;
${LIGHT}
${CAST_GLSL}
void main() {
  vec3 w = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = fromLamp(uWork, w, uFade * smoothstep(0.0, 0.035, uv.y));
}
`;

/**
 * A strip of paper, laid along a curve each frame: across its width it
 * stays straight, so the curve lives in the plane x = x0 and every point
 * needs only its height, its distance out from the picture and its bend.
 * Lit by the print's spot; the print on it slides along as it feeds.
 */
export class Ribbon {
  readonly geometry = new THREE.BufferGeometry();
  readonly uniforms: { uFeed: { value: number }; uFade: { value: number } };
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
  ) {
    const verts = (segments + 1) * 2;
    this.pos = new Float32Array(verts * 3);
    this.nor = new Float32Array(verts * 3);
    const uv = new Float32Array(verts * 2);
    const index: number[] = [];
    for (let k = 0; k <= segments; k++) {
      const s = (k / segments) * length;
      uv.set([0, s, 1, s], k * 4);
      // wound so the front faces the way the strip's normal points
      if (k < segments) index.push(2 * k, 2 * k + 2, 2 * k + 1, 2 * k + 1, 2 * k + 2, 2 * k + 3);
    }
    this.geometry.setIndex(index);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    this.uniforms = { uFeed: { value: 0 }, uFade: { value: 1 } };
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
          uLength: { value: length },
        },
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.layers.enable(MIRRORED);
    this.mesh.renderOrder = 1;
    this.shadow = caster(this.geometry, CAST_VERT, { ...shared, ...shades, uFade: this.uniforms.uFade, uWork: { value: lamp.uSpot.value - 1 } });
  }

  /** Lay the strip along the curve: per point its height y, how far out from
   *  the picture it is (z), its bend (0 runs straight down the wall, a
   *  quarter turn straight out of it) and its twist about its own length. */
  lay(x0: number, y: Float32Array, z: Float32Array, bend: Float32Array, twist: Float32Array) {
    const h = this.width / 2;
    for (let k = 0; k <= this.segments; k++) {
      const sb = Math.sin(bend[k]);
      const cb = Math.cos(bend[k]);
      const st = Math.sin(twist[k]);
      const ct = Math.cos(twist[k]);
      // across the strip, and its face, turned by the twist
      const ax = ct * h;
      const ay = st * sb * h;
      const az = st * cb * h;
      this.pos.set([x0 - ax, y[k] - ay, z[k] - az, x0 + ax, y[k] + ay, z[k] + az], k * 6);
      this.nor.set([-st, ct * sb, ct * cb, -st, ct * sb, ct * cb], k * 6);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }
}
