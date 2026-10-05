/** 3D simplex noise (after Ashima Arts and Stefan Gustavson, MIT), about
 *  -1..1, for stone patterns laid out in the stone's own space. */
export const SNOISE = /* glsl */ `
vec3 sn_mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 sn_mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 sn_permute(vec4 x) { return sn_mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = sn_mod289(i);
  vec4 p = sn_permute(sn_permute(sn_permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec3 ns = 0.142857142857 * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm3(vec3 p) {
  return snoise(p) * 0.5 + snoise(p * 2.03 + 11.1) * 0.25 + snoise(p * 4.11 + 23.7) * 0.125;
}
`;

/**
 * The colour a narrow band of light around `nm` looks, in linear sRGB:
 * the CIE 1931 matching functions (Wyman, Sloan and Shirley's fit), three
 * samples wide, so interference colours come out vivid but not neon.
 */
export const SPECTRAL = /* glsl */ `
float sp_g(float x, float mu, float s1, float s2) {
  float t = (x - mu) / (x < mu ? s1 : s2);
  return exp(-0.5 * t * t);
}
vec3 sp_xyz(float w) {
  return vec3(
    1.056 * sp_g(w, 599.8, 37.9, 31.0) + 0.362 * sp_g(w, 442.0, 16.0, 26.7) - 0.065 * sp_g(w, 501.1, 20.4, 26.2),
    0.821 * sp_g(w, 568.8, 46.9, 40.5) + 0.286 * sp_g(w, 530.9, 16.3, 31.1),
    1.217 * sp_g(w, 437.0, 11.8, 36.0) + 0.681 * sp_g(w, 459.0, 26.0, 13.8)
  );
}
vec3 spectral(float nm) {
  vec3 xyz = (sp_xyz(nm - 22.0) + sp_xyz(nm) + sp_xyz(nm + 22.0)) / 3.0;
  vec3 rgb = mat3(3.2406, -0.9689, 0.0557, -1.5372, 1.8758, -0.2040, -0.4986, 0.0415, 1.0570) * xyz;
  return max(rgb, 0.0);
}
`;
