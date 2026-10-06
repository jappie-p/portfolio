import * as THREE from "three";
import type { Materials } from "../../materials";
import { disc, rod, solid, tube, type V3 } from "./shapes";

/**
 * A rigged windsurf sail standing against the wall, in its own space: the
 * mast's foot at the origin, the luff running up y (leaning back toward
 * -z by `lean` metres over its height), the sail spreading toward -x from
 * the mast, its camber bellying out toward +z.
 */
export const SAIL = {
  /** the tack (where the luff starts) and the head, up the mast */
  tack: 0.12,
  head: 2.78,
  /** the clew: how far back from the mast, and how high */
  clew: [1.1, 1.32] as const,
  /** the mast above the head, and how far the whole rig leans in toward the wall */
  top: 2.84,
  lean: 0.075,
  camber: 0.045,
  battens: [0.56, 0.95, 1.35, 1.75, 2.12, 2.46],
};

/** How far back from the luff the sail reaches at height h (the foot below
 *  the clew, the leech with its roach above it). */
export function chordAt(h: number) {
  const [cx, cy] = SAIL.clew;
  if (h <= cy) return Math.max(0, (cx * (h - SAIL.tack)) / (cy - SAIL.tack));
  const s = Math.min(1, (h - cy) / (SAIL.head - cy));
  return 0.11 + (cx - 0.11) * (1 - s) + 0.15 * Math.sin(Math.PI * s) * (1 - s * 0.3);
}

/** The point of the sail `c` back from the luff at height h. */
export function sailPoint(c: number, h: number, out = new THREE.Vector3()) {
  const chord = chordAt(h);
  const t = chord > 1e-4 ? c / chord : 0;
  // draft forward of the middle, deeper low in the sail
  const depth = SAIL.camber * Math.min(chord / 0.9, 1) * (1.15 - 0.4 * (h / SAIL.head));
  const belly = depth * Math.sin(Math.PI * Math.pow(Math.min(t, 1), 0.8));
  return out.set(-c, h, -SAIL.lean * (h / SAIL.top) + belly);
}

/** The sail's panels: red at the head, orange bands, a clear monofilm window
 *  in its middle, a dark luff sleeve and batten pockets, and a white "JP". */
function sailTexture() {
  const W = 512;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const [cx] = SAIL.clew;
  // u = c / 1.25, v = h / head (canvas y down: h up)
  const px = (cc: number) => (cc / 1.25) * W;
  const py = (h: number) => H - (h / SAIL.head) * H;
  const band = (h0: number, h1: number, fill: string | CanvasGradient, alpha = 1) => {
    g.globalAlpha = alpha;
    g.fillStyle = fill;
    g.fillRect(0, py(h1), W, py(h0) - py(h1));
    g.globalAlpha = 1;
  };
  const red = g.createLinearGradient(0, 0, W, 0);
  red.addColorStop(0, "#d8321f");
  red.addColorStop(1, "#b9261a");
  const orange = g.createLinearGradient(0, 0, W, 0);
  orange.addColorStop(0, "#f58a24");
  orange.addColorStop(1, "#e5641c");
  band(0, 0.75, orange);
  band(0.75, 1.12, "#f2f0ea", 0.42);
  band(1.12, 1.55, "#f3efe6", 0.38);
  band(1.55, 1.95, orange);
  band(1.95, 2.3, "#141414");
  band(2.3, SAIL.head + 0.05, red);
  // a diagonal orange slash across the window, as on a race sail
  g.fillStyle = "#e5641c";
  g.beginPath();
  g.moveTo(px(0), py(1.0));
  g.lineTo(px(cx * 1.2), py(1.42));
  g.lineTo(px(cx * 1.2), py(1.55));
  g.lineTo(px(0), py(1.13));
  g.closePath();
  g.fill();
  // seams between the panels
  g.strokeStyle = "rgba(40,20,10,0.45)";
  g.lineWidth = 2;
  for (const h of [0.75, 1.12, 1.55, 1.95, 2.3]) {
    g.beginPath();
    g.moveTo(0, py(h));
    g.lineTo(W, py(h + 0.05));
    g.stroke();
  }
  // batten pockets
  g.fillStyle = "rgba(20,20,20,0.55)";
  for (const h of SAIL.battens) g.fillRect(px(0.03), py(h) - 5, W, 10);
  // the luff sleeve
  g.fillStyle = "#1b1b1d";
  g.fillRect(0, 0, px(0.045), H);
  // "JP" in white, high in the red
  g.save();
  // the sail is seen from its +z side, where its chord runs right to left
  g.translate(px(0.34), py(2.58));
  g.scale(-1, 1.35);
  g.fillStyle = "#f6f2ea";
  g.font = `italic 900 ${Math.round(W * 0.22)}px "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("JP", 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The sail surface, on a grid between the luff and its outline. */
function surface() {
  const rows = 56;
  const cols = 22;
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= rows; i++) {
    const h = SAIL.tack + ((SAIL.head - SAIL.tack) * i) / rows;
    const chord = chordAt(h);
    for (let j = 0; j <= cols; j++) {
      const c = (chord * j) / cols;
      sailPoint(c, h, p);
      pos.push(p.x, p.y, p.z);
      uv.push(c / 1.25, h / SAIL.head);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      index.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/** The mast's centre at height h. */
const mastAt = (h: number): V3 => [0.006, h, -SAIL.lean * (h / SAIL.top) - 0.004];

/** The rig: mast, sail on it, battens, the luff sleeve, the base and its
 *  downhaul. No boom: a wishbone would not fit flat against the wall. */
export function makeSail(m: Materials) {
  const group = new THREE.Group();
  const film = m.own("sailFilm", () => {
    const map = sailTexture();
    const mat = new THREE.MeshPhysicalMaterial({ map, side: THREE.DoubleSide, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, transparent: true, opacity: 0.97 });
    mat.addEventListener("dispose", () => map.dispose());
    return mat;
  });
  const sail = new THREE.Mesh(surface(), film);
  sail.castShadow = sail.receiveShadow = true;
  group.add(sail);

  // the mast in its sleeve, a little proud of the sail's luff
  const mastPts: V3[] = [0.02, 0.6, 1.2, 1.8, 2.4, SAIL.top].map(mastAt);
  group.add(solid(tube(mastPts, 0.0165, 14), m.own("mast", () => new THREE.MeshStandardMaterial({ color: "#e8e6e1", roughness: 0.35 }))));
  group.add(solid(tube([SAIL.tack + 0.03, 0.8, 1.5, 2.2, SAIL.head - 0.02].map(mastAt), 0.03, 16), m.own("sleeve", () => new THREE.MeshStandardMaterial({ color: "#1b1b1d", roughness: 0.6 }))));
  group.add(solid(disc(0.018, 0.02, 14).rotateX(Math.PI / 2).translate(...mastAt(SAIL.top + 0.01)), m.black()));

  // battens: thin black rods across the sail, following its camber
  const a = new THREE.Vector3();
  for (const h of SAIL.battens) {
    const chord = chordAt(h);
    const pts: V3[] = [];
    for (let k = 0; k <= 8; k++) {
      sailPoint(0.05 + ((chord - 0.07) * k) / 8, h, a);
      pts.push([a.x, a.y, a.z + 0.0045]);
    }
    group.add(solid(tube(pts, 0.0045, 6, 24), m.black()));
  }

  // the mast base: extension, the joint, the pulley and the downhaul rope
  group.add(solid(rod([0.006, 0.0, -0.001], [0.006, 0.1, -0.003], 0.024, 14, 0.021), m.black()));
  group.add(solid(rod([0.006, 0.1, -0.003], [0.006, 0.13, -0.004], 0.026, 14), m.graphite()));
  const rope = m.own("rope", () => new THREE.MeshStandardMaterial({ color: "#e6d9b8", roughness: 0.85 }));
  group.add(solid(tube([[0.006, 0.075, 0.03], [-0.03, 0.1, 0.04], [-0.05, SAIL.tack + 0.01, 0.025], [-0.02, SAIL.tack + 0.03, 0.01]], 0.0035, 6), rope));
  return group;
}
