import * as THREE from "three";
import type { Materials } from "../../materials";
import { cyl, merge, owns, rbox, solid, tube } from "./shapes";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A monitor around the origin (its screen's centre), facing +z: a slim
 *  bezel, the screen glowing a little, a rounded back with the stand plate. */
export function monitor(m: Materials, screen: THREE.Material, w: number, h: number) {
  const g = new THREE.Group();
  g.add(solid(rbox(w + 0.018, h + 0.018, 0.018, 0.006), m.plasticBlack()));
  g.add(solid(rbox(w * 0.62, h * 0.6, 0.04, 0.018, 0, -h * 0.05, -0.02), m.graphite()));
  g.add(solid(rbox(0.1, 0.1, 0.02, 0.004, 0, -h * 0.05, -0.045), m.black()));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screen);
  face.position.z = 0.0092;
  g.add(face);
  return g;
}

/** A material for a screen showing `map`: dark glass that gives off the
 *  picture, enough for the bloom to catch its brightest parts. */
export function screenMaterial(m: Materials, name: string, map: THREE.Texture, glow = 1.15) {
  return m.own(name, () => new THREE.MeshStandardMaterial({ color: "#050607", emissive: "#ffffff", emissiveMap: map, emissiveIntensity: glow, roughness: 0.12, metalness: 0 }));
}

/** A low keyboard: a graphite case and cream keys, the space bar wide. */
export function keyboard(m: Materials) {
  const g = new THREE.Group();
  g.add(solid(rbox(0.43, 0.016, 0.135, 0.006, 0, 0.008, 0), m.graphite()));
  const keys: THREE.BufferGeometry[] = [];
  const pitch = 0.0262;
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 15; col++) {
      const x = -0.19 + col * pitch + (row % 2) * 0.006;
      if (row === 4 && col > 3 && col < 11) continue;
      keys.push(rbox(0.021, 0.008, 0.02, 0.003, x, 0.02, -0.052 + row * pitch, 1));
    }
  keys.push(rbox(0.17, 0.008, 0.02, 0.003, -0.005, 0.02, -0.052 + 4 * pitch, 1));
  g.add(solid(merge(keys), m.plasticWhite()));
  return g;
}

/** A mouse: a smooth pebble. */
export function mouse(m: Materials) {
  const g = new THREE.SphereGeometry(1, 24, 14);
  g.scale(0.031, 0.019, 0.055);
  g.translate(0, 0.006, 0);
  return solid(g, m.plasticBlack());
}

/** An architect's lamp in black steel, its warm bulb in the shade and a
 *  small light of its own (no shadow). Stands on the origin, reaching +z. */
export function lamp(m: Materials) {
  const g = new THREE.Group();
  const steel = m.black();
  g.add(solid(cyl(0.065, 0.072, 0.016, 0, 0.008, 0, 32), steel));
  const elbow = V(0.02, 0.36, -0.04);
  const head = V(0.04, 0.5, 0.26);
  g.add(solid(merge([tube([V(0, 0.016, 0), V(0.01, 0.2, -0.03), elbow], 0.007, 16, 8), tube([elbow, V(0.03, 0.47, 0.1), head], 0.007, 16, 8)]), steel));
  g.add(solid(new THREE.SphereGeometry(0.014, 16, 10).translate(elbow.x, elbow.y, elbow.z), m.graphite()));
  // the shade, tipped down toward the desk: black outside, cream within
  const shade = new THREE.Group();
  const outer = new THREE.CylinderGeometry(0.028, 0.075, 0.12, 32, 1, true);
  shade.add(solid(outer, steel));
  shade.add(new THREE.Mesh(outer.clone(), m.own("lampInside", () => new THREE.MeshStandardMaterial({ color: "#f3ead8", roughness: 0.6, side: THREE.BackSide }))));
  shade.add(solid(cyl(0.03, 0.03, 0.02, 0, 0.065, 0, 24), steel));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.024, 20, 12).translate(0, -0.03, 0), m.warmLight());
  shade.add(bulb);
  shade.position.copy(head);
  shade.rotation.x = 0.55;
  g.add(shade);
  const light = new THREE.PointLight("#ffc98a", 0.9, 2.2, 2);
  light.position.set(head.x, head.y - 0.08, head.z + 0.04);
  g.add(light);
  return g;
}

/** A stoneware mug with coffee in it. */
export function mug(m: Materials) {
  const g = new THREE.Group();
  const profile = [V(0, 0, 0), V(0.036, 0, 0), V(0.039, 0.004, 0), V(0.041, 0.092, 0), V(0.037, 0.094, 0), V(0.034, 0.012, 0), V(0, 0.012, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  g.add(solid(new THREE.LatheGeometry(profile, 32), m.own("mug", () => new THREE.MeshStandardMaterial({ color: "#e9e1d2", roughness: 0.35 }))));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0345, 28).rotateX(-Math.PI / 2).translate(0, 0.072, 0), m.own("coffee", () => new THREE.MeshStandardMaterial({ color: "#2a170c", roughness: 0.15 })));
  g.add(coffee);
  const handle = new THREE.TorusGeometry(0.024, 0.0065, 10, 20, Math.PI);
  handle.rotateZ(-Math.PI / 2);
  handle.translate(0.04, 0.05, 0);
  g.add(solid(handle, m.own("mug", () => new THREE.MeshStandardMaterial({ color: "#e9e1d2", roughness: 0.35 }))));
  return g;
}

/** A closed notebook in the brand's green, a pen on it. */
export function notebook(m: Materials) {
  const g = new THREE.Group();
  g.add(solid(rbox(0.15, 0.004, 0.21, 0.0015, 0, 0.002, 0), m.brand()));
  g.add(solid(rbox(0.145, 0.009, 0.205, 0.001, 0.002, 0.0085, 0), m.paper()));
  g.add(solid(rbox(0.15, 0.004, 0.21, 0.0015, 0, 0.015, 0), m.brand()));
  const pen = cyl(0.0045, 0.0045, 0.14, 0, 0, 0, 12);
  pen.rotateZ(Math.PI / 2);
  pen.rotateY(0.5);
  pen.translate(0.03, 0.022, 0.02);
  g.add(solid(pen, m.black()));
  return g;
}

/** A laptop on a low stand, open, its screen showing `screen`. */
export function laptop(m: Materials, screen: THREE.Material) {
  const g = new THREE.Group();
  const stand = merge([rbox(0.26, 0.008, 0.22, 0.003, 0, 0.004, 0), rbox(0.24, 0.07, 0.008, 0.003, 0, 0.035, -0.105)]);
  g.add(solid(stand, m.alu()));
  const base = new THREE.Group();
  base.add(solid(rbox(0.31, 0.012, 0.215, 0.006, 0, 0, 0), m.alu()));
  base.add(new THREE.Mesh(rbox(0.27, 0.0015, 0.1, 0.0007, 0, 0.0065, -0.035), m.plasticBlack()));
  base.position.set(0, 0.05, 0);
  base.rotation.x = 0.16;
  g.add(base);
  const lid = new THREE.Group();
  lid.add(solid(rbox(0.31, 0.205, 0.008, 0.005, 0, 0.1025, 0), m.alu()));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.175), screen);
  face.position.set(0, 0.105, 0.0042);
  lid.add(face);
  lid.position.set(0, 0.05 + Math.sin(0.16) * 0.105, -0.106);
  lid.rotation.x = -0.2;
  g.add(lid);
  return g;
}

/**
 * An office chair, its front toward -z: a five-star base on castors, a
 * chrome lift, a grey cushion, a mesh back in a black frame with a green
 * jacket hung over it, and armrests.
 */
export function chair(m: Materials, weave: THREE.Texture) {
  const g = new THREE.Group();
  const spokes: THREE.BufferGeometry[] = [];
  const wheels: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const spoke = rbox(0.3, 0.03, 0.045, 0.012, 0.15, 0.07, 0);
    spoke.rotateY(a);
    spokes.push(spoke);
    const w = new THREE.CylinderGeometry(0.026, 0.026, 0.024, 16);
    w.rotateX(Math.PI / 2);
    w.rotateY(a + Math.PI / 2);
    w.translate(Math.cos(a) * 0.3, 0.027, -Math.sin(a) * 0.3);
    wheels.push(w);
  }
  spokes.push(cyl(0.05, 0.06, 0.06, 0, 0.08, 0, 24));
  g.add(solid(merge(spokes), m.black()));
  g.add(solid(merge(wheels), m.rubber()));
  g.add(solid(cyl(0.022, 0.022, 0.3, 0, 0.25, 0, 20), m.chrome()));
  g.add(solid(rbox(0.26, 0.05, 0.28, 0.012, 0, 0.42, 0), m.black()));
  g.add(solid(rbox(0.5, 0.075, 0.48, 0.034, 0, 0.48, 0), m.fabricGrey()));
  // armrests
  for (const s of [-1, 1]) {
    g.add(solid(rbox(0.035, 0.2, 0.05, 0.01, s * 0.24, 0.55, 0.06), m.black()));
    g.add(solid(rbox(0.07, 0.03, 0.24, 0.014, s * 0.24, 0.66, 0.02), m.plasticBlack()));
  }
  // the back: a black frame round a see-through weave, leant back a little
  const back = new THREE.Group();
  const BW = 0.46;
  const BH = 0.58;
  const frame = [V(-BW / 2, 0, 0), V(-BW / 2 - 0.01, BH * 0.6, 0.01), V(-BW / 2 + 0.03, BH, 0), V(BW / 2 - 0.03, BH, 0), V(BW / 2 + 0.01, BH * 0.6, 0.01), V(BW / 2, 0, 0)];
  back.add(solid(tube(frame, 0.016, 48, 10, 0.4), m.black()));
  const meshMat = m.own("chairWeave", () => owns(new THREE.MeshStandardMaterial({ color: "#26292b", roughness: 0.8, alphaMap: weave, alphaTest: 0.45, side: THREE.DoubleSide }), weave));
  weave.repeat.set(9, 11);
  const net = new THREE.PlaneGeometry(BW, BH * 0.98, 1, 1);
  net.translate(0, BH * 0.49, 0);
  const netMesh = new THREE.Mesh(net, meshMat);
  netMesh.castShadow = true;
  back.add(netMesh);
  back.add(solid(rbox(0.08, 0.2, 0.03, 0.01, 0, -0.02, 0.03), m.black()));
  back.position.set(0, 0.54, 0.25);
  back.rotation.x = 0.13;
  back.add(jacket(m, BW, BH));
  g.add(back);
  return g;
}

/** The jacket's cloth: the green with its seams, the yoke across the
 *  shoulders, the hem band and the zip, stitched a shade darker. In the
 *  cloth's uvs: u across, v up its length (v = 1 at its front hem). */
function jacketCloth(front: number, len: number) {
  const W = 256;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2f5d3d";
  g.fillRect(0, 0, W, H);
  // a fine twill
  g.strokeStyle = "rgba(0,0,0,0.06)";
  g.lineWidth = 1;
  for (let i = -H; i < W; i += 4) {
    g.beginPath();
    g.moveTo(i, H);
    g.lineTo(i + H, 0);
    g.stroke();
  }
  const y = (s: number) => (s / len) * H;
  g.fillStyle = "rgba(14,32,20,0.55)";
  // the zip down the front fall, the yoke and the centre seam behind
  g.fillRect(W / 2 - 2, 0, 4, y(front));
  g.fillRect(0, y(front + 0.13), W, 3);
  g.fillRect(W / 2 - 1.5, y(front + 0.13), 3, H);
  // the hem band, its stitching
  g.fillRect(0, H - y(0.055), W, 3);
  g.fillStyle = "rgba(14,32,20,0.25)";
  g.fillRect(0, H - y(0.055), W, y(0.055));
  // the shoulder seams
  g.fillStyle = "rgba(14,32,20,0.4)";
  g.fillRect(W * 0.2, y(front - 0.02), 2, y(0.12));
  g.fillRect(W * 0.8, y(front - 0.02), 2, y(0.12));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.flipY = false;
  return t;
}

/**
 * A green jacket hung over the top of the chair's back: the shoulders over
 * its top, the short fronts with the zip falling toward the desk, the back
 * hanging down toward you a little askew, folds deepening to the hem, the
 * sleeves hanging at its sides. In the back's own space (its top edge at
 * y = h, its plane z = 0, its front toward -z).
 */
function jacket(m: Materials, w: number, h: number) {
  const g = new THREE.Group();
  const front = 0.16;
  const over = 0.05;
  const behind = 0.48;
  const len = front + over + behind;
  const width = w * 0.86;
  const cloth = new THREE.PlaneGeometry(width, len, 24, 56);
  const p = cloth.attributes.position as THREE.BufferAttribute;
  const uv = cloth.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x0 = p.getX(i);
    const u = x0 / (width / 2);
    const s = len / 2 - p.getY(i);
    uv.setXY(i, uv.getX(i), s / len);
    let y: number;
    let z: number;
    let x = x0;
    if (s < front) {
      y = h - front + s;
      z = -0.028 - (front - s) * 0.06;
    } else if (s < front + over) {
      const a = ((s - front) / over) * Math.PI;
      y = h + Math.sin(a) * 0.024;
      z = -0.028 * Math.cos(a) + 0.008;
    } else {
      const t = s - front - over;
      y = h - t;
      z = 0.032 + t * 0.07;
      // hung a little askew, the hem flaring out
      x = x0 * (1 + t * 0.28) + t * 0.05;
      // folds from the shoulders, deepening toward the hem
      z += (Math.sin(u * 6.4 + 0.8) * 0.5 + Math.sin(u * 11.3 + 2.1) * 0.25) * 0.022 * Math.min(t / behind, 1) ** 1.2;
    }
    // the shoulders round over the top of the frame
    z += (1 - u * u) * 0.006;
    p.setXYZ(i, x, y, z);
  }
  cloth.computeVertexNormals();
  const tex = jacketCloth(front + over, len);
  const coat = m.own("jacket", () =>
    owns(new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.92, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color("#8fbc96"), side: THREE.DoubleSide }), tex),
  );
  g.add(solid(cloth, coat));
  // the collar, a soft roll along the top
  g.add(solid(tube([V(-width * 0.34, h + 0.012, -0.012), V(0, h + 0.03, 0.0), V(width * 0.34, h + 0.012, -0.012)], 0.016, 16, 10), coat));
  // the sleeves, hanging from the shoulders down the sides, their cuffs
  const plain = m.own("jacketPlain", () => new THREE.MeshPhysicalMaterial({ color: "#2b5638", roughness: 0.92, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color("#8fbc96") }));
  for (const sd of [-1, 1]) {
    const x = sd * (width / 2 + 0.035);
    const end = V(x + sd * 0.012 + 0.02, h - 0.5, 0.075);
    g.add(solid(tube([V(sd * (width / 2 - 0.01), h - 0.005, 0.01), V(x + sd * 0.02, h - 0.12, 0.05), V(x + sd * 0.025, h - 0.32, 0.075), end], 0.036, 28, 14), plain));
    g.add(solid(cyl(0.034, 0.034, 0.05, end.x, end.y - 0.01, end.z, 14), m.own("cuff", () => new THREE.MeshStandardMaterial({ color: "#20402b", roughness: 0.95 }))));
  }
  return g;
}
