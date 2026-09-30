import * as THREE from "three";
import { CORE, IMPACTS, IMPACTS_WORLD } from "./layout";
import { bootFront } from "./juice";

/** One set of uniform objects shared by reference across every material, so a
 *  single write per frame (in SimDriver) moves the whole scene. */
export function createSceneUniforms() {
  return {
    uTime: { value: 0 },
    /** 0..1 strength of the DDoS floods */
    uAttack: { value: 0 },
    /** world size of one screen pixel at distance 1 (keeps thin lines >= ~1.5px) */
    uPixel: { value: 0.001 },
    /** xyz = impact point (world), w = current heat (steady flood + hit flashes) */
    uImpacts: { value: IMPACTS_WORLD.map(([x, y, z]) => new THREE.Vector4(x, y, z, 0)) },
    uCore: { value: new THREE.Vector3(...CORE) },
    /** last salvo hit per flood, wall-local: x = s, y = height, z = hit time, w = strength */
    uHits: { value: IMPACTS.map((i) => new THREE.Vector4(i.s, i.y, -1e4, 0)) },
    /** launch time of the salvo in flight, per flood (drives the packets along the beams) */
    uSalvo: { value: [-1e4, -1e4, -1e4] },
    /** firewall shockwave: x = start time, y = strength */
    uPulse: { value: new THREE.Vector2(-1e4, 0) },
    /** how far the floods are cut back from the wall right after a shockwave */
    uCut: { value: 0 },
    /** power-on: position of the light front along the wall */
    uBoot: { value: bootFront(-1) },
    /** 0..1 traffic and floods powered on */
    uPower: { value: 0 },
    /** the cursor on the wall: x = s, y = height, z = strength */
    uCursor: { value: new THREE.Vector3(0, 0, 0) },
    /** start time of the green "all clear" sweep when the attack is beaten */
    uClear: { value: -1e4 },
    /** a click on the wall: x = s, y = height, z = time */
    uPing: { value: new THREE.Vector3(0, 0, -1e4) },
  };
}

export type SceneUniforms = ReturnType<typeof createSceneUniforms>;
