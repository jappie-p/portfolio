import * as THREE from "three";
import type { Materials } from "../../materials";
import { seeded } from "../../textures";
import { blurred, OFF } from "@/components/school/gallery/three/foreground";

type Painter = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** Ridges one behind the other, each lighter and hazier with distance. */
function ridges(g: CanvasRenderingContext2D, w: number, h: number, seed: number, layers: { y: number; amp: number; color: string }[]) {
  const rand = seeded(seed);
  for (const l of layers) {
    g.fillStyle = l.color;
    g.beginPath();
    g.moveTo(0, h);
    let y = l.y * h;
    for (let x = 0; x <= w; x += w / 40) {
      y += (rand() - 0.5) * l.amp * h * 0.35;
      y = Math.min(Math.max(y, (l.y - l.amp) * h), (l.y + l.amp * 0.4) * h);
      g.lineTo(x, y);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  }
}

/** Alpine mountains at golden hour: a warm sky, snow on the far peaks,
 *  pine ridges in front, a still lake. */
export const mountains: Painter = (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
  sky.addColorStop(0, "#9fb9c9");
  sky.addColorStop(0.6, "#f0d9b5");
  sky.addColorStop(1, "#f4c48e");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // the far peaks, sharp, with snow
  const rand = seeded(9);
  g.fillStyle = "#a9a9b4";
  g.beginPath();
  g.moveTo(0, h * 0.5);
  const peaks: [number, number][] = [];
  for (let x = 0; x <= w; x += w / 7) {
    const top = h * (0.18 + rand() * 0.16);
    peaks.push([x + w / 14, top]);
    g.lineTo(x, h * (0.42 + rand() * 0.05));
    g.lineTo(x + w / 14, top);
  }
  g.lineTo(w, h * 0.5);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  g.fillStyle = "rgba(255,248,238,0.92)";
  for (const [x, y] of peaks) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w * 0.035, y + h * 0.07);
    g.lineTo(x + w * 0.012, y + h * 0.06);
    g.lineTo(x - w * 0.02, y + h * 0.08);
    g.closePath();
    g.fill();
  }
  ridges(g, w, h, 4, [
    { y: 0.52, amp: 0.08, color: "#8e9a8e" },
    { y: 0.6, amp: 0.07, color: "#5f7461" },
    { y: 0.68, amp: 0.06, color: "#3d5543" },
  ]);
  // the lake, the sky in it
  const lake = g.createLinearGradient(0, h * 0.74, 0, h);
  lake.addColorStop(0, "#c9b79a");
  lake.addColorStop(1, "#6f8a8e");
  g.fillStyle = lake;
  g.fillRect(0, h * 0.74, w, h * 0.12);
  ridges(g, w, h, 6, [{ y: 0.9, amp: 0.05, color: "#263a2c" }]);
};

/** The sea on a calm morning: a pale horizon, soft swell, a strip of beach. */
export const sea: Painter = (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, "#b7cdd8");
  sky.addColorStop(1, "#f3e6d2");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  const water = g.createLinearGradient(0, h * 0.55, 0, h * 0.82);
  water.addColorStop(0, "#9eb7bb");
  water.addColorStop(1, "#5f8790");
  g.fillStyle = water;
  g.fillRect(0, h * 0.55, w, h * 0.3);
  const rand = seeded(12);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.12 + rand() * 0.25})`;
    g.lineWidth = 1 + rand() * 1.5;
    const y = h * (0.58 + rand() * 0.24);
    const x = rand() * w;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w * (0.04 + rand() * 0.1), y);
    g.stroke();
  }
  g.fillStyle = "#e6d3b0";
  g.beginPath();
  g.moveTo(0, h * 0.86);
  g.quadraticCurveTo(w * 0.5, h * 0.8, w, h * 0.88);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.7)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, h * 0.855);
  g.quadraticCurveTo(w * 0.5, h * 0.795, w, h * 0.875);
  g.stroke();
};

/** A windsurfer against the low sun: an orange sky, the sun's path on the
 *  water, a sail in silhouette. */
export const sunset: Painter = (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, "#d9886a");
  sky.addColorStop(0.55, "#f2b16a");
  sky.addColorStop(1, "#fbe0a0");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  blurred(g, "rgba(255,240,200,0.9)", 18, (c) => {
    c.beginPath();
    c.arc(w * 0.62 + OFF, h * 0.56, h * 0.09, 0, Math.PI * 2);
    c.fill();
  });
  g.fillStyle = "#fff4d6";
  g.beginPath();
  g.arc(w * 0.62, h * 0.56, h * 0.07, 0, Math.PI * 2);
  g.fill();
  const water = g.createLinearGradient(0, h * 0.62, 0, h);
  water.addColorStop(0, "#c98a5c");
  water.addColorStop(1, "#5d4a52");
  g.fillStyle = water;
  g.fillRect(0, h * 0.62, w, h * 0.38);
  const rand = seeded(15);
  for (let i = 0; i < 46; i++) {
    const y = h * (0.64 + rand() * 0.34);
    const spread = (y / h - 0.6) * w * 0.35;
    g.strokeStyle = `rgba(255,226,170,${0.25 + rand() * 0.45})`;
    g.lineWidth = 1 + rand() * 2;
    const x = w * 0.62 + (rand() - 0.5) * spread;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + w * 0.03 * (0.5 + rand()), y);
    g.stroke();
  }
  // the board and the sail
  g.fillStyle = "#2a1f24";
  g.beginPath();
  g.moveTo(w * 0.3, h * 0.38);
  g.quadraticCurveTo(w * 0.36, h * 0.52, w * 0.33, h * 0.7);
  g.lineTo(w * 0.24, h * 0.7);
  g.quadraticCurveTo(w * 0.27, h * 0.52, w * 0.3, h * 0.38);
  g.fill();
  g.fillRect(w * 0.2, h * 0.705, w * 0.16, h * 0.012);
  g.beginPath();
  g.arc(w * 0.285, h * 0.66, h * 0.018, 0, Math.PI * 2);
  g.fill();
};

/** A painting as a texture. */
export function painting(paint: Painter, w: number, h: number, anisotropy: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  paint(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/**
 * A framed picture `w` by `h` (outside), facing +z from its back at z 0: a
 * slim frame, a white mat round the print, the print slightly sunk in it.
 * Put it where it hangs, turned the way it faces.
 */
export function framed(m: Materials, map: THREE.Texture, w: number, h: number, style: "black" | "oak" = "black", mat = 0.06) {
  const group = new THREE.Group();
  const bar = 0.018;
  const depth = 0.026;
  const wood = style === "oak" ? m.oak() : m.black();
  const piece = (bw: number, bh: number, x: number, y: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth), wood);
    b.position.set(x, y, depth / 2);
    b.castShadow = b.receiveShadow = true;
    group.add(b);
  };
  piece(w, bar, 0, h / 2 - bar / 2);
  piece(w, bar, 0, -h / 2 + bar / 2);
  piece(bar, h - 2 * bar, -w / 2 + bar / 2, 0);
  piece(bar, h - 2 * bar, w / 2 - bar / 2, 0);
  const iw = w - 2 * bar;
  const ih = h - 2 * bar;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), m.paper());
  back.position.z = depth * 0.45;
  back.receiveShadow = true;
  group.add(back);
  const art = m.own(`painting-${map.uuid}`, () => new THREE.MeshStandardMaterial({ map, roughness: 0.7 }));
  if (!art.userData.owns) {
    art.userData.owns = true;
    art.addEventListener("dispose", () => map.dispose());
  }
  const print = new THREE.Mesh(new THREE.PlaneGeometry(iw - 2 * mat, ih - 2 * mat), art);
  print.position.z = depth * 0.45 + 0.0015;
  print.receiveShadow = true;
  group.add(print);
  return group;
}
