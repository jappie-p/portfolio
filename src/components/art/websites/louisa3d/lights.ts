import * as THREE from "three";

/** Toward the key softbox (upper left, in front) and the strip light (right):
 *  the environment's panels, the direct lights and the glints all agree. */
export const KEY = new THREE.Vector3(-0.5, 0.75, 1).normalize();
export const STRIP = new THREE.Vector3(0.9, 0.15, 0.45).normalize();
