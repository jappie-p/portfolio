/** Camera poses along the walk, and the pinhole projection the scene and the
 *  HTML layer share, so a button always sits exactly on its frame. */

export type Pose = {
  x: number;
  y: number;
  z: number;
  /** turn to the right and tilt up, radians */
  yaw: number;
  pitch: number;
  /** lens shift in NDC: positive moves the picture up, verticals stay vertical */
  shift: number;
  /** vertical field of view, degrees */
  fov: number;
};

const KEYS = ["x", "y", "z", "yaw", "pitch", "shift", "fov"] as const;

export const pose = (x: number, y: number, z: number, yaw = 0, pitch = 0, shift = 0, fov = 38): Pose => ({ x, y, z, yaw, pitch, shift, fov });

/** Monotone cubic slopes (Fritsch and Carlson): the path never overshoots a
 *  station, so the camera cannot bump into the wall between two works. */
function slopes(v: number[]): number[] {
  const n = v.length;
  if (n < 2) return [0];
  const d = v.slice(1).map((x, i) => x - v[i]);
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]));
  m.push(d[n - 2]);
  return m;
}

/** A smooth path through the stations: `at(s, out)` for any walk position,
 *  stations at whole numbers, gently extrapolated past either end. */
export function makePath(stations: Pose[]) {
  const n = stations.length;
  const tracks = KEYS.map((k) => {
    const v = stations.map((p) => p[k]);
    return { k, v, m: slopes(v) };
  });
  return (s: number, out: Pose): Pose => {
    for (const { k, v, m } of tracks) {
      if (n === 1) out[k] = v[0];
      else if (s <= 0) out[k] = v[0] + m[0] * s;
      else if (s >= n - 1) out[k] = v[n - 1] + m[n - 1] * (s - n + 1);
      else {
        const i = Math.floor(s);
        const t = s - i;
        const t2 = t * t;
        const t3 = t2 * t;
        out[k] = (2 * t3 - 3 * t2 + 1) * v[i] + (t3 - 2 * t2 + t) * m[i] + (-2 * t3 + 3 * t2) * v[i + 1] + (t3 - t2) * m[i + 1];
      }
    }
    return out;
  };
}

export function lerpPose(a: Pose, b: Pose, t: number, out: Pose): Pose {
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

/**
 * Where a world point lands, as [x, y] in CSS pixels of a `w` by `h` view
 * plus its distance in front of the camera (negative: behind). The same
 * maths as a three.js camera at the pose's position with Euler YXZ rotation
 * (-yaw, pitch, 0), the pose's field of view, and projection element 9 set
 * to -shift.
 */
export function project(p: Pose, w: number, h: number, x: number, y: number, z: number, out: number[] = [0, 0, 0]) {
  const dx = x - p.x;
  const dy = y - p.y;
  const dz = z - p.z;
  // undo the yaw (about y), then the pitch (about x)
  const cy = Math.cos(-p.yaw);
  const sy = Math.sin(-p.yaw);
  const x1 = cy * dx - sy * dz;
  const z1 = sy * dx + cy * dz;
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  const y2 = cp * dy + sp * z1;
  const z2 = -sp * dy + cp * z1;
  const depth = -z2;
  const f = 1 / Math.tan((p.fov * Math.PI) / 360);
  const nx = (f * h * x1) / (w * depth);
  const ny = (f * y2) / depth + p.shift;
  out[0] = ((nx + 1) / 2) * w;
  out[1] = ((1 - ny) / 2) * h;
  out[2] = depth;
  return out;
}
