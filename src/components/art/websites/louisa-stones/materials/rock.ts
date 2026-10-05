import * as THREE from "three";
import { SNOISE } from "./glsl";
import { patchMaterial } from "./patch";

/** Relief too fine for the mesh: the normal tilted by the slope of a noise
 *  height field (screen-space derivatives, Mikkelsen's bump mapping). */
const RELIEF = /* glsl */ `
{
  float hgt = fbm3(vObj * uRelief.x) * uRelief.y + snoise(vObj * uRelief.x * 3.7) * uRelief.y * 0.3;
  vec3 sx = dFdx(-vViewPosition);
  vec3 sy = dFdy(-vViewPosition);
  vec3 r1 = cross(sy, normal);
  vec3 r2 = cross(normal, sx);
  float det = dot(sx, r1);
  vec3 grad = sign(det) * (dFdx(hgt) * r1 + dFdy(hgt) * r2);
  normal = normalize(abs(det) * normal - grad);
}
`;

export interface RockLook {
  /** the weathered outside, and the layer it turns to higher up */
  low: THREE.ColorRepresentation;
  high: THREE.ColorRepresentation;
  /** object-space height range (cm) over which low turns to high */
  band: [number, number];
  roughness: number;
  /** pattern size: noise cycles per cm */
  grain: number;
  /** relief: bumps per cm, and their height in cm */
  relief?: [number, number];
}

/** Mottled, pitted colour that changes with height: a geode's skin under
 *  its chalcedony lining, or an agate slice's rind. */
const MOTTLE = /* glsl */ `
{
  float m = fbm3(vObj * uGrain);
  float pit = smoothstep(0.35, 0.7, snoise(vObj * uGrain * 4.0 + 3.0));
  float rise = smoothstep(uBand.x, uBand.y, vObj.y + m * 0.25);
  diffuseColor.rgb = mix(uLow, uHigh, rise) * (0.78 + 0.4 * m) * (1.0 - 0.35 * pit);
}
`;

export function rockMaterial(look: RockLook): THREE.MeshStandardMaterial {
  return patchMaterial(new THREE.MeshStandardMaterial({ roughness: look.roughness, metalness: 0 }), "stones-rock", {
    uniforms: {
      uLow: { value: new THREE.Color(look.low) },
      uHigh: { value: new THREE.Color(look.high) },
      uBand: { value: new THREE.Vector2(...look.band) },
      uGrain: { value: look.grain },
      uRelief: { value: new THREE.Vector2(...(look.relief ?? [1, 0])) },
    },
    vertexHead: "varying vec3 vObj;",
    vertex: "vObj = position;",
    fragmentHead: `uniform vec3 uLow;\nuniform vec3 uHigh;\nuniform vec2 uBand;\nuniform float uGrain;\nuniform vec2 uRelief;\nvarying vec3 vObj;\n${SNOISE}`,
    after: { color_fragment: MOTTLE, normal_fragment_maps: RELIEF },
  });
}
