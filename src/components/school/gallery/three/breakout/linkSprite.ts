import { BASE_PATH } from "@/data/site";
import type { Pixels } from "./voxels";

/** Link's sprite sheet: eight frames a row, 18 by 26 pixels each; the second
 *  row walks toward you, its first frame stands still. */
const SHEET = `${BASE_PATH}/art/zelda/link.png`;
const FRAME = { x: 0, y: 26, w: 18, h: 26 };
const KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** Link facing out, read from his real sprite: every opaque pixel a cell,
 *  every colour a key of the palette. */
export async function linkPixels(signal?: AbortSignal): Promise<Pixels> {
  const blob = await (await fetch(SHEET, { signal })).blob();
  const sheet = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = FRAME.w;
  canvas.height = FRAME.h;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(sheet, FRAME.x, FRAME.y, FRAME.w, FRAME.h, 0, 0, FRAME.w, FRAME.h);
  sheet.close();
  const data = g.getImageData(0, 0, FRAME.w, FRAME.h).data;
  const palette: Record<string, string> = {};
  const keys = new Map<string, string>();
  const rows: string[] = [];
  for (let y = 0; y < FRAME.h; y++) {
    let row = "";
    for (let x = 0; x < FRAME.w; x++) {
      const i = (y * FRAME.w + x) * 4;
      if (data[i + 3] < 128) {
        row += ".";
        continue;
      }
      const color = hex(data[i], data[i + 1], data[i + 2]);
      let key = keys.get(color);
      if (!key) {
        key = KEYS[keys.size % KEYS.length];
        keys.set(color, key);
        palette[key] = color;
      }
      row += key;
    }
    rows.push(row);
  }
  return { rows, palette };
}
