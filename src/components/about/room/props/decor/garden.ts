import type { Materials } from "../../materials";
import { foliage, Sheet } from "./foliage";
import { figLeaf, monsteraLeaf, pothosLeaf, rubberLeaf, snakeLeaf, type LeafArt } from "./leafArt";

/** Every plant's leaves and stems, gathered by what they are made of: one
 *  draw for each kind of leaf, one for the stems and everything shaped by
 *  its geometry alone. */
export class Garden {
  readonly monstera = new Sheet();
  readonly fig = new Sheet();
  readonly rubber = new Sheet();
  readonly pothos = new Sheet();
  readonly snake = new Sheet();
  /** stems, trunks, palm fronds, succulents: coloured by vertex only */
  readonly plain = new Sheet();
  /** bark and woody stems: matte */
  readonly wood = new Sheet();

  get triangles() {
    return [this.monstera, this.fig, this.rubber, this.pothos, this.snake, this.plain, this.wood].reduce((n, s) => n + s.triangles, 0);
  }

  /** The meshes, each leaf kind with its own painted leaf. */
  meshes(m: Materials, time: { value: number }, anisotropy: number) {
    const leaf = (sheet: Sheet, name: string, art: () => LeafArt, roughness: number, through: number) => {
      if (!sheet.triangles) return null;
      const a = art();
      return sheet.mesh(foliage(m, name, { map: a.map, alphaMap: a.alpha, alphaTest: 0.5, roughness }, time, through));
    };
    const out = [
      leaf(this.monstera, "monstera", () => monsteraLeaf(anisotropy), 0.38, 1.1),
      leaf(this.fig, "fig", () => figLeaf(anisotropy), 0.32, 0.8),
      leaf(this.rubber, "rubber", () => rubberLeaf(anisotropy), 0.26, 0.6),
      leaf(this.pothos, "pothos", () => pothosLeaf(anisotropy), 0.45, 1.2),
      leaf(this.snake, "snake", () => snakeLeaf(anisotropy), 0.4, 0.5),
      this.plain.triangles ? this.plain.mesh(foliage(m, "greens", { roughness: 0.5 }, time, 0.9)) : null,
      this.wood.triangles ? this.wood.mesh(foliage(m, "bark", { roughness: 0.85 }, time, 0)) : null,
    ];
    return out.filter((x) => x !== null);
  }
}
