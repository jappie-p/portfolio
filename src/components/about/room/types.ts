import type * as THREE from "three";

/** The things in my room that tell a story when you open them. */
export type StoryId = "werk" | "homelab" | "groei" | "windsurfen" | "mountainbiken" | "wielrennen" | "motorrijden";

/** What a story is about, for the filter under the room. */
export type Kind = "bouwen" | "buiten" | "groei";

/** How a piece takes the light it is in: muted while a filter leaves it out,
 *  lit up while the pointer is on it. Shared by all its materials. */
export type Tone = { uMute: { value: number }; uGlow: { value: number } };

/**
 * A piece of the room you can open: its model (in the room's space, metres:
 * x along the back wall from its left end, y up from the floor, z out from
 * the back wall toward you), where its pin floats, and where the camera
 * goes to look at it. `update` runs every frame (LEDs, a spinning wheel).
 */
export type Piece = {
  id: StoryId;
  group: THREE.Group;
  pin: THREE.Vector3;
  /** what the camera looks at, and from where (an offset from that point) */
  view: { target: THREE.Vector3; offset: THREE.Vector3 };
  update?: (time: number, dt: number) => void;
};

/** A prop that is only part of the room: plants, the rug, the shelves. */
export type Prop = { group: THREE.Group; update?: (time: number, dt: number) => void };
