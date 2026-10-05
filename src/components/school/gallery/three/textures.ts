import * as THREE from "three";
import type { ReceiptLabels } from "@/components/art/kiosk/receipt";

/** Decode a picture off the main thread (createImageBitmap) into a texture,
 *  falling back to an <img> where bitmaps cannot be flipped. */
export async function loadPicture(url: string, anisotropy: number, signal: AbortSignal): Promise<THREE.Texture> {
  const blob = await (await fetch(url, { signal })).blob();
  let tex: THREE.Texture;
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY", premultiplyAlpha: "none" });
    tex = new THREE.Texture(bitmap);
    tex.flipY = false;
    tex.addEventListener("dispose", () => bitmap.close());
  } catch {
    const img = new Image();
    const src = URL.createObjectURL(blob);
    img.src = src;
    await img.decode();
    URL.revokeObjectURL(src);
    tex = new THREE.Texture(img);
  }
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** The family next/font generated for a CSS variable, with a fallback. */
export function family(variable: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

const INK = "#141820";
const GREEN = "#3fb873";
const RED = "#d44a3a";
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

/** The words the room prints, in the reader's language: the Berlijn card's,
 *  and those on the receipt the kiosk print feeds out. */
export type CardCopy = { title: string; tech: readonly string[]; year: number; receipt: ReceiptLabels };

/** The Berlijn app as a small screen print: the Fernsehturm in ink and green
 *  on warm paper, the title and stack set below. */
export function drawCard(canvas: HTMLCanvasElement, copy: CardCopy) {
  const W = (canvas.width = 1120);
  const H = (canvas.height = 1500);
  // a CPU canvas: WebGL copies it as it is, without reading a GPU canvas back
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#efe9dd";
  g.fillRect(0, 0, W, H);

  // the tower: needle, upper shaft, sphere, tapering shaft, ground
  const cx = W * 0.5;
  const ground = 1090;
  g.fillStyle = INK;
  g.fillRect(cx - 4, 118, 8, 150);
  for (let y = 118; y < 268; y += 30) {
    g.fillStyle = RED;
    g.fillRect(cx - 4, y, 8, 15);
  }
  g.fillStyle = INK;
  g.fillRect(cx - 11, 268, 22, 190);
  g.beginPath();
  g.moveTo(cx - 17, 640);
  g.lineTo(cx + 17, 640);
  g.lineTo(cx + 34, ground);
  g.lineTo(cx - 34, ground);
  g.closePath();
  g.fill();
  const sphere = g.createRadialGradient(cx - 50, 470, 20, cx, 520, 165);
  sphere.addColorStop(0, "#6fd99b");
  sphere.addColorStop(1, GREEN);
  g.fillStyle = sphere;
  g.beginPath();
  g.arc(cx, 520, 150, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.fillRect(cx - 150, 516, 300, 9);
  g.fillRect(cx - 70, 664, 140, 22);

  // a low skyline, and the horizon
  g.globalAlpha = 0.16;
  let x = 70;
  for (const [bw, bh] of [[90, 70], [60, 120], [110, 54], [70, 96], [150, 40], [80, 130], [120, 64], [64, 104], [130, 50], [70, 86]]) {
    if (Math.abs(x + bw / 2 - cx) > 60) g.fillRect(x, ground - bh, bw, bh);
    x += bw + 6;
  }
  g.globalAlpha = 1;
  g.fillRect(70, ground, W - 140, 4);

  g.font = `500 26px ${MONO}`;
  g.fillStyle = INK;
  g.textBaseline = "alphabetic";
  g.fillText(String(copy.year), 70, 92);
  const coords = "52.52 / 13.41";
  g.fillText(coords, W - 70 - g.measureText(coords).width, 92);

  g.font = `600 70px ${family("--font-display-var", "system-ui, sans-serif")}`;
  wrap(g, copy.title, 70, 1220, W - 140, 76);
  g.font = `500 25px ${MONO}`;
  g.globalAlpha = 0.72;
  g.fillText(copy.tech.join("  ·  ").toUpperCase(), 70, 1400);
  g.globalAlpha = 1;
}

/** Left-aligned text, broken onto as many lines as it needs. */
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lead: number) {
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > max) {
      g.fillText(line, x, y);
      line = word;
      y += lead;
    } else line = next;
  }
  g.fillText(line, x, y);
}

export function cardTexture(copy: CardCopy, anisotropy: number) {
  const canvas = document.createElement("canvas");
  drawCard(canvas, copy);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}
