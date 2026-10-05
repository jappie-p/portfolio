import * as THREE from "three";
import { SNOISE } from "./glsl";
import { patchMaterial } from "./patch";

/** Transmission through the stone's real depth at each point (aThick, cm),
 *  so the pink deepens through the middle and pales at the thin edges. */
const THROUGH = THREE.ShaderChunk.transmission_fragment.replace("material.thickness = thickness;", "material.thickness = thickness * vThick;");

/**
 * Light the milk inside the stone scatters back out: what reaches the far
 * side (irradiance from behind), reddened by the depth it crossed. This is
 * the soft inner glow of rose quartz; plain transmission would only show
 * the dark slate through it.
 */
const GLOW = /* glsl */ `
#ifdef USE_ENVMAP
{
  vec3 behind = getIBLIrradiance(-geometryNormal) * RECIPROCAL_PI;
  vec3 through = pow(uScatter, vec3(vThick / uScatterDepth));
  totalDiffuse += behind * through * uGlow;
}
#endif
`;

/** Faint milky clouds, so the colour is not one flat pink, and the white
 *  traces of two old fractures where they meet the surface. */
const CLOUDS = /* glsl */ `
{
  diffuseColor.rgb *= 0.88 + 0.14 * fbm3(vObj * 0.8) + 0.1 * smoothstep(0.3, 0.7, snoise(vObj * 2.6 + 4.0));
  float crack = 0.0;
  crack += 1.0 - smoothstep(0.0, 0.035, abs(dot(vObj, vec3(0.32, 0.81, 0.49)) - 0.35 + snoise(vObj * 1.7) * 0.12));
  crack += 1.0 - smoothstep(0.0, 0.025, abs(dot(vObj, vec3(-0.7, 0.3, 0.65)) + 0.5 + snoise(vObj * 2.1 + 3.0) * 0.1));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.97, 0.97), clamp(crack, 0.0, 1.0) * 0.35);
}
`;

export function roseQuartzMaterial(): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#f1dce1",
    roughness: 0.38,
    metalness: 0,
    transmission: 0.28,
    thickness: 1,
    ior: 1.544,
    attenuationColor: new THREE.Color("#e8adbf"),
    attenuationDistance: 2.6,
    specularIntensity: 0.6,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  return patchMaterial(material, "stones-rose", {
    uniforms: {
      uScatter: { value: new THREE.Color("#f0b4c5") },
      uScatterDepth: { value: 1.8 },
      uGlow: { value: 0.55 },
    },
    vertexHead: "attribute float aThick;\nvarying float vThick;\nvarying vec3 vObj;",
    vertex: "vThick = aThick;\nvObj = position;",
    fragmentHead: `uniform vec3 uScatter;\nuniform float uScatterDepth;\nuniform float uGlow;\nvarying float vThick;\nvarying vec3 vObj;\n${SNOISE}`,
    after: { color_fragment: CLOUDS },
    replace: { transmission_fragment: `${THROUGH}\n${GLOW}` },
  });
}
