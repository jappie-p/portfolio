import * as THREE from "three";
import type { Materials } from "../materials";
import type { Piece } from "../types";
import { cork, emblem, fonts, lettering } from "./work/canvas";
import { cyl, owns, planarUV, rbox, solid } from "./work/shapes";

/** The board: outside size, frame width, how far it stands off the wall. */
const B = { w: 1.0, h: 0.72, frame: 0.04, depth: 0.03 };

/** The three medals: what they are for, their metal, their emblem. */
const MEDALS = [
  { label: "Presenteren", metal: "bronze", emblem: "screen", x: -0.29 },
  { label: "Uitdagingen", metal: "silver", emblem: "mountain", x: 0 },
  { label: "Blijven leren", metal: "gold", emblem: "leaf", x: 0.29 },
] as const;

const METAL = { bronze: "#b0763f", silver: "#cdd2d8", gold: "#e6b95a" } as const;

/** A ribbon's cloth: the brand's green with a cream stripe down its middle. */
function ribbonCloth() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 8;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f4a32";
  g.fillRect(0, 0, 64, 8);
  g.fillStyle = "#e9dcc0";
  g.fillRect(28, 0, 8, 8);
  g.fillStyle = "#2c6343";
  g.fillRect(0, 0, 4, 8);
  g.fillRect(60, 0, 4, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A ribbon's half: a strip from (x0, y0) to (x1, y1), just off the cork,
 *  twisting a little as it falls. */
function strip(x0: number, y0: number, x1: number, y1: number, z: number, width: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const g = new THREE.PlaneGeometry(width, len, 1, 8);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = 0.5 - p.getY(i) / len;
    p.setZ(i, Math.sin(t * Math.PI) * 0.006 + p.getX(i) * t * 0.25);
  }
  g.computeVertexNormals();
  g.rotateZ(Math.atan2(x1 - x0, y0 - y1));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return g;
}

/**
 * My growth, on the wall over the desk: an oak-framed cork board lettered
 * MIJN GROEI, and the three medals I earned on the way, bronze, silver and
 * gold, each on a green ribbon with its emblem struck in it and its card
 * pinned under it. Centred on its origin, its back against the wall.
 */
export function makeMedals(m: Materials): Piece {
  const group = new THREE.Group();

  // the frame, mitred oak round a cork panel
  const frame = planarUV(rbox(B.w, B.h, B.depth, 0.008, 0, 0, B.depth / 2, 3), 1);
  group.add(solid(frame, m.oak()));
  const corkTex = cork();
  corkTex.repeat.set(1.6, 1.15);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(B.w - 2 * B.frame, B.h - 2 * B.frame),
    m.own("cork", () => owns(new THREE.MeshStandardMaterial({ map: corkTex, roughness: 0.95, bumpMap: corkTex, bumpScale: 0.6 }), corkTex)),
  );
  panel.position.z = B.depth + 0.0008;
  panel.receiveShadow = true;
  group.add(panel);

  // the heading, lettered on a strip of paper pinned to the cork
  const head = lettering("MIJN GROEI", 1024, 160, { font: `bold 92px ${fonts.SERIF}`, color: "#2a2016", spacing: 22, paper: "#f6efe0" });
  const headMat = m.own("groeiHead", () => owns(new THREE.MeshStandardMaterial({ map: head, roughness: 0.85, color: "#f5efe2" }), head));
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.072), headMat);
  banner.position.set(0, B.h / 2 - B.frame - 0.07, B.depth + 0.004);
  banner.rotation.z = -0.012;
  banner.receiveShadow = true;
  group.add(banner);

  // brass pins to hang things from
  const pinGeo = new THREE.SphereGeometry(0.008, 12, 8);
  const pin = (x: number, y: number, mat: THREE.Material) => {
    const p = solid(pinGeo, mat);
    p.position.set(x, y, B.depth + 0.008);
    group.add(p);
  };
  pin(-0.2, B.h / 2 - B.frame - 0.07, m.brass());
  pin(0.2, B.h / 2 - B.frame - 0.07, m.brass());

  const cloth = ribbonCloth();
  const ribbonMat = m.own("ribbon", () => owns(new THREE.MeshPhysicalMaterial({ map: cloth, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color("#9ec7a6"), side: THREE.DoubleSide }), cloth));
  const pushpins = [m.own("pinRed", () => new THREE.MeshStandardMaterial({ color: "#c0392b", roughness: 0.3 })), m.brand(), m.own("pinCream", () => new THREE.MeshStandardMaterial({ color: "#efe3c4", roughness: 0.3 }))];

  MEDALS.forEach((md, i) => {
    const hangY = 0.125;
    const cy = -0.055;
    const r = 0.068;
    // the ribbon: a V from two pins to the medal's loop
    for (const s of [-1, 1]) {
      const geo = strip(md.x + s * 0.045, hangY, md.x + s * 0.008, cy + r + 0.012, B.depth + 0.006 + (s > 0 ? 0.001 : 0), 0.042);
      const mesh = new THREE.Mesh(geo, ribbonMat);
      mesh.castShadow = true;
      group.add(mesh);
    }
    pin(md.x - 0.045, hangY + 0.004, m.brass());
    pin(md.x + 0.045, hangY + 0.004, m.brass());

    // the medal: a struck disc, its rim raised, the emblem in relief
    const relief = emblem(md.emblem);
    const tint = emblem(md.emblem, "#8a8a8a");
    // not quite a mirror: the room's light lands on the metal as well as in it
    const metal = m.own(`medal-${md.metal}`, () =>
      owns(new THREE.MeshStandardMaterial({ color: METAL[md.metal], map: tint, metalness: 0.78, roughness: 0.3, bumpMap: relief, bumpScale: 3.5 }), relief, tint),
    );
    const disc = cyl(r, r, 0.009, 0, 0, 0, 48);
    disc.rotateX(Math.PI / 2);
    const medal = new THREE.Group();
    medal.add(solid(disc, metal));
    const rim = new THREE.TorusGeometry(r, 0.0045, 10, 48);
    medal.add(solid(rim, metal));
    const loop = new THREE.TorusGeometry(0.011, 0.003, 8, 16);
    loop.translate(0, r + 0.009, 0);
    medal.add(solid(loop, metal));
    medal.position.set(md.x, cy, B.depth + 0.014);
    // hung, each a hair off true
    medal.rotation.set(0.05, (i - 1) * 0.12, (i - 1) * 0.04);
    group.add(medal);

    // its card, pinned under it
    const word = lettering(md.label, 512, 140, { font: `italic 600 62px ${fonts.SERIF}`, color: "#2a2016", paper: "#f7f1e3" });
    const card = new THREE.Mesh(rbox(0.19, 0.052, 0.0015, 0.001), m.own(`card-${i}`, () => owns(new THREE.MeshStandardMaterial({ map: word, roughness: 0.9 }), word)));
    card.position.set(md.x, -0.215, B.depth + 0.002);
    card.rotation.z = [0.03, -0.02, 0.025][i];
    card.castShadow = card.receiveShadow = true;
    group.add(card);
    const head = solid(new THREE.SphereGeometry(0.009, 12, 8), pushpins[i]);
    head.position.set(md.x + [0.07, -0.072, 0.068][i], -0.198, B.depth + 0.01);
    group.add(head);
  });

  return {
    id: "groei",
    group,
    pin: new THREE.Vector3(-0.3, B.h / 2 + 0.12, 0.05),
    view: { target: new THREE.Vector3(0, -0.02, 0.05), offset: new THREE.Vector3(-0.5, 0.1, 2.15) },
  };
}
