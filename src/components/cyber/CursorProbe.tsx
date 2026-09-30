"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSim } from "./SimContext";
import { WALL, WALL_DIR, WALL_NORMAL } from "./lib/layout";
import { nearestCell } from "./lib/hex";
import { hexLineGeometry } from "./lib/geometry";
import { addTrauma } from "./lib/juice";
import { hdr } from "./lib/palette";

const REACH = { sMin: -3.2, sMax: 18.5, yMin: -0.3, yMax: 5.8 };

/** The wall answers the mouse: a ray against the wall's face plane (which
 *  passes through the origin, so no scene raycast is needed) finds the cell
 *  under the pointer, a hex reticle locks onto it, and the cell lifts and
 *  lights up. A click on the scene sends a ripple out from that cell. */
export function CursorProbe() {
  const { u, pointer, state, still } = useSim();
  const reticle = useRef<THREE.Group>(null);
  const pings = useRef(pointer.pings);

  const res = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: hdr(0.4, 1.9, 2.4),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    return {
      mat,
      outer: new THREE.Mesh(hexLineGeometry(WALL.cellR * 1.22, 0.028), mat),
      inner: new THREE.Mesh(hexLineGeometry(WALL.cellR * 0.82, 0.016, true), mat),
      ray: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      hit: new THREE.Vector3(),
      plane: new THREE.Plane(new THREE.Vector3(...WALL_NORMAL), 0),
      along: new THREE.Vector3(...WALL_DIR),
    };
  }, []);
  useEffect(
    () => () => {
      res.mat.dispose();
      res.outer.geometry.dispose();
      res.inner.geometry.dispose();
    },
    [res],
  );

  useFrame(({ camera, gl }, delta) => {
    const c = u.uCursor.value;
    const dt = Math.min(delta, 0.05);
    let want = 0;
    if (!still && pointer.active) {
      const r = gl.domElement.getBoundingClientRect();
      res.ndc.set(((pointer.clientX - r.left) / r.width) * 2 - 1, -((pointer.clientY - r.top) / r.height) * 2 + 1);
      res.ray.setFromCamera(res.ndc, camera);
      if (res.ray.ray.intersectPlane(res.plane, res.hit)) {
        const s = res.hit.dot(res.along);
        const y = res.hit.y;
        if (s > REACH.sMin && s < REACH.sMax && y > REACH.yMin && y < REACH.yMax) {
          const lock = nearestCell(s, y, WALL);
          const k = c.z < 0.02 ? 1 : 1 - Math.exp(-22 * dt);
          c.x += (lock.s - c.x) * k;
          c.y += (lock.y - c.y) * k;
          want = 1;
        }
      }
    }
    c.z += (want - c.z) * (1 - Math.exp(-8 * dt));

    // a click pings the wall from the locked cell
    if (pointer.pings !== pings.current) {
      pings.current = pointer.pings;
      if (c.z > 0.3) {
        u.uPing.value.set(c.x, c.y, state.time);
        state.trauma = addTrauma(state.trauma, 0.14);
      }
    }

    const g = reticle.current;
    if (g) {
      g.visible = c.z > 0.01;
      g.position.set(c.x, c.y, 0.2);
      g.scale.setScalar(1 + (1 - c.z) * 0.7);
      res.outer.rotation.z = state.time * 0.8;
      res.inner.rotation.z = -state.time * 1.3;
      const since = state.time - u.uPing.value.z;
      res.mat.opacity = c.z * (0.75 + 0.25 * Math.sin(state.time * 6)) + (since < 0.3 ? 1 - since / 0.3 : 0);
    }
  });

  return (
    <group rotation-y={WALL.yaw}>
      <group ref={reticle} visible={false}>
        <primitive object={res.outer} />
        <primitive object={res.inner} />
      </group>
    </group>
  );
}
