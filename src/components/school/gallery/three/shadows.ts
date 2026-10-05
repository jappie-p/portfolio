import * as THREE from "three";
import type { Room } from "../layout";

/** Layer of the breakout pieces as their lamps see them: only the shadow pass draws it. */
export const SHADE = 2;
/** One tile per print; the card has nothing breaking out. */
export const TILES = 3;
const RES = 576;
/** Each tile's side, metres: the print, the wall beside it, and the long
 *  drop below where the shadows of pieces far out of the picture land. */
const SPAN = 3.2;

/** How much of a print's spot the pieces block at p: p as the lamp sees it on
 *  the wall's plane, looked up in that print's tile and softened a touch.
 *  Comes after LIGHT, whose lamps it uses. */
export const SHADE_GLSL = /* glsl */ `
uniform sampler2D uShade;
uniform vec4 uShadeRect[${TILES}];
float shade(int w, vec3 p) {
  if (w < 0 || w >= ${TILES}) return 0.0;
  vec3 L = uSpotPos[w + 1];
  vec2 q = L.xy + (p.xy - L.xy) * (L.z / max(L.z - p.z, 1e-3));
  vec2 t = (q - uShadeRect[w].xy) / uShadeRect[w].zw;
  if (min(t.x, t.y) <= 0.0 || max(t.x, t.y) >= 1.0) return 0.0;
  vec2 uv = vec2((float(w) + t.x) / ${TILES}.0, t.y);
  vec2 e = vec2(0.6 / ${RES * TILES}.0, 0.6 / ${RES}.0);
  return 0.25 * (textureLod(uShade, uv + e, 0.0).r + textureLod(uShade, uv - e, 0.0).r +
    textureLod(uShade, uv + vec2(e.x, -e.y), 0.0).r + textureLod(uShade, uv - vec2(e.x, -e.y), 0.0).r);
}
`;

/** The caster's side: a world point seen from print w's lamp, flattened onto
 *  the wall's plane and into its tile. Exact through the perspective divide
 *  (w: how much further out from the wall the lamp is), so long pieces stay
 *  straight. */
export const CAST_GLSL = /* glsl */ `
uniform vec4 uShadeRect[${TILES}];
out vec2 vTile;
out float vOut;
out float vWeight;
// weight: how dark a shadow it throws, 0..1 (a speck throws a faint one)
vec4 fromLamp(int w, vec3 p, float weight) {
  vec3 L = uSpotPos[w + 1];
  float s = max(L.z - p.z, 1e-3);
  vec4 r = uShadeRect[w];
  vec2 ts = (p.xy * L.z - L.xy * p.z - r.xy * s) / r.zw;
  vTile = ts / s;
  vOut = p.z;
  vWeight = weight;
  return vec4(((float(w) * s + ts.x) / ${TILES}.0) * 2.0 - s, ts.y * 2.0 - s, 0.0, s);
}
`;

/** The caster's fragment, inside its own tile only: full cover close to the
 *  wall, less the further out it floats, where the room's bounce light
 *  reaches in under it and the lamp's width blurs its edge. */
export const CAST_FRAG = /* glsl */ `precision highp float;
in vec2 vTile;
in float vOut;
in float vWeight;
out highp vec4 fragColor;
void main() {
  if (min(vTile.x, vTile.y) <= 0.0 || max(vTile.x, vTile.y) >= 1.0) discard;
  fragColor = vec4(vWeight * (1.0 - 0.6 * smoothstep(0.03, 0.3, vOut)));
}
`;

/** A piece as its lamp sees it: drawn only in the shadow pass, where every
 *  caster keeps the darkest cover at each point (max blending), so pieces
 *  crossing in the lamp's view never stack into a darker shadow. Its vertex
 *  shader places it with fromLamp(). */
export function caster(geometry: THREE.BufferGeometry, vertexShader: string, uniforms: Record<string, THREE.IUniform>) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader,
      fragmentShader: CAST_FRAG,
      uniforms,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
    }),
  );
  mesh.frustumCulled = false;
  mesh.layers.set(SHADE);
  return mesh;
}

/**
 * Where the pieces that break out of the prints block their spot, drawn each
 * frame as each lamp sees them, flat on the wall's plane: one tile per print
 * covering it and the wall round it (shadows fall down and out from the
 * lamp). The wall, the mat and the print look it up; coverage only, since
 * the pieces always float in front of what they shade.
 */
export class Shades {
  readonly target = new THREE.WebGLRenderTarget(RES * TILES, RES, {
    format: THREE.RedFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  readonly uniforms = {
    uShade: { value: this.target.texture as THREE.Texture },
    uShadeRect: { value: Array.from({ length: TILES }, () => new THREE.Vector4(0, -20, 1, 1)) },
  };
  private readonly eye = new THREE.Camera();
  private readonly keep = new THREE.Color();

  constructor() {
    this.eye.layers.set(SHADE);
  }

  /** Each tile covers its print, the wall beside it and the drop below it. */
  place(room: Room) {
    room.works.slice(0, TILES).forEach((w, i) => this.uniforms.uShadeRect.value[i].set(w.x - SPAN / 2, w.y - SPAN * 0.72, SPAN, SPAN));
  }

  render(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
    const before = gl.getRenderTarget();
    const alpha = gl.getClearAlpha();
    gl.getClearColor(this.keep);
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(this.target);
    if (!gl.autoClear) gl.clear();
    gl.render(scene, this.eye);
    gl.setClearColor(this.keep, alpha);
    gl.setRenderTarget(before);
  }

  dispose() {
    this.target.dispose();
  }
}
