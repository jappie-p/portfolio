import { WALL } from "./layout";

/** Steady glow around the three impact points (world space). */
export const HEAT_GLSL = /* glsl */ `
uniform vec4 uImpacts[3];
float cyHeat(vec3 p) {
  float h = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 d = p - uImpacts[i].xyz;
    h += uImpacts[i].w * exp(-dot(d, d) * 0.85);
  }
  return h;
}
`;

/** How cells react, in wall-local (s, height) space around each cell centre:
 *  red shockwave rings and a spring knock-back where a salvo lands, the
 *  firewall's cyan pushback wave from the core, the power-on sweep that lights
 *  the wall column by column, the green all-clear sweep at the end, and cells
 *  lifting toward the cursor. Shared by vertex and fragment stages. */
export const JUICE_GLSL = /* glsl */ `
uniform float uTime;
uniform vec4 uHits[3];
uniform vec2 uPulse;
uniform float uBoot;
uniform vec3 uCursor;
uniform float uClear;
uniform vec3 uPing;
const vec2 CY_CORE = vec2(0.0, ${WALL.coreY.toFixed(3)});
float cyOn(float s) { return 1.0 - smoothstep(uBoot - 0.8, uBoot, s); }
float cyFlash(float s) { float k = (s - uBoot) / 0.45; return exp(-k * k); }
float cyRipple(vec2 c) {
  float r = 0.0;
  for (int i = 0; i < 3; i++) {
    float dt = uTime - uHits[i].z;
    if (dt < 0.0 || dt > 2.4) continue;
    float k = (distance(c, uHits[i].xy) - dt * 7.0) / 0.6;
    r += uHits[i].w * exp(-k * k) * exp(-dt * 1.5);
  }
  return r;
}
float cyWave(vec2 c) {
  float dt = uTime - uPulse.x;
  if (dt < 0.0 || dt > 3.0) return 0.0;
  float k = (distance(c, CY_CORE) - dt * 6.5) / 0.7;
  return uPulse.y * exp(-k * k) * exp(-dt * 0.7);
}
float cyCursor(vec2 c) {
  vec2 d = c - uCursor.xy;
  return uCursor.z * exp(-dot(d, d) * 2.2);
}
float cyPing(vec2 c) {
  float dt = uTime - uPing.z;
  if (dt < 0.0 || dt > 2.0) return 0.0;
  float k = (distance(c, uPing.xy) - dt * 8.0) / 0.55;
  return exp(-k * k) * exp(-dt * 1.4) + exp(-distance(c, uPing.xy) * 3.0) * exp(-dt * 6.0);
}
float cyClear(vec2 c) {
  float dt = uTime - uClear;
  if (dt < 0.0 || dt > 3.5) return 0.0;
  float k = (distance(c, CY_CORE) - dt * 9.0) / 0.9;
  return exp(-k * k) * exp(-dt * 0.35);
}
float cyKnock(vec2 c) {
  float z = 0.0;
  for (int i = 0; i < 3; i++) {
    float dt = uTime - uHits[i].z;
    if (dt < 0.0 || dt > 2.0) continue;
    float d = distance(c, uHits[i].xy);
    z -= uHits[i].w * exp(-d * d * 0.5) * exp(-dt * 5.0) * cos(dt * 26.0) * 0.17;
  }
  z -= cyRipple(c) * 0.05;
  z += cyWave(c) * 0.13;
  z += cyCursor(c) * 0.16;
  z += cyPing(c) * 0.1;
  z += cyClear(c) * 0.08;
  z += (cyOn(c.x) - 1.0) * 0.28;
  return z;
}
`;

export const HASH_GLSL = /* glsl */ `
float cyHash(float n) { return fract(sin(n) * 43758.5453123); }
float cyHash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float cyNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(cyHash(i), cyHash(i + 1.0), f * f * (3.0 - 2.0 * f));
}
`;

/** Wall instancing inputs, shared by the bezel, face and module materials. */
export const WALL_VERT_DECL = /* glsl */ `
attribute float aS;
attribute float aSeed;
attribute float aIcon;
attribute vec2 aCenter;
varying vec3 vCyWorld;
varying vec2 vCyLocal;
varying vec2 vCyCenter;
varying float vCyS;
varying float vCySeed;
varying float vCyIcon;
${JUICE_GLSL}
`;

/** Cells (not the machinery behind them) get knocked, popped and powered. */
export const WALL_VERT_DISPLACE = /* glsl */ `
transformed.z += cyKnock(aCenter);
`;

export const WALL_VERT_BODY = /* glsl */ `
vec4 cyW = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  cyW = instanceMatrix * cyW;
#endif
cyW = modelMatrix * cyW;
vCyWorld = cyW.xyz;
vCyLocal = position.xy;
vCyCenter = aCenter;
vCyS = aS;
vCySeed = aSeed;
vCyIcon = aIcon;
`;

export const WALL_FRAG_DECL = /* glsl */ `
varying vec3 vCyWorld;
varying vec2 vCyLocal;
varying vec2 vCyCenter;
varying float vCyS;
varying float vCySeed;
varying float vCyIcon;
${HEAT_GLSL}
${JUICE_GLSL}
`;

/** Colour of the wall by position: green/cyan on the trusted side, red where the floods land. */
export const WALL_TINT_GLSL = /* glsl */ `
vec3 cyTint(float s) {
  vec3 cool = mix(vec3(0.15, 1.0, 0.5), vec3(0.2, 0.62, 1.0), smoothstep(-2.6, -0.4, s));
  return mix(cool, vec3(1.0, 0.1, 0.18), smoothstep(0.9, 2.8, s));
}
`;
