import * as THREE from "three";
import { patchMaterial } from "./patch";

/**
 * The lights hang close over the table, so their light pools around the
 * stones and dies away toward the back and the sides. Image lighting comes
 * from infinitely far and cannot do that, so the slate dims itself with
 * distance from the pool's centre (an ellipse on the table).
 */
const POOL = /* glsl */ `
{
  vec2 d = (vWorld.xz - uPool.xy) / uPool.zw;
  outgoingLight *= mix(uPoolFloor, 1.0, exp(-dot(d, d)));
}
`;

/** The honed slate the stones rest on. */
export class Slate {
  /** pool centre (table x, z) and reach (cm along x and z) */
  readonly pool = { value: new THREE.Vector4(0, 0, 40, 30) };
  readonly material: THREE.MeshPhysicalMaterial;

  constructor(
    readonly grain: THREE.Texture,
    normal: THREE.Texture,
    tile: number,
  ) {
    for (const t of [grain, normal]) t.repeat.set(tile, tile);
    this.material = patchMaterial(
      // honed, not polished: a low, broad sheen even at grazing angles
      new THREE.MeshPhysicalMaterial({
        color: "#28292c",
        map: grain,
        roughness: 0.74,
        roughnessMap: grain,
        normalMap: normal,
        normalScale: new THREE.Vector2(0.12, 0.12),
        metalness: 0,
        specularIntensity: 0.5,
      }),
      "stones-slate",
      {
        uniforms: { uPool: this.pool, uPoolFloor: { value: 0.2 } },
        vertexHead: "varying vec3 vWorld;",
        vertex: "vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        fragmentHead: "uniform vec4 uPool;\nuniform float uPoolFloor;\nvarying vec3 vWorld;",
        replace: { opaque_fragment: `${POOL}\n#include <opaque_fragment>` },
      },
    );
  }

  dispose() {
    this.material.dispose();
  }
}
