// Shared GLSL for the gallery. Every material is a GLSL 3 RawShaderMaterial,
// so one program serves both the screen and the floor's reflection pass:
// `uScreen` picks the output (a soft shoulder and sRGB for the screen, linear
// light for the reflection) instead of three.js compiling a variant per target.

export const SPOTS = 5;
/** Coloured light some works give off themselves (Zelda's fireflies, the
 *  festival's neon and its stage's violet), soft and wide, bleeding onto
 *  the wall and the floor. */
export const GLOWS = 3;

export const HEAD = /* glsl */ `precision highp float;
precision highp int;
`;

/** Model to world and clip, with the world position (and normal) passed on. */
export const VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec3 normal;
in vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const OUT = /* glsl */ `
uniform float uScreen;
out highp vec4 fragColor;
// linear up to the knee, then a soft roll-off: the prints keep their colour,
// only the hottest light compresses
vec3 shoulder(vec3 c) {
  const float k = 0.74;
  vec3 over = max(c - k, 0.0);
  return min(c, vec3(k)) + (1.0 - k) * (1.0 - exp(-over / (1.0 - k)));
}
vec3 toSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
// interleaved gradient noise: breaks up banding in the dark gradients
float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5;
}
void emit(vec3 c, float a) {
  if (uScreen > 0.5) fragColor = vec4(toSRGB(shoulder(c)) + dither(gl_FragCoord.xy) / 255.0, a);
  else fragColor = vec4(c, a);
}
// light added over what is already there (beams, dust, glows): no dither,
// and the faintest values dropped, or every quad's edge would show
void glow(vec3 c) {
  c = max(c - 0.0004, 0.0);
  fragColor = vec4(uScreen > 0.5 ? toSRGB(c) : c, 1.0);
}
`;

/** The ceiling spots: warm, soft-edged, falling off with distance. */
export const LIGHT = /* glsl */ `
#define SPOTS ${SPOTS}
uniform vec3 uSpotPos[SPOTS];
uniform vec3 uSpotDir[SPOTS];
uniform vec3 uSpotCol[SPOTS];
uniform vec2 uSpotCone[SPOTS];
uniform vec3 uAmbient;
// light reaching p from spot i, and the direction toward the lamp
vec3 spot(int i, vec3 p, out vec3 L) {
  vec3 d = uSpotPos[i] - p;
  float d2 = dot(d, d);
  L = d * inversesqrt(d2);
  float c = smoothstep(uSpotCone[i].x, uSpotCone[i].y, dot(-L, uSpotDir[i]));
  return uSpotCol[i] * (c * c) / d2;
}
#define GLOWS ${GLOWS}
uniform vec3 uGlowPos[GLOWS];
uniform vec3 uGlowCol[GLOWS];
// the coloured light the works give off, reaching a surface at p facing n
vec3 glows(vec3 p, vec3 n) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < GLOWS; i++) {
    vec3 d = uGlowPos[i] - p;
    float d2 = dot(d, d);
    sum += uGlowCol[i] * max(dot(n, d * inversesqrt(d2)), 0.0) / (d2 + 0.3);
  }
  return sum;
}
`;

/** Tileable value noise from the shared noise texture. */
export const NOISE = /* glsl */ `
uniform sampler2D uNoise;
vec4 grain(vec2 p) { return texture(uNoise, p); }
`;
