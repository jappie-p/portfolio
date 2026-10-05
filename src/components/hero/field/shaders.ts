/** The hex field's shaders. One vertex shader places and raises the columns;
 *  the fragment shader draws them in two passes: a solid one for columns that
 *  have "rendered", and an additive one for the pencil sketch and wireframe
 *  that come before. `vStage` runs 0 (sketch) through 1 (wire) to 2 (render),
 *  sweeping across the field from left to right. Around the columns' own
 *  patch the sky pass draws the same cells as an endless flat floor, so the
 *  field runs all the way to the horizon. */

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

const HEX = /* glsl */ `
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
// a column's lit top: its outline, a soft halo inside it, and now and then a pulse
vec3 topColor(vec3 edge, float e, float seed) {
  float lit = step(0.955, hash21(vec2(seed * 91.7, floor(uTime * 0.45 + seed * 3.0))));
  float pulse = lit * (0.5 + 0.5 * sin(uTime * 3.0 + seed * 40.0));
  return vec3(0.012, 0.022, 0.032) + edge * (line(e) * 1.7 + exp(-e * 14.0) * 0.42 + pulse * 0.34);
}
`;

/** Needs uHorizon, uGlow, uBg, uNear and uFar declared before it. */
const SKY = /* glsl */ `
// the page's colour with a glow on the horizon, darker overhead: what the
// distance fades everything into
vec3 skyColor(float vy) {
  float above = vy - uHorizon;
  vec3 col = uBg + (uFar * exp(-abs(above) * 16.0) * 0.07 + uNear * exp(-abs(above) * 46.0) * 0.05) * uGlow;
  return col * (1.0 - smoothstep(0.0, 0.6, above) * 0.7);
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
uniform vec3 uRegion;
uniform float uFloorH;
uniform float uSettle;
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
  // toward the sides and the back of their patch the columns settle into
  // the flat floor that runs on around it
  float inner = min(uRegion.x - abs(c.x), c.y - uRegion.y);
  h = mix(uFloorH, h, smoothstep(0.0, uSettle, inner));
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
uniform float uHorizon;
uniform float uGlow;
uniform float uViewH;
out vec4 outColor;
${COMMON}
${HEX}
${SKY}
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
      col = topColor(edge, eTop, vSeed);
    } else {
      float ndl = max(dot(vNormal, normalize(vec3(-0.45, 0.85, 0.35))), 0.0);
      float up = clamp((vWorld.y + 1.2) / 3.2, 0.0, 1.0);
      col = mix(vec3(0.003, 0.005, 0.008), vec3(0.026, 0.044, 0.058), up * up) * (0.5 + 0.8 * ndl);
      col += edge * line(eSide) * 0.08 * up;
    }
    col *= (rendered - 0.5) * 2.0;
    // far away the columns fade into the sky behind them, horizon glow and all
    outColor = vec4(toSRGB(mix(skyColor(gl_FragCoord.y / uViewH), col, fog)), 1.0);
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

/** The sky behind the field, and the floor that carries the field on to the horizon. */
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
uniform vec3 uPencil;
uniform vec3 uWire;
uniform mat4 uInvViewProj;
uniform vec3 uCam;
uniform vec3 uRegion;
uniform float uHalfWidth;
uniform float uFloorY;
uniform float uTime;
uniform float uStage;
uniform float uDraw;
out vec4 outColor;
${COMMON}
${HEX}
${SKY}
// the hex cell a point on the floor lies in: its centre, and its axial q, r
// (the same grid the columns stand on: x = 1.5 q, z = sqrt(3) (r + q / 2))
vec2 hexCell(vec2 p, out vec2 qr) {
  float q = p.x * (2.0 / 3.0);
  float r = -p.x / 3.0 + p.y * 0.57735027;
  vec3 c = vec3(q, r, -q - r);
  vec3 k = floor(c + 0.5);
  vec3 off = abs(k - c);
  if (off.x > off.y && off.x > off.z) k.x = -k.y - k.z;
  else if (off.y > off.z) k.y = -k.x - k.z;
  qr = k.xy;
  return vec2(1.5 * k.x, 1.7320508 * (k.y + k.x * 0.5));
}

void main() {
  vec3 sky = skyColor(vUv.y);
  vec4 far = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = far.xyz / far.w - uCam;
  float t = dir.y < -1e-6 ? (uFloorY - uCam.y) / dir.y : -1.0;
  vec3 hit = uCam + dir * t;
  float dist = t > 0.0 ? length(hit - uCam) : 1e9;
  vec2 qr;
  vec2 cell = hexCell(hit.xz, qr);
  // above the horizon, past where anything shows, or on the columns' own
  // patch (they draw themselves there): just the sky
  bool own = abs(cell.x) <= uRegion.x && cell.y >= uRegion.y && cell.y <= uRegion.z;
  if (dist > 240.0 || own) {
    outColor = vec4(toSRGB(sky), 1.0);
    return;
  }
  float fog = exp(-dist * 0.04);
  float seed = hash21(qr);
  float e = hexEdge((hit.xz - cell) / 0.9);
  // where a cell is only a pixel or two tall, its lines would shimmer: blend
  // them into their average instead
  float detail = 1.0 - smoothstep(0.05, 0.22, fwidth(e));
  float onTop = smoothstep(-fwidth(e), fwidth(e), e);
  vec3 edge = mix(uFar, uNear, fog);
  vec3 gap = vec3(0.003, 0.005, 0.008);
  vec3 top = mix(gap, topColor(edge, max(e, 0.0), seed), onTop);
  vec3 even = mix(gap, vec3(0.012, 0.022, 0.032) + edge * 0.5, 0.81);
  vec3 floorCol = mix(even, top, detail);

  float d = length(cell * vec2(1.0, 0.75));
  float s = clamp(uStage - 0.45 * clamp(d / (uHalfWidth * 1.1), 0.0, 1.0), 0.0, 2.0);
  float rendered = smoothstep(1.55, 2.0, s);
  vec3 col = rendered < 0.5 ? sky : mix(sky, floorCol * (rendered - 0.5) * 2.0, fog);
  // before it renders, the floor is sketched and wired like the columns
  float across = clamp(cell.x / uHalfWidth * 0.5 + 0.5, 0.0, 1.0);
  float drawn = smoothstep(across - 0.06, across, uDraw * 1.08);
  float wobble = (vnoise(hit.xz * 6.0 + seed * 10.0) - 0.5) * 0.08;
  float pencil = line(abs(e - 0.03 + wobble)) * drawn;
  float wire = line(abs(e));
  float wSketch = 1.0 - smoothstep(0.55, 1.0, s);
  float wWire = smoothstep(0.55, 1.0, s) * (1.0 - rendered);
  col += (uPencil * pencil * wSketch * 0.5 + uWire * wire * wWire * 0.75) * fog * detail;
  outColor = vec4(toSRGB(col), 1.0);
}
`;
