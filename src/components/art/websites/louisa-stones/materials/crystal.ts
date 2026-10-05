import * as THREE from "three";
import { SNOISE } from "./glsl";

export interface CrystalLook {
  /** absorption per cm of stone crossed (Beer-Lambert), per channel */
  absorb: THREE.Vector3;
  /** reflectance head on: ((n - 1) / (n + 1))^2, 0.045 for quartz */
  f0: number;
  /** how far the faces waver from flat (normal tilt) */
  wave: number;
  /** light scattered inside by colour centres: never quite black */
  milk: THREE.Color;
  /** milky veils inside: how dense, and how far up each point (0..1 of its
   *  length, from the geometry's aZone) its cloudy foot reaches */
  veils: number;
  cloud: number;
  /** how far striations tilt the prism faces (0: too small to see) */
  striae?: number;
  /** below 1 for a stone out beyond the pool of light */
  light?: number;
}

const ENTRY = "vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float ior, mat4 modelMatrixInverse) {";
const HIT = "bvhIntersectFirstHit( bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist );";
const OUT = "gl_FragColor = vec4(mix(diffuseColor.rgb, vec3(1.0), nFresnel), diffuseColor.a);";
const NORMAL = "vec3 normal = vNormal;";
const VERTEX_PARS = "#include <color_pars_vertex>";
const VERTEX = "#include <color_vertex>";

const PARS = /* glsl */ `
uniform vec3 uAbsorb;
uniform float uF0;
uniform float uWave;
uniform vec3 uMilk;
uniform vec3 uVeils;
uniform float uLight;
uniform vec2 uStriae;
varying float vZone;
varying vec3 vAxis;
${SNOISE}
float stonePath = 0.0;
float stoneVeil = 0.0;
`;

/**
 * Along the first run of each ray through the stone: how much milky veil it
 * crossed. Natural quartz is never flawless: thin sheets of tiny inclusions
 * catch the studio light as white wisps inside.
 */
const VEILS = /* glsl */ `
stonePath += dist;
if (i < 0.5 && uVeils.x > 0.0) {
  for (int k = 0; k < 3; k++) {
    vec3 vp = rayOrigin + rayDirection * dist * (float(k) + 0.5) / 3.0;
    // two old healed fractures: thin wavering sheets, fading out at their edges
    float w = snoise(vp * 1.1) * 0.12;
    float sheet = (1.0 - smoothstep(0.0, 0.16, abs(dot(vp, vec3(0.42, 0.78, 0.46)) - 1.6 + w)))
      + 0.7 * (1.0 - smoothstep(0.0, 0.12, abs(dot(vp, vec3(-0.7, 0.45, 0.55)) + 0.2 + w)));
    sheet *= smoothstep(-0.2, 0.4, snoise(vp * 0.6 + 7.0));
    stoneVeil += sheet * uVeils.x * dist / 3.0;
  }
}
`;

/**
 * Real faces are not glass-flat: they undulate a little, the prism faces
 * carry fine horizontal striations across the c axis (the surest sign of
 * quartz), and a broken foot is a rough conchoidal fracture. The refracted
 * studio breaks up along them instead of showing as perfect rectangles.
 */
const FACES = /* glsl */ `
vec3 normal = normalize(vNormal);
if (uWave > 0.0) {
  vec3 wq = vWorldPosition * 1.6;
  normal = normalize(normal + vec3(snoise(wq), snoise(wq + 11.0), snoise(wq + 23.0)) * uWave);
}
if (uStriae.y > 0.0) {
  float along = dot(vWorldPosition, vAxis);
  float phase = along * uStriae.x + snoise(vWorldPosition * 2.1) * 0.6;
  float prism = 1.0 - smoothstep(0.12, 0.3, abs(dot(normal, vAxis)));
  float fine = 1.0 - smoothstep(0.25, 0.6, fwidth(phase) / 6.2832);
  float lines = sin(phase) * 0.6 + sin(phase * 2.37 + 1.3) * 0.4;
  normal = normalize(normal + vAxis * lines * uStriae.y * prism * fine);
}
{
  float rough = 1.0 - smoothstep(0.0, uVeils.y * 0.45, vZone);
  if (rough > 0.0) {
    vec3 rq = vWorldPosition * 9.0;
    normal = normalize(normal + vec3(snoise(rq), snoise(rq + 5.0), snoise(rq + 9.0)) * 0.35 * rough);
  }
}
`;

/** What the eye gets: the outer surface's mirror image of the studio by
 *  Fresnel, and through it the refracted light dimmed by the stone it
 *  crossed, plus what its veils scatter back. Toward its foot a point turns
 *  milky, as quartz does where it grew from the rock. */
const SHADE = /* glsl */ `
vec3 eyeRay = normalize(vWorldPosition - cameraPosition);
float facing = clamp(dot(-eyeRay, normal), 0.0, 1.0);
float fres = uF0 + (1.0 - uF0) * pow(1.0 - facing, 5.0);
#ifdef ENVMAP_TYPE_CUBEM
  vec3 mirror = textureCube(envMap, reflect(eyeRay, normal)).rgb;
#else
  vec3 mirror = textureGradient(envMap, reflect(eyeRay, normal), directionCamPerfect).rgb;
#endif
vec3 inside = (diffuseColor.rgb + uMilk) * exp(-uAbsorb * stonePath);
float foot = (1.0 - smoothstep(0.0, uVeils.y, vZone)) * (0.7 + 0.3 * snoise(vWorldPosition * 2.7));
inside = mix(inside, vec3(uVeils.z) * (0.6 + 0.4 * diffuseColor.rgb), clamp(1.0 - exp(-stoneVeil) + foot * 0.5, 0.0, 1.0));
gl_FragColor = vec4(mix(inside, mirror, fres) * uLight, diffuseColor.a);
`;

/**
 * drei's MeshRefractionMaterial traces each ray through the crystal's own
 * faces (BVH), bouncing off them by total internal reflection: the fire of
 * real faceted stone. It leaves out what this adds: the surface's own
 * reflection (it only has a white rim), colour that deepens with the length
 * of stone the light crossed (a violet point is pale where thin and deep
 * where light ran through it end to end), and the veils of a natural stone.
 */
export function crystalPatch(look: CrystalLook) {
  return {
    onBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
      shader.uniforms.uAbsorb = { value: look.absorb };
      shader.uniforms.uF0 = { value: look.f0 };
      shader.uniforms.uWave = { value: look.wave };
      shader.uniforms.uMilk = { value: look.milk };
      shader.uniforms.uVeils = { value: new THREE.Vector3(look.veils, look.cloud, 0.55) };
      shader.uniforms.uLight = { value: look.light ?? 1 };
      // striations under a millimetre apart, tilting the face about a degree
      shader.uniforms.uStriae = { value: new THREE.Vector2(70, look.striae ?? 0.018) };
      shader.vertexShader = shader.vertexShader
        .replace(VERTEX_PARS, `${VERTEX_PARS}\nattribute float aZone;\nattribute vec3 aAxis;\nvarying float vZone;\nvarying vec3 vAxis;`)
        .replace(VERTEX, `${VERTEX}\nvZone = aZone;\nvAxis = normalize((modelMatrix * vec4(aAxis, 0.0)).xyz);`);
      shader.fragmentShader = shader.fragmentShader
        .replace(ENTRY, `${PARS}\n${ENTRY}\nstonePath = 0.0;\nstoneVeil = 0.0;`)
        .replace(HIT, `${HIT}\n${VEILS}`)
        .replace(NORMAL, FACES)
        .replace(OUT, SHADE);
    },
    customProgramCacheKey: () => "stones-crystal",
  };
}

/** Absorption that leaves `color` after `distance` cm of stone. */
export function absorption(color: THREE.ColorRepresentation, distance: number): THREE.Vector3 {
  const c = new THREE.Color(color);
  return new THREE.Vector3(-Math.log(Math.max(c.r, 1e-4)) / distance, -Math.log(Math.max(c.g, 1e-4)) / distance, -Math.log(Math.max(c.b, 1e-4)) / distance);
}
