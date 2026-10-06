import * as THREE from "three";
import { PLACES, ROOM } from "../layout";
import type { Materials } from "../materials";
import type { Piece } from "../types";
import { bottomPoint, deck, deckPoint, halfWidth, hull, LENGTH, pad } from "./outdoor/hull";
import { chordAt, makeSail, SAIL, sailPoint } from "./outdoor/sail";
import { disc, solid, taper, type V3 } from "./outdoor/shapes";

/** Where the wall is, in this piece's own space (its z runs out from it). */
const WALL = -(ROOM.w - PLACES.windsurfen.at[0]);
/** The rig's mast foot (on the floor, just off the wall, toward the room's
 *  front corner) and the board: its centre line, and how far from the wall
 *  its tail stands. */
const MAST = { x: 0.5, z: WALL + 0.1 };
const BOARD = { x: -0.15, tail: 0.39 };

/** The deck's graphics on sage: a dark green pinline along both rails,
 *  crossing stripes, "JP" big toward the nose, reading up the board. */
function deckTexture() {
  const W = 2048;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // the deck's uv runs across it the other way up from the canvas (a canvas
  // texture is flipped): draw flipped, so the lettering reads up the board
  g.translate(0, H);
  g.scale(1, -1);
  const base = g.createLinearGradient(0, 0, W, 0);
  base.addColorStop(0, "#9fbaa3");
  base.addColorStop(0.55, "#b4cbb5");
  base.addColorStop(1, "#a3bea8");
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  // the rails darker, and a pinline inside them
  g.fillStyle = "#1f4a32";
  g.fillRect(0, 0, W, H * 0.045);
  g.fillRect(0, H * 0.955, W, H * 0.045);
  g.fillStyle = "#f4f1ea";
  g.fillRect(0, H * 0.075, W, 5);
  g.fillRect(0, H * 0.925 - 5, W, 5);
  // two stripes across, leaning toward the nose
  const stripe = (x: number, w: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + w, 0);
    g.lineTo(x + w + H * 0.45, H);
    g.lineTo(x + H * 0.45, H);
    g.closePath();
    g.fill();
  };
  stripe(W * 0.47, W * 0.05, "#1f4a32");
  stripe(W * 0.53, W * 0.012, "#f4f1ea");
  stripe(W * 0.55, W * 0.02, "#e5641c");
  // "JP", big, reading from the tail toward the nose
  g.save();
  g.translate(W * 0.765, H * 0.5);
  g.fillStyle = "#1f4a32";
  g.font = `italic 900 ${Math.round(H * 0.62)}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("JP", 0, H * 0.02);
  g.restore();
  // small print toward the nose
  g.fillStyle = "rgba(31,74,50,0.85)";
  g.font = `600 ${Math.round(H * 0.07)}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = "left";
  g.fillText("FREERIDE  ·  135 L  ·  235", W * 0.87, H * 0.73);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The deck pad's grooves: a diamond pattern pressed into dark EVA. */
function padTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#34383a";
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "#202325";
  g.lineWidth = 6;
  for (let i = -S; i <= S * 2; i += S / 4) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + S, S);
    g.moveTo(i, S);
    g.lineTo(i + S, 0);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(22, 7);
  t.anisotropy = 8;
  return t;
}

/** A footstrap: a padded band arching over the deck from a to b (board
 *  space, on the pad), with its two plugs. */
function strap(m: Materials, a: [number, number], b: [number, number], rise: number) {
  const group = new THREE.Group();
  const on = (x: number, y: number, lift: number): V3 => {
    const u = y / LENGTH;
    const s = x / halfWidth(u);
    const p = deckPoint(u, s, lift);
    return [p.x, p.y, p.z];
  };
  const pts: V3[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    pts.push(on(x, y, 0.006 + rise * Math.sin(Math.PI * t)));
  }
  const cover = m.own("strap", () => new THREE.MeshStandardMaterial({ color: "#5a6064", roughness: 0.8 }));
  group.add(solid(taper(pts, 0.011, 0.011, 12, 32, 2.3), cover));
  // a green band round the middle of the cover
  group.add(solid(taper(pts.slice(3, 6), 0.0118, 0.0118, 12, 8, 2.35), m.brand()));
  for (const [x, y] of [a, b]) {
    const plug = solid(disc(0.016, 0.006, 14), m.steel());
    plug.position.set(...on(x, y, 0.004));
    group.add(plug);
  }
  return group;
}

/** The fin: a swept freeride fin under the tail, in the board's y-z plane. */
function fin(m: Materials) {
  const s = new THREE.Shape();
  s.moveTo(0.36, 0);
  s.bezierCurveTo(0.33, -0.08, 0.24, -0.2, 0.14, -0.285);
  s.bezierCurveTo(0.12, -0.3, 0.1, -0.29, 0.11, -0.27);
  s.bezierCurveTo(0.15, -0.18, 0.19, -0.09, 0.21, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 18 });
  g.translate(0, 0, -0.003);
  // shape x -> board y, shape y -> board z, extrusion -> board x
  g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
  const z = bottomPoint(0.12, 0).z + 0.004;
  g.translate(0, 0, z);
  return { mesh: solid(g, m.plasticBlack()), tip: new THREE.Vector3(0, 0.125, z - 0.295) };
}

/** The board's whole shape as points to test (bottom, tail, fin tip). */
function samples(finTip: THREE.Vector3) {
  const bottom: THREE.Vector3[] = [];
  for (let u = 0.1; u <= 1.0001; u += 0.02) for (let s = -1; s <= 1.0001; s += 0.1) bottom.push(bottomPoint(Math.min(u, 0.999), s));
  const tail: THREE.Vector3[] = [];
  for (let s = -1; s <= 1.0001; s += 0.1) tail.push(bottomPoint(0, s), deckPoint(0, s));
  return { bottom, tail: [...tail, finTip], fin: finTip };
}

/** How far the board leans back, and where it then stands: as far as it can
 *  before its bottom would touch the sail behind it, so it rests on the rig. */
function leanOn(finTip: THREE.Vector3) {
  const pts = samples(finTip);
  const tailBottom = bottomPoint(0, 0);
  const at = (p: THREE.Vector3, th: number, lift: number, z0: number) =>
    new THREE.Vector3(BOARD.x + p.x, p.y * Math.cos(th) + p.z * Math.sin(th) + lift, -p.y * Math.sin(th) + p.z * Math.cos(th) + z0);
  const sail = new THREE.Vector3();
  let best = { theta: 0.05, lift: 0, z0: 0 };
  for (let deg = 3; deg <= 14; deg += 0.1) {
    const th = (deg * Math.PI) / 180;
    const z0 = WALL + BOARD.tail - (-tailBottom.y * Math.sin(th) + tailBottom.z * Math.cos(th));
    const lift = -Math.min(...pts.tail.map((p) => p.y * Math.cos(th) + p.z * Math.sin(th)));
    const clear = pts.bottom.every((p) => {
      const q = at(p, th, lift, z0);
      const c = MAST.x - q.x;
      if (q.y < SAIL.tack || q.y > SAIL.head || c < 0 || c > chordAt(q.y)) return true;
      sailPoint(c, q.y, sail);
      return q.z >= MAST.z + sail.z + 0.016;
    });
    const fin = at(pts.fin, th, lift, z0);
    if (!clear || fin.z < WALL + 0.02 || fin.y < 0.01) break;
    best = { theta: th, lift, z0 };
  }
  return best;
}

/**
 * The windsurf gear in the front corner: the rig standing against the wall,
 * its orange and red sail on the mast, and the board leaning on it, deck out:
 * sage with a dark green "JP", a grooved deck pad, three footstraps, the mast
 * track and a black fin under the tail.
 */
export function makeBoard(m: Materials): Piece {
  const group = new THREE.Group();

  const rig = makeSail(m);
  rig.position.set(MAST.x, 0, MAST.z);
  group.add(rig);

  const board = new THREE.Group();
  const deckMat = m.own("deck", () => {
    const map = deckTexture();
    const mat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    mat.addEventListener("dispose", () => map.dispose());
    return mat;
  });
  const hullMat = m.own("hull", () => new THREE.MeshPhysicalMaterial({ color: "#f3f0e9", roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  const padMat = m.own("pad", () => {
    const map = padTexture();
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
    mat.addEventListener("dispose", () => map.dispose());
    return mat;
  });
  const h = hull();
  board.add(solid(deck(), deckMat), solid(h.bottom, hullMat), solid(h.tail, hullMat), solid(pad(), padMat));

  // the footstraps: one at the back, two forward either side
  board.add(strap(m, [-0.085, 0.2], [0.085, 0.2], 0.05));
  for (const side of [-1, 1]) board.add(strap(m, [side * 0.07, 0.6], [side * 0.235, 0.66], 0.048));
  // the mast track, a black slot down the middle
  const track = solid(new THREE.BoxGeometry(0.042, 0.24, 0.008), m.black());
  track.position.copy(deckPoint(0.52, 0, 0.0005));
  board.add(track);
  const f = fin(m);
  board.add(f.mesh);

  const lean = leanOn(f.tip);
  board.rotation.x = -lean.theta;
  board.position.set(BOARD.x, lean.lift, lean.z0);
  group.add(board);

  return {
    id: "windsurfen",
    group,
    pin: new THREE.Vector3(0.05, 2.62, WALL + 0.25),
    view: { target: new THREE.Vector3(0.1, 1.35, WALL + 0.25), offset: new THREE.Vector3(1.25, 0.3, 4.9) },
  };
}
