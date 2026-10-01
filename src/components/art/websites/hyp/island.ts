import { mulberry32 } from "../lib/rng";
import type { Cell } from "./cube";

/**
 * A floating island: an irregular grass top over dirt, then a stone underside
 * that tapers to hanging points, with redstone ore and obsidian at the tips.
 * `servers` rack nodes are set into the exposed front wall, like a data hall
 * cut into the rock.
 */
export function island(seed: number, sx: number, sz: number, depth: number, servers = 0): Cell[] {
  const rnd = mulberry32(seed);
  const cells: Cell[] = [];
  const mx = (sx - 1) / 2;
  const mz = (sz - 1) / 2;
  const variant = () => Math.floor(rnd() * 8);
  for (let x = 0; x < sx; x++) {
    for (let z = 0; z < sz; z++) {
      const r = Math.hypot((x - mx) / (sx / 2), (z - mz) / (sz / 2)) + (rnd() - 0.5) * 0.28;
      if (r > 1) continue;
      const col = Math.max(1, Math.round((1 - r) ** 0.85 * depth + rnd() * 1.3));
      cells.push({ kind: "grass", x, y: 0, z, variant: variant() });
      for (let k = 1; k <= col; k++) {
        const tip = k === col && k > 2;
        const kind = k === 1 || (k === 2 && rnd() < 0.5) ? "dirt" : tip && rnd() < 0.5 ? "obsidian" : rnd() < 0.09 ? "redstone" : "stone";
        cells.push({ kind, x, y: -k, z, variant: variant() });
      }
    }
  }
  const has = (x: number, y: number, z: number) => cells.some((c) => c.x === x && c.y === y && c.z === z);
  const wall = cells.filter((c) => c.kind === "stone" && c.y <= -2 && !has(c.x, c.y, c.z + 1) && has(c.x, c.y + 1, c.z));
  for (let i = 0; i < servers && wall.length; i++) {
    const [pick] = wall.splice(Math.floor(rnd() * wall.length), 1);
    pick.kind = "server";
    pick.variant = 0;
  }
  return cells;
}
