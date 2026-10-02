/** The hex field's shaders. One vertex shader places and raises the columns;
 *  the fragment shader draws them in two passes: a solid one for columns that
 *  have "rendered", and an additive one for the pencil sketch and wireframe
 *  that come before. `vStage` runs 0 (sketch) through 1 (wire) to 2 (render),
 *  sweeping across the field from left to right. */

const COMMON = /* glsl */ `
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
`;

export const FIELD_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUV;
layout(location = 3) in float aTop;
layout(location = 4) in vec3 aInst;
uniform mat4 uViewProj;
uniform float uTime;
uniform float uRise;
uniform float uStage;
uniform vec3 uMouse;
uniform float uHalfWidth;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUV;
out vec2 vLocal;
out float vTop;
out float vSeed;
out float vStage;
out float vAcross;
${COMMON}
void main() {
  vec2 c = aInst.xy;
  float d = length(c * vec2(1.0, 0.75));
  // slow swells, and a ripple running out from the middle
  float h = 0.3 + 1.5 * vnoise(c * 0.075 + vec2(uTime * 0.035, 0.0)) + 0.55 * vnoise(c * 0.21 - uTime * 0.05);
  h += 0.25 * sin(d * 0.33 - uTime * 0.85);
  // the pointer lifts the columns under it
  vec2 m = c - uMouse.xy;
  h += 2.4 * exp(-dot(m, m) * 0.05) * uMouse.z;
  // the pencil writes left to right; wire and render spread from the middle
  vAcross = c.x / uHalfWidth * 0.5 + 0.5;
  vStage = clamp(uStage - 0.45 * clamp(d / (uHalfWidth * 1.1), 0.0, 1.0), 0.0, 2.0);
  // a column rises out of the floor once it has rendered, middle first
  float rise = clamp((uRise * 1.35 - d / uHalfWidth * 0.6) / 0.32, 0.0, 1.0);
  rise = rise * rise * (3.0 - 2.0 * rise) * smoothstep(1.55, 2.0, vStage);
  h *= mix(0.05, 1.0, rise);
  vec3 world = vec3(c.x + aPos.x * 0.9, mix(-4.0, h, aPos.y), c.y + aPos.z * 0.9);
  vWorld = world;
  vNormal = aNormal;
  vUV = aUV;
  vLocal = aPos.xz;
  vTop = aTop;
  vSeed = aInst.z;
  gl_Position = uViewProj * vec4(world, 1.0);
}
`;

export const FIELD_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUV;
in vec2 vLocal;
in float vTop;
in float vSeed;
in float vStage;
in float vAcross;
uniform vec3 uCam;
uniform float uTime;
uniform float uPass;
uniform float uDraw;
uniform vec3 uBg;
uniform vec3 uNear;
uniform vec3 uFar;
uniform vec3 uPencil;
uniform vec3 uWire;
out vec4 outColor;
${COMMON}
// flat-top hexagon, circumradius 1: 0 on the outline, growing inward
float hexEdge(vec2 p) {
  p = abs(p);
  return 0.8660254 - max(p.y, dot(p, vec2(0.8660254, 0.5)));
}
// a crisp line along e = 0, about a pixel and a half wide
float line(float e) {
  float w = fwidth(e) * 1.5;
  return 1.0 - smoothstep(w * 0.5, w, e);
}

void main() {
  float s = vStage;
  float fog = exp(-distance(vWorld, uCam) * 0.04);
  float eTop = vTop > 0.5 ? hexEdge(vLocal) : 1.0;
  float eSide = vTop > 0.5 ? 1.0 : min(vUV.x, 1.0 - vUV.x);
  float rendered = smoothstep(1.55, 2.0, s);
  vec3 edge = mix(uFar, uNear, fog);

  if (uPass < 0.5) {
    if (rendered < 0.5) discard;
    vec3 col;
    if (vTop > 0.5) {
      float lit = step(0.955, hash21(vec2(vSeed * 91.7, floor(uTime * 0.45 + vSeed * 3.0))));
      float pulse = lit * (0.5 + 0.5 * sin(uTime * 3.0 + vSeed * 40.0));
      col = vec3(0.012, 0.022, 0.032) + edge * (line(eTop) * 1.7 + exp(-eTop * 14.0) * 0.42 + pulse * 0.34);
    } else {
      float ndl = max(dot(vNormal, normalize(vec3(-0.45, 0.85, 0.35))), 0.0);
      float up = clamp((vWorld.y + 1.2) / 3.2, 0.0, 1.0);
      col = mix(vec3(0.003, 0.005, 0.008), vec3(0.026, 0.044, 0.058), up * up) * (0.5 + 0.8 * ndl);
      col += edge * line(eSide) * 0.08 * up;
    }
    col *= (rendered - 0.5) * 2.0;
    outColor = vec4(toSRGB(mix(uBg, col, fog)), 1.0);
  } else {
    // the pencil is drawn in left to right, slightly unsteady
    float drawn = smoothstep(vAcross - 0.06, vAcross, uDraw * 1.08);
    float wobble = (vnoise(vWorld.xz * 6.0 + vSeed * 10.0) - 0.5) * 0.08;
    float pencil = vTop > 0.5 ? line(abs(eTop - 0.03 + wobble)) * drawn : 0.0;
    // the columns reach down out of sight; their wire stops at the floor
    float wire = max(vTop > 0.5 ? line(eTop) : 0.0, line(eSide) * 0.4) * smoothstep(-0.9, 0.05, vWorld.y);
    float wSketch = 1.0 - smoothstep(0.55, 1.0, s);
    float wWire = smoothstep(0.55, 1.0, s) * (1.0 - rendered);
    vec3 col = (uPencil * pencil * wSketch * 0.5 + uWire * wire * wWire * 0.75) * fog;
    if (max(col.r, max(col.g, col.b)) < 0.002) discard;
    outColor = vec4(toSRGB(col), 1.0);
  }
}
`;

/** The sky behind the field: the page's colour with a glow on the horizon. */
export const SKY_VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.999, 1.0);
}
`;

export const SKY_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uHorizon;
uniform float uGlow;
uniform vec3 uBg;
uniform vec3 uNear;
uniform vec3 uFar;
out vec4 outColor;
${COMMON}
void main() {
  float above = vUv.y - uHorizon;
  vec3 col = uBg + (uFar * exp(-abs(above) * 16.0) * 0.07 + uNear * exp(-abs(above) * 46.0) * 0.05) * uGlow;
  col *= 1.0 - smoothstep(0.0, 0.6, above) * 0.7;
  outColor = vec4(toSRGB(col), 1.0);
}
`;
