import * as THREE from "three";
import type { Materials } from "../materials";
import type { Piece } from "../types";
import { merge, owns, rbox, solid } from "./work/shapes";

/** The helmet's shell: an egg, a little longer front to back than across. */
const S = { rx: 0.124, ry: 0.132, rz: 0.162, cy: 0.158 };

/** A part of the shell's ellipsoid, scaled by `k`: phi round y from the
 *  front (+z), theta down from the top. */
function shellPart(k: number, phi: [number, number], theta: [number, number], segments: [number, number] = [64, 40], centre: [number, number, number] = [0, S.cy, 0], radii: [number, number, number] = [S.rx, S.ry, S.rz]) {
  const g = new THREE.SphereGeometry(1, segments[0], segments[1], Math.PI / 2 - phi[1], phi[1] - phi[0], theta[0], theta[1] - theta[0]);
  g.scale(radii[0] * k, radii[1] * k, radii[2] * k);
  g.translate(...centre);
  return g;
}

/** The paint: the brand's green with twin cream stripes over the crown,
 *  front to back (u = 0.5 is the front, u = 0 and 1 the back). */
function livery() {
  const W = 1024;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1e4b32";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#efe6d2";
  for (const u of [0, 0.5, 1])
    for (const d of [-0.022, 0.022]) {
      const x = (u + d) * W;
      g.fillRect(x - 6, 0, 12, H);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** One black leather glove lying flat, fingers toward +z, the fingers
 *  curling down a little at their tips; `side` -1 for a left hand. A
 *  knuckle guard and the brand's green on the cuff. */
function glove(side: number, leather: THREE.Material, guard: THREE.Material, accent: THREE.Material) {
  const g = new THREE.Group();
  g.add(solid(rbox(0.084, 0.022, 0.092, 0.011, 0, 0.011, 0), leather));
  const fingers: THREE.BufferGeometry[] = [];
  [0.07, 0.08, 0.077, 0.062].forEach((len, i) => {
    const f = new THREE.CapsuleGeometry(0.0098, len - 0.02, 6, 12);
    f.scale(1, 1, 0.74);
    f.rotateX(Math.PI / 2 + 0.08);
    f.rotateY((i - 1.5) * -0.03);
    f.translate(-0.0295 + i * 0.0197, 0.01, 0.043 + len / 2 - 0.008);
    fingers.push(f);
  });
  const thumb = new THREE.CapsuleGeometry(0.0095, 0.042, 6, 12);
  thumb.scale(1, 1, 0.8);
  thumb.rotateX(Math.PI / 2 + 0.1);
  thumb.rotateY(side * 0.9);
  thumb.translate(side * 0.052, 0.01, 0.022);
  fingers.push(thumb);
  g.add(solid(merge(fingers), leather));
  g.add(solid(rbox(0.066, 0.01, 0.03, 0.005, 0, 0.025, 0.028), guard));
  g.add(solid(rbox(0.094, 0.026, 0.05, 0.012, 0, 0.013, -0.066), leather));
  g.add(solid(rbox(0.096, 0.008, 0.012, 0.003, 0, 0.018, -0.088), accent));
  return g;
}

/**
 * The motorbike helmet on top of the rack: a full-face shell in glossy
 * green under a clear coat with twin cream stripes over the crown, the
 * chin bar jutting forward, a smoked iridescent visor standing proud of
 * its port, black vents, a spoiler, a rubber trim round the neck; and my
 * gloves beside it. Stands on y = 0 (the rack's top), its visor toward +z.
 */
export function makeHelmet(m: Materials): Piece {
  const group = new THREE.Group();
  const helmet = new THREE.Group();
  const paintTex = livery();
  const paint = m.own("helmetPaint", () =>
    owns(new THREE.MeshPhysicalMaterial({ map: paintTex, roughness: 0.2, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }), paintTex),
  );
  const visor = m.own(
    "visor",
    () =>
      new THREE.MeshPhysicalMaterial({ color: "#10151a", roughness: 0.02, metalness: 0.3, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [220, 560], envMapIntensity: 2.4 }),
  );
  const trim = m.plasticBlack();
  const rubber = m.rubber();

  // the shell, open at the neck, its edge rising toward the back
  const shell = shellPart(1, [-Math.PI, Math.PI], [0, Math.PI * 0.76]);
  const p = shell.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    const low = Math.max(0, (S.cy - p.getY(i)) / S.ry);
    // the back of the neck tucks in and up
    if (z < 0) p.setY(i, p.getY(i) + low * low * -z * 0.25);
  }
  shell.computeVertexNormals();
  helmet.add(solid(shell, paint));
  // the chin bar: its own rounded bulge jutting forward, below the visor
  helmet.add(solid(shellPart(1, [-1.05, 1.05], [Math.PI * 0.44, Math.PI * 0.93], [40, 20], [0, 0.108, 0.026], [0.114, 0.104, 0.162]), paint));
  // the eye port's black gasket, and the visor standing proud of it
  helmet.add(solid(shellPart(1.03, [-1.22, 1.22], [Math.PI * 0.315, Math.PI * 0.565], [52, 16]), trim));
  helmet.add(solid(shellPart(1.048, [-1.16, 1.16], [Math.PI * 0.325, Math.PI * 0.55], [52, 16]), visor));
  // black: pivot plates each side, two vents on the crown, the chin vent,
  // the spoiler at the back
  const bits: THREE.BufferGeometry[] = [];
  for (const sd of [-1, 1]) {
    bits.push(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 24).rotateZ(Math.PI / 2).translate(sd * S.rx * 1.035, S.cy - 0.012, 0.022));
    const vent = rbox(0.018, 0.007, 0.034, 0.003, 0, 0, 0);
    vent.rotateX(0.42);
    vent.translate(sd * 0.032, S.cy + S.ry * 0.955, 0.045);
    bits.push(vent);
  }
  bits.push(rbox(0.045, 0.018, 0.016, 0.006, 0, 0.07, 0.182));
  const spoiler = rbox(0.1, 0.016, 0.05, 0.007, 0, S.cy + S.ry * 0.5, -S.rz * 0.86);
  spoiler.rotateX(-0.55);
  bits.push(spoiler);
  helmet.add(solid(merge(bits), trim));
  // the rubber trim round the neck
  const neck = new THREE.TorusGeometry(1, 0.08, 10, 48);
  neck.rotateX(Math.PI / 2);
  neck.scale(S.rx * 0.58, 0.09, S.rz * 0.6);
  neck.translate(0, 0.046, -0.01);
  helmet.add(solid(neck, rubber));
  helmet.rotation.y = 0.12;
  group.add(helmet);

  // the gloves, one half over the other, left of the helmet
  const leather = m.own("gloveLeather", () => new THREE.MeshStandardMaterial({ color: "#0f0f10", roughness: 0.46 }));
  const guard = m.own("carbon", () => new THREE.MeshStandardMaterial({ color: "#1b1c1e", roughness: 0.32, metalness: 0.2 }));
  const left = glove(-1, leather, guard, m.brand());
  left.position.set(-0.22, 0, 0.06);
  left.rotation.y = 0.45;
  group.add(left);
  const right = glove(1, leather, guard, m.brand());
  right.position.set(-0.165, 0.022, -0.01);
  right.rotation.set(0.04, 1.0, 0.05);
  group.add(right);

  return {
    id: "motorrijden",
    group,
    pin: new THREE.Vector3(0.0, 0.42, 0),
    view: { target: new THREE.Vector3(-0.07, 0.12, 0.03), offset: new THREE.Vector3(-0.55, 0.45, 1.15) },
  };
}
