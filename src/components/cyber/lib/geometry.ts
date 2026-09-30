import * as THREE from "three";
import { hexCorners } from "./hex";

function hexShape(r: number, pointy: boolean) {
  const pts = hexCorners(r, pointy).map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.Shape(pts);
}

/** Chamfered hexagonal frame. `outer`/`inner` are the finished radii (bevel
 *  included); the front face ends at z = 0 and the frame extends back. */
export function hexFrameGeometry(o: {
  outer: number;
  inner: number;
  depth: number;
  bevel: number;
  bevelDepth: number;
  pointy?: boolean;
  segments?: number;
}) {
  const pointy = o.pointy ?? false;
  const shape = hexShape(o.outer - o.bevel, pointy);
  shape.holes.push(new THREE.Path(hexCorners(o.inner + o.bevel, pointy).map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: o.depth,
    bevelEnabled: true,
    bevelThickness: o.bevelDepth,
    bevelSize: o.bevel,
    bevelSegments: o.segments ?? 2,
    curveSegments: 1,
  });
  g.translate(0, 0, -(o.depth + o.bevelDepth));
  return g;
}

/** Flat hexagon in the xy plane, with 0..1 UVs across its bounding square. */
export function hexFaceGeometry(r: number, pointy = false) {
  const g = new THREE.ShapeGeometry(hexShape(r, pointy));
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * r) + 0.5, pos.getY(i) / (2 * r) + 0.5);
  uv.needsUpdate = true;
  return g;
}

/** Thin flat hexagonal outline (for neon lines and pulse rings). */
export function hexLineGeometry(r: number, width: number, pointy = false) {
  const shape = hexShape(r + width / 2, pointy);
  shape.holes.push(new THREE.Path(hexCorners(r - width / 2, pointy).map(([x, y]) => new THREE.Vector2(x, y))));
  return new THREE.ShapeGeometry(shape);
}

/** A hex nut facing +z. */
export function nutGeometry(r: number) {
  const g = new THREE.CylinderGeometry(r, r, r * 1.1, 6);
  g.rotateX(Math.PI / 2);
  return g;
}
