import * as THREE from "three";
import { SNOISE, SPECTRAL } from "./glsl";
import { patchMaterial } from "./patch";

/** The stone's texture in the lamellae's own frame: x and z across the
 *  layers, y through them. Twinning drags everything into fine streaks. */
const FRAME = /* glsl */ `
vec3 lamFrame(vec3 p) {
  return vec3(dot(p, uLamU), dot(p, uLamella), dot(p, uLamV)) * uGrain;
}
`;

/**
 * Labradorescence happens inside the stone, not on its surface: stacks of
 * thin feldspar lamellae, all lying one way, reflect a single colour by
 * interference (blue in most zones, teal or gold where the layers are spaced
 * wider). So it is shaded as a mirror tilted with the lamellae, not with the
 * polished surface: it shows only where that mirror sends the eye to a light,
 * a whole zone flashes at once, and the colour slides toward blue as the
 * angle steepens. Over it sits the polish (clearcoat).
 */
const SCHILLER = /* glsl */ `
#ifdef USE_ENVMAP
{
  vec3 q = lamFrame(vObj);
  vec3 nl = normalize(vLamN + (vLamU * snoise(q * 0.35) + vLamV * snoise(q * 0.35 + 17.3)) * 0.16);
  // into the stone, off the lamellae, and back out through the polish
  vec3 inside = refract(-geometryViewDir, normal, 1.0 / 1.56);
  vec3 back = reflect(inside, nl);
  vec3 out3 = refract(back, -normal, 1.56);
  float leaves = step(0.5, dot(out3, out3));
  vec3 r = inverseTransformDirection(out3, viewMatrix);
  vec3 lit = textureCubeUV(envMap, envMapRotation * r, uSheen).rgb * envMapIntensity * leaves;
  // first-order Bragg peak of the stack: bluer as the angle inside steepens
  float cosI = abs(dot(inside, nl));
  float spacing = pow(clamp(0.5 + 0.6 * fbm3(q * vec3(0.25, 0.6, 0.25) + 41.0), 0.0, 1.0), 3.2);
  vec3 hue = spectral(mix(uBand.x, uBand.y, spacing) * cosI);
  // zones with sharp twin boundaries, fine streaks across them, dark needles
  float zone = smoothstep(-0.08, 0.14, fbm3(q * vec3(0.32, 0.9, 0.32) + 5.0));
  float streaks = 0.7 + 0.3 * snoise(q * vec3(9.0, 0.5, 0.4) + 2.0);
  float needles = 1.0 - smoothstep(0.55, 0.75, snoise(q * vec3(14.0, 0.6, 0.6) + 9.0)) * 0.8;
  totalEmissiveRadiance += lit * hue * zone * streaks * needles * uSchiller;
}
#endif
`;

/** Grey-green feldspar under the flash: mottled, streaked, never flat. */
const BODY = /* glsl */ `
{
  vec3 q = lamFrame(vObj);
  float m = fbm3(q * vec3(0.5, 1.4, 0.5));
  float streak = snoise(q * vec3(7.0, 0.4, 0.3));
  float dark = smoothstep(0.4, 0.85, snoise(q * vec3(0.8, 3.0, 0.8) + 4.0));
  diffuseColor.rgb *= (0.85 + 0.35 * m + 0.12 * streak) * (1.0 - 0.4 * dark);
}
`;

export interface LabradoriteOptions {
  /** lamellae plane normal, in the stone's space */
  lamella: THREE.Vector3;
  /** pattern size: noise cycles per cm */
  grain: number;
}

export function labradoriteMaterial({ lamella, grain }: LabradoriteOptions): THREE.MeshPhysicalMaterial {
  const n = lamella.clone().normalize();
  const u = new THREE.Vector3(1, 0.3, 0.2).cross(n).normalize();
  const v = n.clone().cross(u);
  const material = new THREE.MeshPhysicalMaterial({
    color: "#7b847f",
    roughness: 0.45,
    metalness: 0,
    specularIntensity: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  return patchMaterial(material, "stones-labradorite", {
    uniforms: {
      uLamella: { value: n },
      uLamU: { value: u },
      uLamV: { value: v },
      uGrain: { value: grain },
      uSheen: { value: 0.45 },
      uBand: { value: new THREE.Vector2(485, 660) },
      uSchiller: { value: 1.8 },
    },
    vertexHead: /* glsl */ `
      uniform vec3 uLamella;
      uniform vec3 uLamU;
      uniform vec3 uLamV;
      varying vec3 vObj;
      varying vec3 vLamN;
      varying vec3 vLamU;
      varying vec3 vLamV;
    `,
    vertex: /* glsl */ `
      vObj = position;
      vLamN = normalize(normalMatrix * uLamella);
      vLamU = normalize(normalMatrix * uLamU);
      vLamV = normalize(normalMatrix * uLamV);
    `,
    fragmentHead: /* glsl */ `
      uniform vec3 uLamella;
      uniform vec3 uLamU;
      uniform vec3 uLamV;
      uniform float uGrain;
      uniform float uSheen;
      uniform vec2 uBand;
      uniform float uSchiller;
      varying vec3 vObj;
      varying vec3 vLamN;
      varying vec3 vLamU;
      varying vec3 vLamV;
      ${SNOISE}
      ${SPECTRAL}
      ${FRAME}
    `,
    after: { color_fragment: BODY, aomap_fragment: SCHILLER },
  });
}
