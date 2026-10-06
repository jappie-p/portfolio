import * as THREE from "three";
import { blurred, OFF } from "@/components/school/gallery/three/foreground";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ROOM } from "./layout";
import type { Materials } from "./materials";
import { seeded } from "./textures";
import type { Prop } from "./types";

/** A box from its two corners. */
function slab(m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** What you see through the window: a bright morning sky over soft trees. */
function view() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const g = c.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 384);
  sky.addColorStop(0, "#cfe3ee");
  sky.addColorStop(0.55, "#f3f1e4");
  sky.addColorStop(1, "#f7ead2");
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 384);
  // the trees out of focus (canvas filters are not in every browser; a
  // shadow's blur is)
  const rand = seeded(5);
  for (let i = 0; i < 46; i++) {
    const x = rand() * 512;
    const y = 200 + rand() * 200;
    const r = 30 + rand() * 70;
    const t = rand();
    blurred(g, `rgba(${Math.round(90 + t * 60)},${Math.round(130 + t * 50)},${Math.round(80 + t * 30)},0.85)`, 20, (g) => {
      g.beginPath();
      g.arc(x + OFF, y, r, 0, Math.PI * 2);
      g.fill();
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The room's shell: the slab it stands on (dark walnut at its cut edge, oak
 * boards on top), the back wall with its window and the right wall in warm
 * plaster, oak skirting along both, and the rug. The window is a real
 * opening, so the sun behind the room throws its light in onto the floor.
 */
export function makeShell(m: Materials): Prop & { textures: THREE.Texture[] } {
  const { w, d, h, wall, slab: base, window: win } = ROOM;
  const group = new THREE.Group();

  // the slab: walnut sides, oak boards on top
  group.add(slab(m.walnut(), -0.02, -base, -wall - 0.02, w + wall + 0.02, -0.01, d + 0.02));
  const boards = new THREE.PlaneGeometry(w + wall, d + wall);
  const uv = boards.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w + wall), uv.getY(i) * (d + wall));
  boards.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(boards, m.oakFloor());
  floor.position.set((w + wall) / 2, 0, (d - wall) / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // the back wall round its window, and the right wall
  const p = m.plaster();
  const z0 = -wall;
  group.add(
    slab(p, 0, 0, z0, win.x0, h, 0),
    slab(p, win.x1, 0, z0, w + wall, h, 0),
    slab(p, win.x0, 0, z0, win.x1, win.y0, 0),
    slab(p, win.x0, win.y1, z0, win.x1, h, 0),
    slab(p, w, 0, 0, w + wall, h, d),
  );

  // the window: a slim black steel frame with a mullion, glass, a deep oak
  // sill, and the morning outside
  const frame = 0.035;
  const f = m.black();
  const zf = -wall * 0.5;
  group.add(
    slab(f, win.x0, win.y0, zf - frame, win.x1, win.y0 + frame, zf + frame),
    slab(f, win.x0, win.y1 - frame, zf - frame, win.x1, win.y1, zf + frame),
    slab(f, win.x0, win.y0, zf - frame, win.x0 + frame, win.y1, zf + frame),
    slab(f, win.x1 - frame, win.y0, zf - frame, win.x1, win.y1, zf + frame),
    slab(f, (win.x0 + win.x1) / 2 - frame / 2, win.y0, zf - frame, (win.x0 + win.x1) / 2 + frame / 2, win.y1, zf + frame),
  );
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(win.x1 - win.x0, win.y1 - win.y0), m.glass());
  pane.position.set((win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, zf);
  group.add(pane);
  const sill = new THREE.Mesh(new RoundedBoxGeometry(win.x1 - win.x0 + 0.12, 0.035, wall + 0.12, 2, 0.01), m.oak());
  sill.position.set((win.x0 + win.x1) / 2, win.y0 - 0.0175, -wall / 2 + 0.06);
  sill.castShadow = sill.receiveShadow = true;
  group.add(sill);
  const outside = view();
  // close behind the wall, just larger than the opening: seen only through it
  const scene = new THREE.Mesh(new THREE.PlaneGeometry(win.x1 - win.x0 + 0.5, win.y1 - win.y0 + 0.35), new THREE.MeshBasicMaterial({ map: outside, toneMapped: false }));
  scene.position.set((win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, -wall - 0.12);
  group.add(scene);

  // oak skirting along both walls
  const skirt = m.oak();
  group.add(slab(skirt, 0, 0, 0, w, 0.08, 0.015), slab(skirt, w - 0.015, 0, 0, w, 0.08, d));

  // the rug, soft-edged, in the middle of the room
  const rug = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.018, 1.55, 2, 0.008), m.fabricSand());
  rug.position.set(2.75, 0.009, 2.05);
  rug.receiveShadow = true;
  group.add(rug);

  return { group, textures: [outside] };
}
