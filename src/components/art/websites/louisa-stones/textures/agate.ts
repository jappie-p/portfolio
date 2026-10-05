import * as THREE from "three";
import { mulberry32 } from "../../lib/rng";
import { SNOISE } from "../materials/glsl";
import { bake } from "./bake";

/** Where crystalline quartz gives way to the druzy hollow, as band depth. */
export const DRUZY_AT = 0.8;
/** Where the banded chalcedony ends and quartz grows inward. */
export const QUARTZ_AT = 0.68;

const SIZE = 2048;

/** Smooth 1D value noise in 0..1. */
function noise1(seed: number) {
  const rnd = mulberry32(seed);
  const lattice = Float32Array.from({ length: 4096 }, () => rnd());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = lattice[i & 4095];
    const b = lattice[(i + 1) & 4095];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const mixColor = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);
const lin = (hex: string) => new THREE.Color(hex);

// lit from the front: clear chalcedony looks dark (light passes into it),
// milky bands white; iron stains both toward amber
const CLEAR_GREY = lin("#5a6470");
const CLEAR_AMBER = lin("#6d4424");
const MILK_GREY = lin("#d8d4cd");
const MILK_AMBER = lin("#dcc2a2");
// lit from behind: clear chalcedony glows, milky bands scatter it away
const GLOW_COOL = lin("#f2dcb8");
const GLOW_HONEY = lin("#ff8a2a");
const GLOW_MILK = lin("#776f66");
const RIND = lin("#3e3129");
const RIND_GLOW = lin("#140a04");
const QUARTZ = lin("#a3a9ae");
const QUARTZ_GLOW = lin("#f3f1ec");

/**
 * The bands from the rind inward, as two 1D textures indexed by depth: how
 * each looks lit from the front, and the colour light takes on shining
 * through it. Chalcedony is laid down in hundreds of fine laminae of
 * varying milkiness, with a few crisp white bands and iron-stained honey
 * zones, then clear quartz grows into the hollow.
 */
export function bandTextures(seed: number): { reflect: THREE.DataTexture; glow: THREE.DataTexture } {
  const rnd = mulberry32(seed + 9);
  const n1 = noise1(seed + 1);
  const n2 = noise1(seed + 2);
  const n3 = noise1(seed + 3);
  const iron = noise1(seed + 4);
  const whites = Array.from({ length: 6 }, () => ({ at: 0.06 + rnd() * 0.58, w: 0.002 + rnd() * 0.008 }));
  const reflect = new Uint8Array(SIZE * 4);
  const glow = new Uint8Array(SIZE * 4);
  const srgb = { r: 0, g: 0, b: 0 };
  const put = (data: Uint8Array, i: number, c: THREE.Color) => {
    c.getRGB(srgb, THREE.SRGBColorSpace);
    data.set([srgb.r * 255, srgb.g * 255, srgb.b * 255, 255].map((v) => Math.min(255, Math.max(0, v))), i * 4);
  };
  for (let i = 0; i < SIZE; i++) {
    const t = i / (SIZE - 1);
    let milk = smooth(0.32, 0.78, 0.5 * n1(t * 26) + 0.32 * n2(t * 170) + 0.18 * n3(t * 950));
    for (const b of whites) milk = Math.max(milk, 1 - smooth(b.w * 0.5, b.w, Math.abs(t - b.at)));
    // iron everywhere a little (natural agate glows warm), richly in zones
    const fe = 0.25 + 0.75 * smooth(0.35, 0.7, iron(t * 7 + 3)) * (0.7 + 0.3 * n3(t * 300));
    let r = mixColor(mixColor(CLEAR_GREY, CLEAR_AMBER, fe), mixColor(MILK_GREY, MILK_AMBER, fe), milk);
    let g = mixColor(mixColor(GLOW_COOL, GLOW_HONEY, fe), GLOW_MILK, milk).multiplyScalar(1 - 0.7 * milk);
    const rind = 1 - smooth(0.014, 0.026, t);
    r = mixColor(r, RIND, rind);
    g = mixColor(g, RIND_GLOW, rind);
    const quartz = smooth(QUARTZ_AT, QUARTZ_AT + 0.02, t);
    r = mixColor(r, QUARTZ, quartz);
    g = mixColor(g, QUARTZ_GLOW, quartz);
    put(reflect, i, r);
    put(glow, i, g);
  }
  const make = (data: Uint8Array) => {
    const tex = new THREE.DataTexture(data, SIZE, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  };
  return { reflect: make(reflect), glow: make(glow) };
}

const POINTS = 160;

/** Depth into the nodule (0 at the rind, 1 deepest), from the exact distance
 *  to the outline, so bands turn the sharp corners of fortification agate;
 *  measured from a slightly warped point, so they waver like real ones. */
const DEPTH = /* glsl */ `
uniform vec2 uOutline[${POINTS}];
uniform vec4 uBounds;
uniform float uDepth;
uniform float uSeed;
varying vec2 vUv;
${SNOISE}
float rim(vec2 p) {
  float d = 1e9;
  for (int i = 0; i < ${POINTS}; i++) {
    vec2 a = uOutline[i];
    vec2 ab = uOutline[(i + 1) % ${POINTS}] - a;
    vec2 pa = p - a;
    d = min(d, length(pa - ab * clamp(dot(pa, ab) / dot(ab, ab), 0.0, 1.0)));
  }
  return d / uDepth;
}
void main() {
  vec2 p = uBounds.xy + vUv * uBounds.zw;
  vec2 q = p / uDepth;
  vec2 warp = vec2(snoise(vec3(q * 1.2, uSeed)), snoise(vec3(q * 1.2 + 7.1, uSeed))) * 0.06
    + vec2(snoise(vec3(q * 4.5, uSeed + 3.0)), snoise(vec3(q * 4.5 + 2.3, uSeed + 3.0))) * 0.012;
  float d0 = rim(p);
  float d = rim(p + warp * uDepth * smoothstep(0.02, 0.12, d0));
  gl_FragColor = vec4(d, 0.0, 0.0, 1.0);
}
`;

/** Bake the depth field of a slice's face (bounds: min x, min y, width, height in cm). */
export async function bakeAgateDepth(gl: THREE.WebGLRenderer, outline: THREE.Vector2[], bounds: THREE.Vector4, depth: number, seed: number) {
  const pts = Array.from({ length: POINTS }, (_, i) => outline[Math.floor((i * outline.length) / POINTS)].clone());
  return bake(gl, DEPTH, {
    size: 1024,
    type: THREE.HalfFloatType,
    wrap: THREE.ClampToEdgeWrapping,
    uniforms: { uOutline: { value: pts }, uBounds: { value: bounds }, uDepth: { value: depth }, uSeed: { value: seed * 0.37 } },
  });
}
