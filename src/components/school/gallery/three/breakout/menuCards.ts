import * as THREE from "three";
import menu from "@/assets/work/kiosk-menu.webp";
import { HEAD, LIGHT, OUT, VERT } from "../glsl";
import type { Shared } from "../lights";
import { MIRRORED } from "../reflector";
import { CAST_GLSL, caster, type Shades } from "../shadows";
import { EXPOSE } from "./glsl";
import type { Lamp } from "./voxels";

const FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec3 cameraPosition;
uniform sampler2D uMap;
uniform float uFade;
${OUT}
${LIGHT}
${EXPOSE}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
void main() {
  vec4 c = texture(uMap, vUv);
  float a = c.a * uFade;
  if (a < 0.004) discard;
  // the menu faces the room; its back is the kiosk's green
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 albedo = gl_FrontFacing ? srgbToLinear(c.rgb / max(c.a, 1e-3)) : vec3(0.012, 0.07, 0.058);
  vec3 L;
  float lit = exposed(vWorld, n, L);
  // a screen still: it gives off a little light of its own; and glass, so
  // the lamp glints off its face and its edge brightens seen at a slant
  vec3 V = normalize(cameraPosition - vWorld);
  float glint = pow(max(dot(n, normalize(L + V)), 0.0), 80.0) * lit;
  float rim = pow(1.0 - abs(dot(n, V)), 4.0);
  vec3 col = albedo * (uAmbient * 4.0 + uLevel * (0.45 + 0.8 * lit)) + uLevel * (0.5 * glint + 0.05 * rim);
  emit(col, a);
}
`;

const CAST_VERT = /* glsl */ `${HEAD}
in vec3 position;
uniform mat4 modelMatrix;
uniform int uWork;
uniform float uFade;
${LIGHT}
${CAST_GLSL}
void main() {
  gl_Position = fromLamp(uWork, (modelMatrix * vec4(position, 1.0)).xyz, 0.8 * uFade);
}
`;

/** The order on the receipt, as the kiosk shows it: each item's card on its
 *  menu screen (pixels in kiosk-menu.webp), corners rounded as on screen. */
const SOURCE = [
  { x: 196, y: 157 },
  { x: 461, y: 157 },
  { x: 196, y: 569 },
];
const CARD = { w: 237, h: 384, r: 20 };
/** Clear pixels round each card in the atlas, so its edge stays soft at every mip. */
const PAD = 6;
const CELL = { w: CARD.w + 2 * PAD, h: CARD.h + 2 * PAD };
/** Metres a pixel: a card is about 29 cm wide. */
const M = 0.29 / CARD.w;

/** A card floating out of the print: where (metres from the picture's
 *  centre, z out of it), its turn about x, y and z, and a phase. */
type Float = { at: [number, number, number]; turn: [number, number, number]; phase: number };

/** The açaí bowl off the frame's top right corner, the wrap lower down the
 *  right side, the toast out over the left; each turned a little toward the
 *  way in. */
const FLOATS: Float[] = [
  { at: [0.76, 0.4, 0.22], turn: [0.06, -0.32, 0.07], phase: 0.12 },
  { at: [0.88, -0.14, 0.34], turn: [-0.05, -0.38, -0.05], phase: 0.47 },
  { at: [-0.8, 0.02, 0.26], turn: [0.04, 0.22, -0.08], phase: 0.79 },
];

/** How much further out of the picture the cards come as the camera steps up. */
const SPREAD = 1.5;
/** In the narrow room the screen ends close beside the frame: the cards
 *  float in nearer and a little smaller. */
const NARROW = { in: 0.8, size: 0.85 };

function atlas() {
  const canvas = document.createElement("canvas");
  canvas.width = CELL.w * SOURCE.length;
  canvas.height = CELL.h;
  return canvas;
}

async function drawCards(canvas: HTMLCanvasElement, signal?: AbortSignal) {
  const blob = await (await fetch(menu.src, { signal })).blob();
  const shot = await createImageBitmap(blob);
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, canvas.width, canvas.height);
  SOURCE.forEach((s, i) => {
    const x = i * CELL.w + PAD;
    g.save();
    g.beginPath();
    g.roundRect(x, PAD, CARD.w, CARD.h, CARD.r);
    g.clip();
    g.drawImage(shot, s.x, s.y, CARD.w, CARD.h, x, PAD, CARD.w, CARD.h);
    g.restore();
    // the glass's edge catching the light
    g.strokeStyle = "rgba(255, 255, 255, 0.22)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(x + 0.75, PAD + 0.75, CARD.w - 1.5, CARD.h - 1.5, CARD.r - 0.75);
    g.stroke();
  });
  shot.close();
}

/** One card's plane, its uvs on its cell of the atlas. */
function cardGeometry(i: number, cells: number) {
  const geometry = new THREE.PlaneGeometry(CELL.w * M, CELL.h * M);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / cells);
  return geometry;
}

/**
 * The kiosk's menu cards floating out of its print: the three things on
 * the order the receipt prints, each a card off the kiosk's own screen,
 * lit by the print's spot and casting its shadow on the wall. They bob and
 * turn a little, come further out as the camera steps up, then go.
 */
export function makeMenuCards(shared: Shared, lamp: Lamp, shades: Shades["uniforms"], face: number, anisotropy: number) {
  const canvas = atlas();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.premultiplyAlpha = true;
  texture.anisotropy = anisotropy;
  const fade = { value: 1 };
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { ...shared, uFade: fade, uMap: { value: texture }, uSpot: lamp.uSpot, uLevel: lamp.uLevel, uNorm: lamp.uNorm },
    side: THREE.DoubleSide,
    transparent: true,
  });
  const castUniforms = { ...shared, ...shades, uFade: fade, uWork: { value: lamp.uSpot.value - 1 } };
  const cards = FLOATS.map((_, i) => {
    const geometry = cardGeometry(i, SOURCE.length);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.layers.enable(MIRRORED);
    mesh.renderOrder = 1;
    mesh.visible = false;
    const shadow = caster(geometry, CAST_VERT, castUniforms);
    // the shadow's mesh is drawn on its own: it follows the card each frame
    shadow.matrixAutoUpdate = false;
    return { mesh, shadow };
  });

  let waiting = true;
  drawCards(canvas)
    .then(() => {
      texture.needsUpdate = true;
      cards.forEach((c) => (c.mesh.visible = true));
    })
    .catch(() => {})
    .finally(() => (waiting = false));

  const e = new THREE.Euler();
  let narrow = false;
  return {
    parts: cards.flatMap((c) => [c.mesh, c.shadow]),
    texture,
    fade,
    loading: () => waiting,
    /** this frame: the clock, and how far out (0..1) the camera has drawn them */
    update(time: number, spread: number) {
      FLOATS.forEach((f, i) => {
        const { mesh, shadow } = cards[i];
        const w = time * 0.45 + f.phase * 6.2832;
        const out = 1 + SPREAD * spread * (0.7 + 0.6 * f.phase);
        mesh.position.set(f.at[0] * (narrow ? NARROW.in : 1) + Math.sin(w * 0.77) * 0.006, f.at[1] + Math.sin(w * 1.1 + 1) * 0.012, face + f.at[2] * out);
        mesh.rotation.copy(e.set(f.turn[0] + Math.sin(w * 0.63) * 0.05, f.turn[1] + Math.sin(w * 0.89 + 2) * 0.08, f.turn[2] + Math.sin(w * 0.53 + 4) * 0.03));
        mesh.scale.setScalar(narrow ? NARROW.size : 1);
        mesh.updateMatrix();
        shadow.matrix.copy(mesh.matrix);
        shadow.visible = mesh.visible;
      });
    },
    fit(tight: boolean) {
      narrow = tight;
    },
  };
}
