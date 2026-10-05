// GLSL the breakout pieces share.

/** A turn by `a` radians about the unit axis `k` (Rodrigues). */
export const TURN = /* glsl */ `
mat3 turn(vec3 k, float a) {
  float c = cos(a);
  float s = sin(a);
  float t = 1.0 - c;
  return mat3(t * k.x * k.x + c, t * k.x * k.y + s * k.z, t * k.x * k.z - s * k.y,
              t * k.x * k.y - s * k.z, t * k.y * k.y + c, t * k.y * k.z + s * k.x,
              t * k.x * k.z + s * k.y, t * k.y * k.z - s * k.x, t * k.z * k.z + c);
}
`;

/** Light from a print's own spot, scaled to the print's exposure (uNorm: 1
 *  over the spot's shape at the picture's centre), so what breaks out of a
 *  picture reads as cut from it. After LIGHT. */
export const EXPOSE = /* glsl */ `
uniform int uSpot;
uniform float uLevel;
uniform float uNorm;
// how much of the spot reaches p, and the way to the lamp
float reach(vec3 p, out vec3 L) {
  vec3 dl = uSpotPos[uSpot] - p;
  L = normalize(dl);
  float cone = smoothstep(uSpotCone[uSpot].x, uSpotCone[uSpot].y, dot(-L, uSpotDir[uSpot]));
  return cone * cone / dot(dl, dl) * uNorm;
}
// what falls on a surface at p facing n
float exposed(vec3 p, vec3 n, out vec3 L) {
  return reach(p, L) * max(dot(n, L), 0.0);
}
`;
