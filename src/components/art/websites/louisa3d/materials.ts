import * as THREE from "three";
import type { Ramp } from "./geometry";
import { KEY } from "./lights";

const lin = (hex: string) => new THREE.Color(hex);

/** Amethyst: near clear at the root, deepening to purple at the tips. */
export const AMETHYST_RAMP: Ramp = [lin("#fdfaff"), lin("#efdcff"), lin("#cf8ff0")];
/** Rose quartz: near white to a soft pink. */
export const ROSE_RAMP: Ramp = [lin("#fff5f9"), lin("#ffd9ea"), lin("#f7a3cf")];

/**
 * Labradorescence: light scattered inside the stone's lamellae flashes blue,
 * teal, green or gold, in patches (the schiller map), when the slab turns its
 * face to the light. Added to the emissive term of the physical shader.
 */
function addSchiller(material: THREE.MeshPhysicalMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSchillerKey = { value: KEY };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uSchillerKey;
vec3 schillerHue(float t) {
  vec3 blue = vec3(0.05, 0.22, 1.0);
  vec3 teal = vec3(0.0, 0.85, 0.75);
  vec3 green = vec3(0.35, 0.95, 0.25);
  vec3 gold = vec3(1.0, 0.72, 0.15);
  return t < 0.4 ? mix(blue, teal, t / 0.4) : t < 0.7 ? mix(teal, green, (t - 0.4) / 0.3) : mix(green, gold, (t - 0.7) / 0.3);
}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  vec3 viewDir = normalize(vViewPosition);
  vec3 keyDir = normalize((viewMatrix * vec4(uSchillerKey, 0.0)).xyz);
  float lobe = pow(max(dot(normal, normalize(keyDir + viewDir)), 0.0), 5.0);
  float patchT = texture2D(iridescenceThicknessMap, vIridescenceThicknessMapUv).g;
  float strength = smoothstep(0.38, 0.85, patchT) * lobe;
  totalEmissiveRadiance += schillerHue(clamp(patchT * 0.75 + lobe * 0.25 - 0.1, 0.0, 1.0)) * strength * 1.1;
}`,
      );
  };
  material.customProgramCacheKey = () => "labradorite-schiller";
}

/** All the scene's materials, shared by every mesh and rebuild of one mount. */
export class Materials {
  /** Clear amethyst: real refraction through the scene behind it, a little
   *  dispersion for fire, colour deepening with the depth of stone. */
  readonly amethyst = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: 0,
    roughness: 0.03,
    transmission: 1,
    ior: 1.544,
    thickness: 40,
    attenuationColor: lin("#d3a0f5"),
    attenuationDistance: 80,
    dispersion: 6,
    specularIntensity: 1,
    envMapIntensity: 2.4,
    sheen: 0.5,
    sheenColor: lin("#efe6ff"),
    sheenRoughness: 0.35,
    // light caught inside the stone, so it never goes dead in shadow
    emissive: lin("#33134a"),
    emissiveIntensity: 0.8,
    // the far facets refract through the near ones: what makes it a gem
    side: THREE.DoubleSide,
  });

  /** Milky rose quartz: rough transmission blurs what is behind it. */
  readonly rose = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: 0,
    roughness: 0.26,
    transmission: 0.94,
    ior: 1.544,
    thickness: 40,
    attenuationColor: lin("#f9a8d4"),
    attenuationDistance: 90,
    specularIntensity: 1,
    envMapIntensity: 1.3,
    sheen: 0.5,
    sheenColor: lin("#fff0f7"),
    sheenRoughness: 0.5,
    side: THREE.DoubleSide,
  });

  /** Labradorite: dark stone with a thin-film flash (blue, teal, gold) that
   *  moves in patches as the slab turns, under a polished clear coat. */
  readonly labradorite: THREE.MeshPhysicalMaterial;

  /** Druzy, the sugar of tiny crystals on the lip: little mirrors. */
  readonly druzy = new THREE.MeshPhysicalMaterial({
    color: lin("#d9ccff"),
    vertexColors: true,
    metalness: 0.35,
    roughness: 0.14,
    envMapIntensity: 2.2,
  });

  constructor(schiller: THREE.Texture) {
    this.labradorite = new THREE.MeshPhysicalMaterial({
      color: lin("#2c333d"),
      metalness: 0.1,
      roughness: 0.32,
      iridescence: 0.8,
      iridescenceIOR: 1.85,
      iridescenceThicknessRange: [200, 650],
      iridescenceThicknessMap: schiller,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.4,
    });
    addSchiller(this.labradorite);
  }

  /** An agate wall face: banded stone, cut and polished. Owned (and
   *  disposed) by the caller, as each wall has its own bands. */
  agateFor(bands: THREE.Texture, rough: THREE.Texture): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      map: bands,
      metalness: 0,
      roughness: 1,
      roughnessMap: rough,
      clearcoat: 1,
      clearcoatRoughness: 1,
      clearcoatRoughnessMap: rough,
      envMapIntensity: 0.9,
    });
  }

  /** Thickness and attenuation are in world units (CSS px), so they follow
   *  the scene's scale: `u` is the canvas' short side. */
  scale(u: number) {
    this.amethyst.thickness = u * 0.06;
    this.amethyst.attenuationDistance = u * 0.1;
    this.rose.thickness = u * 0.04;
    this.rose.attenuationDistance = u * 0.12;
  }

  all(): THREE.Material[] {
    return [this.amethyst, this.rose, this.labradorite, this.druzy];
  }

  dispose() {
    for (const m of this.all()) m.dispose();
  }
}
