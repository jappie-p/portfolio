import * as THREE from "three";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Local, Latin-subset fonts for the in-scene SDF text (no network at runtime). */
export const FONTS = {
  title: `${BASE}/fonts/Rajdhani-Bold.woff`,
  label: `${BASE}/fonts/Rajdhani-SemiBold.woff`,
  mono: `${BASE}/fonts/GeistMono-Regular.woff`,
  monoBold: `${BASE}/fonts/GeistMono-Bold.woff`,
};

/** Linear HDR colour: values above 1 feed the bloom. */
export const hdr = (r: number, g: number, b: number, k = 1) => new THREE.Color().setRGB(r * k, g * k, b * k);

/** The attacker colours, shared by the flood filaments and their cores. */
export const PALETTE = {
  red: [1, 0.12, 0.2] as const,
  pink: [1, 0.55, 0.64] as const,
};
