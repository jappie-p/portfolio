import * as THREE from "three";
import type { Materials } from "../materials";
import type { Piece, StoryId } from "../types";

/** A stand-in block for a piece still being made: its size (w, h, d), in
 *  its own space (standing on y = 0, its back against z = 0). */
export function stub(id: StoryId, m: Materials, size: [number, number, number]): Piece {
  const [w, h, d] = size;
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.brand());
  mesh.position.set(0, h / 2, d / 2);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return { id, group, pin: new THREE.Vector3(0, h + 0.2, d / 2), view: { target: new THREE.Vector3(0, h / 2, d / 2), offset: new THREE.Vector3(-1.2, 0.8, 3) } };
}
