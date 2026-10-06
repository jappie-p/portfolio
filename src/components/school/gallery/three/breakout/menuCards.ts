import * as THREE from "three";
import dishes from "@/assets/work/kiosk-dishes.webp";
import { ITEMS, euro } from "@/components/art/kiosk/receipt";
import { HEAD, LIGHT, OUT, VERT } from "../glsl";
import type { Shared } from "../lights";
import { family } from "../textures";
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
  // frosted glass with the dish on it, seen through from behind as a blur
  // of the same light
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 albedo = srgbToLinear(c.rgb / max(c.a, 1e-3)) * (gl_FrontFacing ? 1.0 : 0.55);
  vec3 L;
  float lit = exposed(vWorld, n, L);
  // lit from within a little, like the kiosk's screen it came off; the lamp
  // glints off its face and its edge brightens seen at a slant
  vec3 V = normalize(cameraPosition - vWorld);
  float glint = pow(max(dot(n, normalize(L + V)), 0.0), 60.0) * lit;
  float rim = pow(1.0 - abs(dot(n, V)), 3.0);
  vec3 col = albedo * (uAmbient * 6.0 + uLevel * (0.62 + 0.75 * lit)) + uLevel * (0.6 * glint + 0.08 * rim);
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

/** A glass card a dish: its photo (a square in kiosk-dishes.webp, the
 *  kiosk's own menu photos, in the order of ITEMS), its name and its price,
 *  as the kiosk's menu shows them. */
const PHOTO = 320;
const CARD = { w: 240, h: 372, r: 24 };
/** Clear pixels round each card in the atlas, so its edge stays soft at every mip. */
const PAD = 6;
const CELL = { w: CARD.w + 2 * PAD, h: CARD.h + 2 * PAD };
/** Metres a pixel: a card is 34 cm wide. */
const M = 0.34 / CARD.w;
const INSET = 12;
const DARK = "#17201c";
const PRICE = "#2c6b3a";

/** A card floating out of the print: where (metres from the picture's
 *  centre, z out of it), its turn about x, y and z, and a phase. */
type Float = { at: [number, number, number]; turn: [number, number, number]; phase: number };

/** Seen from the way in: the açaí bowl high over the frame's right edge,
 *  the wrap lower and further out on that side, the toast over the left
 *  edge; each turned well toward the way in. */
const FLOATS: Float[] = [
  { at: [0.6, 0.36, 0.14], turn: [0.05, -0.7, 0.05], phase: 0.12 },
  { at: [0.78, -0.18, 0.18], turn: [-0.04, -0.72, -0.04], phase: 0.47 },
  { at: [-1.12, 0.1, 0.2], turn: [0.04, -0.62, -0.06], phase: 0.79 },
];

/** How much further out of the picture the cards come as the camera steps up. */
const SPREAD = 1.5;
/** In the narrow room the screen ends close beside the frame and the view
 *  is square on: the cards float in nearer, a little smaller, turned less. */
const NARROW = { in: 0.8, size: 0.85, turn: 0.45 };

function atlas() {
  const canvas = document.createElement("canvas");
  canvas.width = CELL.w * ITEMS.length;
  canvas.height = CELL.h;
  return canvas;
}

/** A name over at most two lines of `width`, word by word. */
function lines(g: CanvasRenderingContext2D, name: string, width: number) {
  const out: string[] = [];
  for (const word of name.split(" ")) {
    const last = out[out.length - 1];
    if (last && g.measureText(`${last} ${word}`).width <= width) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out.length > 2 ? [out[0], `${out[1]}…`] : out;
}

async function drawCards(canvas: HTMLCanvasElement, signal?: AbortSignal) {
  const body = family("--font-body-var", "system-ui, sans-serif");
  const nameFont = `600 25px ${body}`;
  const priceFont = `700 27px ${body}`;
  const [shot] = await Promise.all([
    fetch(dishes.src, { signal }).then((r) => r.blob()).then((b) => createImageBitmap(b)),
    Promise.all([document.fonts.load(nameFont), document.fonts.load(priceFont)]).catch(() => {}),
  ]);
  const g = canvas.getContext("2d")!;
  g.clearRect(0, 0, canvas.width, canvas.height);
  ITEMS.forEach((item, i) => {
    const x = i * CELL.w + PAD;
    const y = PAD;
    g.save();
    g.beginPath();
    g.roundRect(x, y, CARD.w, CARD.h, CARD.r);
    g.clip();
    // frosted glass, brighter where the light comes from
    const glass = g.createLinearGradient(x, y, x + CARD.w, y + CARD.h);
    glass.addColorStop(0, "rgba(246, 248, 246, 0.9)");
    glass.addColorStop(1, "rgba(206, 214, 210, 0.8)");
    g.fillStyle = glass;
    g.fillRect(x, y, CARD.w, CARD.h);
    const sheen = g.createLinearGradient(x, y, x + CARD.w * 0.7, y + CARD.h * 0.5);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = sheen;
    g.fillRect(x, y, CARD.w, CARD.h);
    g.restore();
    // the dish, as the menu photographs it
    const pw = CARD.w - 2 * INSET;
    const ph = 196;
    g.save();
    g.beginPath();
    g.roundRect(x + INSET, y + INSET, pw, ph, CARD.r - INSET + 4);
    g.clip();
    const crop = (PHOTO * ph) / pw;
    g.drawImage(shot, i * PHOTO, (PHOTO - crop) / 2, PHOTO, crop, x + INSET, y + INSET, pw, ph);
    g.restore();
    g.fillStyle = DARK;
    g.textBaseline = "alphabetic";
    g.font = nameFont;
    lines(g, item.name, pw).forEach((line, k) => g.fillText(line, x + INSET + 4, y + INSET + ph + 38 + k * 29));
    g.font = priceFont;
    g.fillStyle = PRICE;
    g.fillText(euro(item.cents), x + INSET + 4, y + CARD.h - 24);
    // the glass's edge catching the light
    const edge = g.createLinearGradient(x, y, x + CARD.w, y + CARD.h);
    edge.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    edge.addColorStop(1, "rgba(255, 255, 255, 0.35)");
    g.strokeStyle = edge;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(x + 1, y + 1, CARD.w - 2, CARD.h - 2, CARD.r - 1);
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
 * The kiosk's dishes floating out of its print: the three things on the
 * order the receipt prints, each on a card of frosted glass with its photo,
 * name and price, lit by the print's spot and casting its shadow on the wall. They bob and
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
    const geometry = cardGeometry(i, ITEMS.length);
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
        // seen square on in the narrow room, they turn less to the side
        const yaw = f.turn[1] * (narrow ? NARROW.turn : 1);
        mesh.rotation.copy(e.set(f.turn[0] + Math.sin(w * 0.63) * 0.05, yaw + Math.sin(w * 0.89 + 2) * 0.08, f.turn[2] + Math.sin(w * 0.53 + 4) * 0.03));
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
