import * as THREE from "three";
import { DRUZY_AT, QUARTZ_AT } from "../textures/agate";
import { SNOISE } from "./glsl";
import { patchMaterial } from "./patch";

/** Cells of the druzy hollow on a jittered grid: the offset from the
 *  nearest crystal's apex, a random id, and how far to the next crystal. */
const DRUZY_PARS = /* glsl */ `
vec2 dz_hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
vec4 druzyCell(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float best = 8.0;
  float second = 8.0;
  vec3 near = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 h = dz_hash2(i + g);
      vec2 d = f - g - h;
      float dd = dot(d, d);
      if (dd < best) {
        second = best;
        best = dd;
        near = vec3(d, h.x);
      } else if (dd < second) {
        second = dd;
      }
    }
  }
  return vec4(near, sqrt(second) - sqrt(best));
}
`;

/** Which band we are on, and how far into the druzy hollow. */
const BANDS = /* glsl */ `
vec2 faceUv = (vFace - uBounds.xy) / uBounds.zw;
float bandDepth = texture2D(uDepthMap, faceUv).r;
// bands thicken and thin a little along their length
float bandAt = bandDepth + snoise(vec3(vFace * 0.8, 1.7)) * 0.004;
float druzy = smoothstep(uDruzyAt, uDruzyAt + 0.03, bandDepth);
float quartz = smoothstep(uQuartzAt, uQuartzAt + 0.02, bandDepth) * (1.0 - druzy);
diffuseColor.rgb = texture2D(uReflect, vec2(bandAt, 0.5)).rgb * uFront;
`;

/**
 * Each tiny quartz crystal in the hollow is a three-sided point at a random
 * lean: its facets are little mirrors, so a few of them always catch a
 * light and the hollow sparkles, from reflection alone.
 */
const FACETS = /* glsl */ `
float cellShade = 1.0;
if (druzy > 0.0) {
  vec4 cell = druzyCell(vFace * uCells);
  float a = atan(cell.y, cell.x) + cell.z * 6.2832;
  float side = floor(a / 2.0944) * 2.0944 + 1.0472 - cell.z * 6.2832;
  vec2 lean = (dz_hash2(vec2(cell.z * 91.7, 3.1)) - 0.5) * 1.2;
  vec2 slope = (vec2(cos(side), sin(side)) * 1.1 + lean) * druzy;
  normal = normalize(normal + vTanX * slope.x + vTanY * slope.y);
  // the gaps between crystals are in shade, and the hollow deepens inward
  cellShade = mix(1.0, (0.45 + 0.55 * smoothstep(0.0, 0.12, cell.w)) * (1.0 - 0.5 * smoothstep(uDruzyAt, 1.0, bandDepth)), druzy);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.62, 0.6) * cellShade, druzy);
}
`;

/** The polish, a touch less on the crystal tips, which mirror more. */
const ROUGH = /* glsl */ `
roughnessFactor = mix(roughnessFactor, uDruzyRough, druzy);
`;
const MIRROR = /* glsl */ `
metalnessFactor = mix(metalnessFactor, 0.6, druzy);
`;

/**
 * Light through the slice from behind: the bands glow in their own colour,
 * honey and carnelian warm, chalcedony cool, white bands nearly opaque.
 */
const GLOW = /* glsl */ `
#ifdef USE_ENVMAP
{
  vec3 behind = getIBLIrradiance(-geometryNormal) * RECIPROCAL_PI;
  // seen through a few mm of stone, the bands are a little soft
  vec3 tint = texture2D(uGlowMap, vec2(bandAt, 0.5), 1.0).rgb;
  // the softbox sits behind the upper middle: the slice glows most there,
  // less toward the rind and down into the stand's shadow
  vec2 c = faceUv * 2.0 - 1.0;
  float spot = (0.35 + 0.65 * smoothstep(1.15, 0.0, length(c - vec2(0.05, 0.25)))) * smoothstep(-1.05, -0.3, c.y);
  // cut a little wedge-shaped, and cloudy in places
  float wedge = 0.7 + 0.3 * faceUv.x;
  float cloud = 0.75 + 0.5 * clamp(0.5 + fbm3(vec3(vFace * 0.6, 3.0)), 0.0, 1.0);
  // quartz grows as grains, each glowing a little differently
  vec4 grain = druzyCell(vFace * uCells * 0.8);
  float grains = mix(1.0, 0.88 + 0.24 * fract(grain.z * 7.31) * smoothstep(0.0, 0.06, grain.w), quartz);
  totalDiffuse += behind * tint * uGlow * spot * wedge * cloud * grains * mix(1.0, 0.6 * cellShade, druzy);
}
#endif
`;

export interface AgateMaps {
  depth: THREE.Texture;
  reflect: THREE.Texture;
  glow: THREE.Texture;
  /** the face's extent in cm: min x, min y, width, height */
  bounds: THREE.Vector4;
}

/** The slice's polished faces: banded, backlit, a sparkling hollow. */
export function agateFaceMaterial(maps: AgateMaps): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.07,
    metalness: 0,
    ior: 1.54,
    specularIntensity: 1,
  });
  return patchMaterial(material, "stones-agate", {
    uniforms: {
      uDepthMap: { value: maps.depth },
      uReflect: { value: maps.reflect },
      uGlowMap: { value: maps.glow },
      uBounds: { value: maps.bounds },
      uDruzyAt: { value: DRUZY_AT },
      uQuartzAt: { value: QUARTZ_AT },
      uDruzyRough: { value: 0.12 },
      uCells: { value: 9 },
      uGlow: { value: 2.4 },
      uFront: { value: 0.18 },
    },
    vertexHead: "varying vec2 vFace;\nvarying vec3 vTanX;\nvarying vec3 vTanY;",
    vertex: "vFace = position.xy;\nvTanX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));\nvTanY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));",
    fragmentHead: /* glsl */ `
      uniform sampler2D uDepthMap;
      uniform sampler2D uReflect;
      uniform sampler2D uGlowMap;
      uniform vec4 uBounds;
      uniform float uDruzyAt;
      uniform float uQuartzAt;
      uniform float uDruzyRough;
      uniform float uCells;
      uniform float uGlow;
      uniform float uFront;
      varying vec2 vFace;
      varying vec3 vTanX;
      varying vec3 vTanY;
      ${SNOISE}
      ${DRUZY_PARS}
    `,
    after: { color_fragment: BANDS, roughnessmap_fragment: ROUGH, metalnessmap_fragment: MIRROR, normal_fragment_maps: FACETS },
    replace: { transmission_fragment: `#include <transmission_fragment>\n${GLOW}` },
  });
}
