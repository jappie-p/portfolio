import * as THREE from "three";
import { EXHIBITS, outerH, outerW, type Room } from "../layout";
import { HEAD, LIGHT, OUT, VERT } from "./glsl";
import type { Shared } from "./lights";
import { MIRRORED } from "./reflector";
import { family } from "./textures";

/** A plaque's size, how far below its frame it hangs and in from its left
 *  edge, metres; its print's pixels across (three to one, like the plaque). */
const SIZE = { w: 0.6, h: 0.2, d: 0.014, below: 0.1, inset: 0.1 };
const PX = 600;

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec3 cameraPosition;
uniform sampler2D uPrint;
${OUT}
${LIGHT}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  // the face carries the print; the edges are bare
  float face = step(0.5, n.z);
  float ink = texture(uPrint, vUv).r * face;
  vec3 light = uAmbient * 3.0 + glows(vWorld, n);
  vec3 sheen = vec3(0.0);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    vec3 c = spot(i, vWorld, L);
    light += c * max(dot(n, L), 0.0);
    sheen += c * pow(max(dot(n, normalize(L + V)), 0.0), 40.0);
  }
  // black anodised metal, its letters in warm white, a little self-lit so
  // they read in the dark between the spots
  vec3 plate = vec3(0.02, 0.02, 0.022);
  vec3 col = mix(plate, vec3(0.8, 0.77, 0.7), ink) * light + sheen * 0.08 * (1.0 - ink) + ink * vec3(0.016, 0.015, 0.013);
  emit(col, 1.0);
}
`;

/** Set each plaque: the number and name above, what the work is below, in
 *  the site's own faces. One row of the atlas per plaque. */
function print(canvas: HTMLCanvasElement, rows: { no: string; name: string; kind: string }[]) {
  const W = (canvas.width = PX);
  const R = PX / 3;
  canvas.height = R * rows.length;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, canvas.height);
  const display = family("--font-display-var", "system-ui, sans-serif");
  const body = family("--font-body-var", "system-ui, sans-serif");
  rows.forEach((r, i) => {
    const top = i * R;
    // a fine line round the edge, as engraved
    g.strokeStyle = "#3a3a3a";
    g.lineWidth = 3;
    g.strokeRect(12, top + 12, W - 24, R - 24);
    let x = 44;
    g.textBaseline = "alphabetic";
    g.font = `500 46px ${body}`;
    g.fillStyle = "#a0a0a0";
    g.fillText(r.no, x, top + 92);
    x += g.measureText(r.no).width + 16;
    g.fillStyle = "#5c5c5c";
    g.fillText("/", x, top + 92);
    x += g.measureText("/").width + 16;
    g.font = `600 52px ${display}`;
    g.fillStyle = "#ffffff";
    g.fillText(r.name, x, top + 92);
    g.font = `400 30px ${body}`;
    g.fillStyle = "#b8b8b8";
    g.fillText(r.kind, 44, top + 146);
  });
}

/** The words on the plaques, in hang order: one for every work with an exhibit. */
const rowsOf = (room: Room) =>
  room.works.flatMap((w, i) => {
    const e = EXHIBITS[w.id];
    return e ? [{ work: i, no: String(i + 1).padStart(2, "0"), name: e.plaque.name, kind: e.plaque.kind }] : [];
  });

/** A box whose front face shows atlas row `row` of `rows`. */
function plate(row: number, rows: number) {
  const g = new THREE.BoxGeometry(SIZE.w, SIZE.h, SIZE.d);
  const uv = g.getAttribute("uv");
  const n = g.getAttribute("normal");
  for (let i = 0; i < uv.count; i++) {
    // the front face reads its row (the texture's rows run top down, unflipped)
    const front = n.getZ(i) > 0.5;
    uv.setXY(i, front ? uv.getX(i) : 0, front ? (row + 1 - uv.getY(i)) / rows : 0);
  }
  return g.toNonIndexed();
}

/** Black museum plaques on the wall under the prints, lit by the spots and
 *  seen again in the floor. */
export function makePlaques(shared: Shared, room: Room, anisotropy: number) {
  const rows = rowsOf(room);
  const canvas = document.createElement("canvas");
  print(canvas, rows);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...shared, uPrint: { value: texture } },
  });
  const group = new THREE.Group();
  const meshes = rows.map((r, i) => {
    const m = new THREE.Mesh(plate(i, rows.length), material);
    m.layers.enable(MIRRORED);
    group.add(m);
    return m;
  });
  /** Hang them for a room: under each frame, a little in from its left edge. */
  const hang = (room: Room) =>
    rows.forEach((r, i) => {
      const w = room.works[r.work];
      meshes[i].position.set(w.x - outerW(w) / 2 + SIZE.inset + SIZE.w / 2, w.y - outerH(w) / 2 - SIZE.below - SIZE.h / 2, SIZE.d / 2);
    });
  hang(room);
  return {
    group,
    texture,
    hang,
    /** set again, the site's faces having arrived */
    redraw: () => {
      print(canvas, rows);
      texture.needsUpdate = true;
    },
  };
}

export type Plaques = ReturnType<typeof makePlaques>;
