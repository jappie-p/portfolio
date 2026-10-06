import * as THREE from "three";
import type { Materials } from "../../materials";

/**
 * A tripod floor lamp: three splayed oak legs, a linen drum shade glowing
 * warm with the bulb inside it, and the bulb's light on what stands round it.
 */
export function floorLamp(m: Materials, at: THREE.Vector3, height = 1.5) {
  const group = new THREE.Group();
  group.position.copy(at);
  const oak = m.oak();
  const apex = new THREE.Vector3(0, height - 0.32, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const foot = new THREE.Vector3(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24);
    const top = apex.clone().add(new THREE.Vector3(Math.cos(a) * 0.02, 0.06, Math.sin(a) * 0.02));
    const len = top.distanceTo(foot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, len, 8), oak);
    leg.position.copy(top).add(foot).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
    leg.castShadow = leg.receiveShadow = true;
    group.add(leg);
  }
  const brass = m.brass();
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 12), brass);
  collar.position.copy(apex).add(new THREE.Vector3(0, 0.04, 0));
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 8), brass);
  rod.position.copy(apex).add(new THREE.Vector3(0, 0.16, 0));
  group.add(collar, rod);

  // the shade: linen lit from within
  const shadeH = 0.24;
  const shadeY = height - shadeH / 2 - 0.02;
  const linen = m.own(
    "linenshade",
    () => new THREE.MeshStandardMaterial({ color: "#efe4d0", roughness: 0.95, emissive: new THREE.Color("#ffb46a"), emissiveIntensity: 0.55, side: THREE.DoubleSide }),
  );
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, shadeH, 40, 1, true), linen);
  shade.position.set(0, shadeY, 0);
  shade.castShadow = true;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), m.warmLight());
  bulb.position.set(0, shadeY - 0.03, 0);
  group.add(shade, bulb);

  const light = new THREE.PointLight("#ffbf80", 1.6, 4.5, 2);
  light.position.set(0, shadeY - 0.05, 0);
  group.add(light);
  return group;
}

/** A cable along the floor by the skirting, through `points` (room space). */
export function cable(m: Materials, points: THREE.Vector3[]) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0045, 6), m.rubber());
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}
