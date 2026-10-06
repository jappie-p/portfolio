import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Materials } from "../../materials";
import { seeded } from "../../textures";
import { framed, mountains, painting } from "./frames";

/** The shelves on the back wall between the medal board and the window. */
export const SHELF = { x0: 1.99, x1: 2.73, depth: 0.22, thick: 0.032, tops: [1.45, 1.85, 2.25] } as const;

/** Spines: two thin bands near the head and foot and a pale label, white,
 *  so each book's own colour shows through. */
function spineTexture() {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 32, 128);
  g.fillStyle = "rgba(0,0,0,0.28)";
  g.fillRect(0, 10, 32, 3);
  g.fillRect(0, 115, 32, 3);
  g.fillStyle = "rgba(0,0,0,0.12)";
  g.fillRect(8, 30, 16, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PALETTE = ["#8a3b2e", "#2f4a3a", "#c8a24a", "#e9e1cf", "#3b4a63", "#b06a45", "#6d7b6a", "#2b2b2b", "#d9b8a6", "#5b4636", "#9aa38f", "#a9472f"];

/** A book: its centre, its size (thick, tall, deep) and its turn. */
type Book = { centre: THREE.Vector3; size: [number, number, number]; rot: THREE.Euler };

/** One book's box split in two: the covers and spine (faces x and +z), and
 *  the block of pages (top, foot and back), set in a hair from the covers. */
function bookGeometries() {
  const cover = new THREE.BoxGeometry(1, 1, 1);
  const pages = new THREE.BoxGeometry(0.86, 0.96, 0.96).translate(0, 0, -0.02);
  const pick = (g: THREE.BoxGeometry, groups: number[]) => {
    const index = g.index!.array;
    const keep: number[] = [];
    for (const gi of groups) {
      const grp = g.groups[gi];
      for (let i = grp.start; i < grp.start + grp.count; i++) keep.push(index[i]);
    }
    g.setIndex(keep);
    g.clearGroups();
    return g;
  };
  return { cover: pick(cover, [0, 1, 4]), pages: pick(pages, [2, 3, 5]) };
}

/** Rows of books, upright or lying, as two instanced draws. */
function library(m: Materials, books: Book[], rand: () => number) {
  const map = spineTexture();
  const coverMat = m.own("bookcover", () => new THREE.MeshStandardMaterial({ map, roughness: 0.75 }));
  coverMat.addEventListener("dispose", () => map.dispose());
  const { cover, pages } = bookGeometries();
  const covers = new THREE.InstancedMesh(cover, coverMat, books.length);
  const leaves = new THREE.InstancedMesh(pages, m.paper(), books.length);
  const mat = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const c = new THREE.Color();
  books.forEach((b, i) => {
    const [x, y, z] = b.size;
    q.setFromEuler(b.rot);
    mat.compose(b.centre, q, new THREE.Vector3(x, y, z));
    covers.setMatrixAt(i, mat);
    leaves.setMatrixAt(i, mat);
    covers.setColorAt(i, c.set(PALETTE[Math.floor(rand() * PALETTE.length)]));
  });
  for (const mesh of [covers, leaves]) {
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
  }
  return [covers, leaves];
}

/** A row of upright books from x0 along a shelf top, the last one leaning
 *  back on its neighbour; returns where the row ends. */
function row(books: Book[], rand: () => number, x0: number, top: number, count: number, lean = true) {
  let x = x0;
  for (let i = 0; i < count; i++) {
    const thick = 0.018 + rand() * 0.022;
    const tall = 0.17 + rand() * 0.07;
    const deep = 0.13 + rand() * 0.04;
    const z = 0.03 + deep / 2;
    if (lean && i === count - 1) {
      // its foot out from the row, its top against the last book
      const tilt = 0.26;
      const foot = x + tall * Math.sin(tilt) + thick / 2;
      const up = new THREE.Vector3(-Math.sin(tilt), Math.cos(tilt), 0);
      books.push({ centre: new THREE.Vector3(foot, top + (thick / 2) * Math.sin(tilt), z).addScaledVector(up, tall / 2), size: [thick, tall, deep], rot: new THREE.Euler(0, 0, tilt) });
      x = foot + thick;
    } else {
      books.push({ centre: new THREE.Vector3(x + thick / 2, top + tall / 2, z), size: [thick, tall, deep], rot: new THREE.Euler() });
      x += thick + 0.0015;
    }
  }
  return x;
}

/** A stack of books lying flat, each turned a little on the one below. */
function stack(books: Book[], rand: () => number, x: number, top: number, count: number) {
  let y = top;
  for (let i = 0; i < count; i++) {
    const thick = 0.022 + rand() * 0.02;
    const w = 0.15 + rand() * 0.05;
    const d = 0.16 + rand() * 0.03;
    books.push({ centre: new THREE.Vector3(x, y + thick / 2, 0.025 + d / 2), size: [thick, w, d], rot: new THREE.Euler(0, (rand() - 0.5) * 0.25, Math.PI / 2) });
    y += thick;
  }
  return y;
}

/** A small film camera: black body, a chrome top plate, a lens with glass. */
function camera(m: Materials, at: THREE.Vector3, yaw: number) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.072, 0.042, 3, 0.008), m.plasticBlack());
  body.position.y = 0.036;
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.122, 0.02, 0.044, 2, 0.005), m.chrome());
  plate.position.y = 0.064;
  const prism = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.022, 0.036, 2, 0.005), m.plasticBlack());
  prism.position.set(0, 0.082, 0);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.022, 0.036, 24), m.plasticBlack());
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.004, 0.036, 0.038);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0025, 6, 24), m.chrome());
  ring.position.set(0.004, 0.036, 0.056);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.016, 24), m.own("lensglass", () => new THREE.MeshStandardMaterial({ color: "#1b2733", roughness: 0.05, metalness: 0.4 })));
  glass.position.set(0.004, 0.036, 0.0565);
  for (const part of [body, plate, prism, lens, ring]) part.castShadow = part.receiveShadow = true;
  group.add(body, plate, prism, lens, ring, glass);
  group.position.copy(at);
  group.rotation.y = yaw;
  return group;
}

/** A small stoneware vase, wide in the belly, narrow at the neck. */
function vase(m: Materials, at: THREE.Vector3) {
  const pts = [
    [0, 0],
    [0.03, 0],
    [0.045, 0.03],
    [0.048, 0.07],
    [0.03, 0.12],
    [0.018, 0.14],
    [0.022, 0.155],
    [0.016, 0.155],
    [0.012, 0.13],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), m.own("vaseglaze", () => new THREE.MeshStandardMaterial({ color: "#c7b49a", roughness: 0.45 })));
  mesh.position.copy(at);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/**
 * The floating oak shelves and what is on them: books upright and in a
 * stack, a film camera, a vase, a small framed photo leaning on the wall.
 * The plants on them are planted by the caller (see `SHELF`).
 */
export function makeShelves(m: Materials, anisotropy: number) {
  const group = new THREE.Group();
  const rand = seeded(303);
  const width = SHELF.x1 - SHELF.x0;
  for (const top of SHELF.tops) {
    const board = new THREE.Mesh(new RoundedBoxGeometry(width, SHELF.thick, SHELF.depth, 2, 0.005), m.oak());
    board.position.set((SHELF.x0 + SHELF.x1) / 2, top - SHELF.thick / 2, SHELF.depth / 2);
    board.castShadow = board.receiveShadow = true;
    group.add(board);
  }
  const [low, mid, high] = SHELF.tops;
  const books: Book[] = [];
  row(books, rand, 2.2, low, 7);
  row(books, rand, 2.02, mid, 9);
  stack(books, rand, 2.12, high, 3);
  group.add(...library(m, books, rand));
  group.add(camera(m, new THREE.Vector3(2.6, mid, 0.09), -0.35));
  group.add(vase(m, new THREE.Vector3(2.63, low, 0.1)));
  // a small framed photo leaning on the wall
  const photo = framed(m, painting(mountains, 192, 256, anisotropy), 0.13, 0.17, "oak", 0.014);
  photo.position.set(2.37, high + 0.086, 0.045);
  photo.rotation.x = -0.12;
  group.add(photo);
  return group;
}
