import type * as THREE from "three";
import { smooth } from "../lights";
import type { CardCopy } from "../textures";

/** What breaks out of one print. */
export type Breakout = {
  /** the pieces on the print itself: hung in the work's group, so they lean
   *  with it (as their lamp sees them too, on layer SHADE) */
  parts: THREE.Object3D[];
  /** what stands round it in the room (ruins, a slope of blocks down to the
   *  floor): placed at the work along the wall, never leaning; x from the
   *  work's centre, y from the floor, z from the wall */
  set?: THREE.Object3D[];
  /** textures of its own, to upload ahead and dispose of with the scene */
  textures?: THREE.Texture[];
  /** still fetching something it needs: the build waits for it */
  loading?(): boolean;
  /** this frame: the clock, and how far the camera has stepped up to the work, 0..1 */
  update(time: number, near: number): void;
  /** the room changed shape: the narrow one keeps clear of the copy above the works */
  fit?(narrow: boolean): void;
  /** the reader's language changed: print its words again */
  setCopy?(copy: CardCopy): void;
};

/** As the camera steps up to a work its pieces come further out of the
 *  picture, all the way by 0.8 (0..1)... */
export const spreadOf = (near: number) => smooth(0, 0.8, near);
/** ...then go, so that when the project takes over only the picture is left
 *  (1 while they stay, 0 once gone). */
export const leftOf = (near: number) => 1 - smooth(0.85, 0.97, near);
