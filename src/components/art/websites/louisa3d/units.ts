/** World units are CSS px on the z = 0 plane: the camera looks down -z from
 *  `cameraDistance(h)` with a 30 degree vertical field of view, so that plane
 *  exactly fills the canvas. Depth z grows toward the camera. */
export const FOV = 30;

export const cameraDistance = (h: number) => h / 2 / Math.tan((FOV * Math.PI) / 360);

/** Where to put something at depth z so it lands on screen point (sx, sy)
 *  (CSS px, y down) of a w x h canvas. */
export function toWorld(sx: number, sy: number, z: number, w: number, h: number): [number, number, number] {
  const d = cameraDistance(h);
  const k = (d - z) / d;
  return [(sx - w / 2) * k, (h / 2 - sy) * k, z];
}
