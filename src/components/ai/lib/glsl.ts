// Small GLSL helpers shared by the AI scene's materials.

export const HASH = /* glsl */ `
float hash11(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float hash31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
`;

/** Value noise and a three-octave fbm, for the nebula and the light shafts. */
export const NOISE = /* glsl */ `
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i), n100 = hash31(i + vec3(1, 0, 0)), n010 = hash31(i + vec3(0, 1, 0)), n110 = hash31(i + vec3(1, 1, 0));
  float n001 = hash31(i + vec3(0, 0, 1)), n101 = hash31(i + vec3(1, 0, 1)), n011 = hash31(i + vec3(0, 1, 1)), n111 = hash31(i + vec3(1, 1, 1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; }
  return s;
}
`;

/** Power-on: things light up as the front passes their distance from the core. */
export const BOOT = /* glsl */ `
float bootMask(float dist, float front) { return 1.0 - smoothstep(front - 2.5, front - 0.5, dist); }
`;

/** A ring-shaped pulse running outward from the core after a wake event. */
export const WAKE = /* glsl */ `
float wakeRing(float dist, vec2 wake, float time) {
  float age = time - wake.x;
  if (age < 0.0 || age > 3.0) return 0.0;
  float r = age * 7.5;
  return wake.y * exp(-pow((dist - r) * 0.9, 2.0)) * (1.0 - age / 3.0);
}
`;
