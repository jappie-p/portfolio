import * as THREE from "three";
import type { Materials } from "../../materials";
import { seeded } from "../../textures";

export type PotStyle = "planter" | "stoneware" | "terracotta" | "basket" | "bowl";

/** Rattan woven over and under, for the basket: light, a texture that repeats. */
function weave(anisotropy: number) {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8a6a44";
  g.fillRect(0, 0, S, S);
  const rows = 8;
  const cols = 8;
  const rh = S / rows;
  const cw = S / cols;
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const x = k * cw + (r % 2 ? cw / 2 : 0);
      const grad = g.createLinearGradient(x, 0, x + cw, 0);
      grad.addColorStop(0, "#9c7a4e");
      grad.addColorStop(0.5, "#d4b583");
      grad.addColorStop(1, "#9c7a4e");
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x, r * rh + rh / 2, cw * 0.48, rh * 0.42, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x - S, r * rh + rh / 2, cw * 0.48, rh * 0.42, 0, 0, Math.PI * 2);
      g.fill();
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 4);
  t.anisotropy = anisotropy;
  return t;
}

/** The profile (radius, height) of each kind of pot, up its outside, over
 *  its rim and down its inside to the soil, which sits at `soil` up it. */
function profile(style: PotStyle, r: number, h: number, soil: number): THREE.Vector2[] {
  const P = (x: number, y: number) => new THREE.Vector2(Math.max(x, 0), y);
  const t = style === "bowl" ? 0.006 : 0.011;
  if (style === "terracotta") {
    const rb = r * 0.72;
    return [P(0, 0), P(rb - 0.004, 0), P(rb, 0.004), P(r * 0.92, h * 0.78), P(r, h * 0.8), P(r, h - 0.003), P(r - 0.003, h), P(r - t, h), P(r - t, h * 0.8), P(r * 0.9 - t, soil - 0.004), P(0, soil - 0.004)];
  }
  if (style === "bowl") {
    return [P(0, 0), P(r * 0.55, 0), P(r * 0.85, h * 0.25), P(r, h * 0.8), P(r - 0.002, h), P(r - t, h), P(r - t - 0.002, soil - 0.004), P(0, soil - 0.004)];
  }
  const rb = style === "basket" ? r * 0.84 : style === "stoneware" ? r * 0.97 : r * 0.88;
  return [P(0, 0), P(rb - 0.008, 0), P(rb, 0.008), P(r, h - 0.006), P(r - 0.003, h), P(r - t + 0.002, h), P(r - t, h - 0.008), P(rb - t, soil - 0.004), P(0, soil - 0.004)];
}

/** Soil, a little lumpy, a few pebbles on it. */
function soilTop(r: number, y: number, seed: number) {
  const g = new THREE.CircleGeometry(r, 20, 0, Math.PI * 2);
  g.rotateX(-Math.PI / 2);
  const rand = seeded(seed);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const d = Math.hypot(p.getX(i), p.getZ(i)) / r;
    p.setY(i, y + (1 - d * d) * 0.008 + (rand() - 0.5) * 0.006 * (1 - d));
  }
  g.computeVertexNormals();
  return g;
}

export type Pot = { group: THREE.Group; soil: THREE.Vector3 };

/**
 * A pot standing at `at` (its foot), `r` across its rim and `h` tall,
 * filled to just under the rim; the planter, stoneware and bowl glazed,
 * the terracotta raw with its rolled rim, the basket woven and rimmed.
 */
export function pot(m: Materials, style: PotStyle, at: THREE.Vector3, r: number, h: number, seed: number, anisotropy = 4): Pot {
  const soilY = h - (style === "bowl" ? 0.008 : 0.025);
  const group = new THREE.Group();
  group.position.copy(at);
  let material: THREE.Material;
  if (style === "basket")
    material = m.own("basket", () => {
      const map = weave(anisotropy);
      const b = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
      b.addEventListener("dispose", () => map.dispose());
      return b;
    });
  else
    material = style === "terracotta" ? m.terracotta() : style === "stoneware" ? m.stoneware() : style === "bowl" ? m.cream() : m.ceramic();
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile(style, r, h, soilY), 36), material);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  if (style === "basket") {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.004, 0.011, 8, 40), material);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = h;
    rim.castShadow = true;
    group.add(rim);
  }
  const soil = new THREE.Mesh(soilTop(r - (style === "bowl" ? 0.008 : 0.013), soilY, seed), m.soil());
  soil.receiveShadow = true;
  group.add(soil);
  return { group, soil: new THREE.Vector3(at.x, at.y + soilY + 0.004, at.z) };
}

/** A mid-century plant stand: four splayed oak legs and a ring the pot sits in. */
export function stand(m: Materials, at: THREE.Vector3, r: number, h: number) {
  const group = new THREE.Group();
  group.position.copy(at);
  const oak = m.oak();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const top = new THREE.Vector3(Math.cos(a) * r * 0.75, h, Math.sin(a) * r * 0.75);
    const foot = new THREE.Vector3(Math.cos(a) * r * 1.15, 0, Math.sin(a) * r * 1.15);
    const len = top.distanceTo(foot);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.008, len, 8), oak);
    leg.position.copy(top).add(foot).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
    leg.castShadow = leg.receiveShadow = true;
    group.add(leg);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.78, 0.012, 8, 36), oak);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = h - 0.01;
  ring.castShadow = true;
  group.add(ring);
  return group;
}
